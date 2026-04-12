import { FastifyRequest, FastifyReply } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { execFileSync } from "child_process";
import * as pty from "node-pty";
import { failure, success } from "../utils/response.js";
import {
  authenticateOsUser,
  consumeTerminalSessionToken,
  createTerminalSessionToken,
} from "../services/terminal.service.js";

// ── HTTP handler: POST /term/auth ────────────────────────────────────────────

export async function terminalAuthHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  const result = await authenticateOsUser(username, password);

  if (!result.ok) {
    const status = result.code === "AUTH_ERROR" ? 500 : 401;
    return res.status(status).send(failure(result.code, result.details));
  }

  const token = createTerminalSessionToken(username);
  return res.status(200).send(success("AUTH_OK", { token }));
}

// ── WebSocket handler: GET /term/ws ──────────────────────────────────────────

export function terminalWsHandler(socket: WebSocket, req: FastifyRequest) {
  const token = (req.query as Record<string, string>).token;

  if (!token) {
    socket.close(1008, "Missing token");
    return;
  }

  const username = consumeTerminalSessionToken(token);

  if (!username) {
    socket.close(1008, "Invalid or expired token");
    return;
  }

  // Resolve the OS user's UID, GID, and home directory before spawning.
  let uid: number;
  let gid: number;
  let homeDir: string;

  try {
    uid = parseInt(execFileSync("id", ["-u", username]).toString().trim(), 10);
    gid = parseInt(execFileSync("id", ["-g", username]).toString().trim(), 10);
    homeDir = execFileSync("sh", [
      "-c",
      `eval echo ~${username}`,
    ])
      .toString()
      .trim();
  } catch (err) {
    req.log.error({ err, username }, "Failed to resolve OS user attributes");
    socket.close(1011, "Failed to resolve user");
    return;
  }

  const shell = process.env.SHELL ?? "/bin/zsh";

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: homeDir,
    env: {
      ...process.env,
      HOME: homeDir,
      USER: username,
      LOGNAME: username,
      TERM: "xterm-256color",
    },
    uid,
    gid,
  });

  req.log.info({ username, uid, shell }, "Terminal session started");

  // PTY → browser
  ptyProcess.onData((data) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(data);
    }
  });

  // PTY exited (e.g. user typed `exit`) → close the socket
  ptyProcess.onExit(({ exitCode }) => {
    req.log.info({ username, exitCode }, "Terminal session ended");
    if (socket.readyState === socket.OPEN) {
      socket.close(1000, "Terminal exited");
    }
  });

  // Browser → PTY
  socket.on("message", (raw: Buffer | string) => {
    const message = typeof raw === "string" ? raw : raw.toString("utf8");

    // Resize events arrive as JSON; everything else is raw stdin.
    try {
      const parsed = JSON.parse(message) as unknown;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        "type" in parsed &&
        (parsed as { type: unknown }).type === "resize"
      ) {
        const { cols, rows } = parsed as { cols: unknown; rows: unknown };
        if (typeof cols === "number" && typeof rows === "number") {
          ptyProcess.resize(cols, rows);
          return;
        }
      }
    } catch {
      // Not JSON — fall through to write as raw input.
    }

    ptyProcess.write(message);
  });

  // Browser disconnected → kill the PTY process
  socket.on("close", () => {
    try {
      ptyProcess.kill();
    } catch {
      // Process may have already exited.
    }
    req.log.info({ username }, "WebSocket closed, PTY cleaned up");
  });
}

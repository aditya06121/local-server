import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { buildTerminalWsUrl, requestTerminalToken } from "../lib/terminal";
import "@xterm/xterm/css/xterm.css";

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "auth" | "terminal";

// ── Auth form ──────────────────────────────────────────────────────────────

function TerminalAuthForm({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    const result = await requestTerminalToken(username.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onAuthenticated(result.token);
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Box className="rounded-lg border border-[#30363d] bg-[#161b22] p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="mt-1 h-14 w-1 rounded-full bg-green-500 shrink-0" />
            <div>
              <Typography
                variant="h5"
                className="font-semibold text-green-400 font-mono"
              >
                Terminal Access
              </Typography>
              <Typography variant="body2" className="mt-1 text-[#8b949e]">
                Authenticate with a system account to open a terminal session.
              </Typography>
            </div>
          </div>

          {error && (
            <Alert severity="error" className="text-sm">
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <TextField
              label="System username"
              type="text"
              fullWidth
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{
                input: { className: "font-mono text-sm text-green-300" },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#30363d" },
                  "&:hover fieldset": { borderColor: "#58a6ff" },
                  "&.Mui-focused fieldset": { borderColor: "#58a6ff" },
                },
                "& .MuiInputLabel-root": { color: "#8b949e" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#58a6ff" },
              }}
            />

            <TextField
              label="Password"
              type="password"
              fullWidth
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: { className: "font-mono text-sm text-green-300" },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#30363d" },
                  "&:hover fieldset": { borderColor: "#58a6ff" },
                  "&.Mui-focused fieldset": { borderColor: "#58a6ff" },
                },
                "& .MuiInputLabel-root": { color: "#8b949e" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#58a6ff" },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disableElevation
              fullWidth
              disabled={loading}
              sx={{
                backgroundColor: "#238636",
                "&:hover": { backgroundColor: "#2ea043" },
                textTransform: "none",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              {loading ? "Authenticating..." : "Open terminal"}
            </Button>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}

// ── Terminal emulator ──────────────────────────────────────────────────────

function TerminalEmulator({ token }: { token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Bootstrap xterm ──
    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#484f58",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // ── Open WebSocket ──
    const ws = new WebSocket(buildTerminalWsUrl(token));
    socketRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      // Send initial dimensions once the socket is open.
      const { cols, rows } = xterm;
      ws.send(JSON.stringify({ type: "resize", cols, rows }));
    };

    ws.onmessage = (event) => {
      const data =
        event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : (event.data as string);
      xterm.write(data);
    };

    ws.onerror = () => {
      setConnectionError("WebSocket connection failed.");
    };

    ws.onclose = (event) => {
      if (event.code !== 1000) {
        xterm.writeln("\r\n\x1b[31mConnection closed.\x1b[0m");
      }
    };

    // ── Forward keystrokes to the server ──
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // ── Forward resize events ──
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        const { cols, rows } = xterm;
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      xterm.dispose();
    };
  }, [token]);

  if (connectionError) {
    return (
      <Box className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4">
        <Alert severity="error">{connectionError}</Alert>
      </Box>
    );
  }

  return (
    <Box
      className="w-full h-screen bg-[#0d1117] flex flex-col"
      sx={{ padding: "12px" }}
    >
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }} />
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Terminal() {
  const [phase, setPhase] = useState<Phase>("auth");
  const [token, setToken] = useState("");

  function handleAuthenticated(sessionToken: string) {
    setToken(sessionToken);
    setPhase("terminal");
  }

  if (phase === "terminal" && token) {
    return <TerminalEmulator token={token} />;
  }

  return <TerminalAuthForm onAuthenticated={handleAuthenticated} />;
}

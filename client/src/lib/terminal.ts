import axios, { AxiosError } from "axios";

type TerminalAuthSuccess = {
  success: true;
  data: { token: string };
};

type TerminalAuthFailure = {
  success: false;
  error?: { code?: string; details?: string };
};

const TERMINAL_AUTH_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid username or password.",
  AUTH_ERROR: "Authentication service unavailable. Try again.",
};

export type TerminalAuthResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export async function requestTerminalToken(
  username: string,
  password: string,
): Promise<TerminalAuthResult> {
  try {
    const res = await axios.post<TerminalAuthSuccess>("/api/term/auth", {
      username,
      password,
    });
    return { ok: true, token: res.data.data.token };
  } catch (err) {
    const axiosErr = err as AxiosError<TerminalAuthFailure>;
    const data = axiosErr.response?.data;
    const status = axiosErr.response?.status;

    if (!data) {
      return axiosErr.request
        ? { ok: false, message: "Could not reach the server. Check your connection." }
        : { ok: false, message: "Unexpected error. Please try again." };
    }

    if (status === 429) {
      return { ok: false, message: "Too many attempts. Please wait a moment." };
    }

    const code = data.error?.code ?? "";
    const message =
      TERMINAL_AUTH_ERRORS[code] ??
      data.error?.details ??
      "Authentication failed.";

    return { ok: false, message };
  }
}

/**
 * Build the WebSocket URL for the terminal session.
 * Relies on Vite's `/api` proxy in development; in production the reverse
 * proxy should forward the same path.
 */
export function buildTerminalWsUrl(token: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/term/ws?token=${encodeURIComponent(token)}`;
}

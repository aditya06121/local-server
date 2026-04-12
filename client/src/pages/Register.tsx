import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import AuthFormShell from "../components/AuthFormShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { toAuthUser } from "../lib/auth";

type AuthSuccessResponse = {
  data: {
    user: {
      id?: string;
      userId?: string;
      email: string;
    };
  };
};

type AuthFailureResponse = {
  error?: { details?: string; code?: string } | string;
  message?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: "An account with that email already exists.",
  DB_CALL_FAILED: "Server error. Please try again in a moment.",
};

function parseServerError(err: unknown, fallback: string): string {
  const axiosError = err as AxiosError<AuthFailureResponse>;
  const data = axiosError.response?.data;
  const status = axiosError.response?.status;

  if (!data) {
    return axiosError.request
      ? "Could not reach the server. Check your connection."
      : fallback;
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // App error format: { error: { code, details } }
  if (data.error && typeof data.error === "object") {
    const code = data.error.code ?? "";
    return ERROR_MESSAGES[code] ?? data.error.details ?? fallback;
  }

  // Fastify validation format: { error: "Bad Request", message: "body/password ..." }
  if (data.message) {
    const msg = data.message.toLowerCase();
    if (msg.includes("password")) return "Password must be at least 6 characters.";
    if (msg.includes("email")) return "Please enter a valid email address.";
    if (msg.includes("name")) return "Name is required.";
    return "Please check your input and try again.";
  }

  return fallback;
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading, refreshUser, setAuthenticatedUser } =
    useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<AuthSuccessResponse>("/auth/register", {
        name: name.trim(),
        email,
        password,
      });

      const currentUser = await refreshUser();

      if (!currentUser) {
        setAuthenticatedUser(toAuthUser(res.data.data.user, name));
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(parseServerError(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Create account"
      subtitle="Sign up to get started."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <TextField
            label="Name"
            type="text"
            fullWidth
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            label="Email"
            type="email"
            fullWidth
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            autoComplete="new-password"
            helperText="At least 6 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          variant="contained"
          disableElevation
          fullWidth
          disabled={loading}
          className="rounded-xl normal-case"
        >
          {loading ? "Creating account..." : "Register"}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Authentication stays in context while cookies remain backend-managed.
      </Typography>
    </AuthFormShell>
  );
}

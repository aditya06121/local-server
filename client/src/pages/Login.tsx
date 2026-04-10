import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { useLocation, useNavigate } from "react-router-dom";
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
  error?: {
    details?: string;
    code?: string;
  };
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, refreshUser, setAuthenticatedUser } =
    useAuth();
  const redirectTarget =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    "/";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTarget]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post<AuthSuccessResponse>("/auth/login", {
        email,
        password,
      });

      const currentUser = await refreshUser();

      if (!currentUser) {
        setAuthenticatedUser(toAuthUser(res.data.data.user));
      }

      navigate(redirectTarget, { replace: true });
    } catch (err) {
      const error = err as AxiosError<AuthFailureResponse>;

      setError(
        error.response?.data?.error?.details ||
          error.response?.data?.error?.code ||
          "Login failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Login"
      subtitle="Enter your credentials to continue."
      footerText="Need an account?"
      footerLinkLabel="Create one"
      footerLinkTo="/register"
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
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
            autoComplete="current-password"
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
          {loading ? "Signing in..." : "Login"}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Session state is restored automatically when valid auth cookies exist.
      </Typography>
    </AuthFormShell>
  );
}

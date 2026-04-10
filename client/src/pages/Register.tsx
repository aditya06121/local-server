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
  error?: {
    details?: string;
    code?: string;
  };
};

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
    setLoading(true);

    try {
      const res = await api.post<AuthSuccessResponse>("/auth/register", {
        name,
        email,
        password,
      });

      const currentUser = await refreshUser();

      if (!currentUser) {
        setAuthenticatedUser(toAuthUser(res.data.data.user, name));
      }

      navigate("/", { replace: true });
    } catch (err) {
      const error = err as AxiosError<AuthFailureResponse>;

      setError(
        error.response?.data?.error?.details ||
          error.response?.data?.error?.code ||
          "Registration failed",
      );
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
            helperText="Use at least 6 characters."
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

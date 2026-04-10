import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { api } from "../lib/api";

type PublicProfileResponse = {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      bio: string | null;
    };
  };
};

type PublicProfileError = {
  error?: {
    details?: string;
    code?: string;
  };
};

export default function PublicProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState<PublicProfileResponse["data"]["user"] | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!userId) {
        setError("Missing profile id.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await api.get<PublicProfileResponse>(`/users/${userId}`);

        if (!isActive) {
          return;
        }

        setUser(response.data.data.user);
      } catch (err) {
        if (!isActive) {
          return;
        }

        const error = err as AxiosError<PublicProfileError>;

        setError(
          error.response?.data?.error?.details ||
            error.response?.data?.error?.code ||
            "Could not load this profile.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          size="small"
          sx={{ borderRadius: 999 }}
        >
          Back to dashboard
        </Button>
      </Box>

      <Paper elevation={0} className="rounded-2xl p-6 sm:p-7">
        {isLoading ? (
          <Stack
            spacing={1.25}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 220 }}
          >
            <CircularProgress size={30} />
            <Typography variant="body2" color="text.secondary">
              Loading profile
            </Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : user ? (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Public profile
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                {user.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
                {user.email}
              </Typography>
            </Box>

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 4,
                p: 2.5,
                bgcolor: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Bio
              </Typography>
              <Typography variant="body1" sx={{ mt: 1.2, lineHeight: 1.8 }}>
                {user.bio?.trim()
                  ? user.bio
                  : "This user has not added a bio yet."}
              </Typography>
            </Box>
          </Stack>
        ) : null}
      </Paper>
    </Stack>
  );
}

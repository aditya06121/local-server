import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../lib/api";
import { toAuthUser, type AuthUser } from "../lib/auth";

type ProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  onUserUpdated: (user: AuthUser) => void;
  user: AuthUser;
};

type ProfileSuccessResponse = {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      bio: string | null;
      location: string | null;
    };
  };
};

type ProfileFailureResponse = {
  error?: {
    details?: string;
    code?: string;
  };
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileDrawer({
  open,
  onClose,
  onUserUpdated,
  user,
}: ProfileDrawerProps) {
  const [phone, setPhone] = useState(user.phone ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPhone(user.phone ?? "");
    setLocation(user.location ?? "");
    setBio(user.bio ?? "");
    setError("");
    setSuccessMessage("");
  }, [open, user.bio, user.location, user.phone]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const response = await api.patch<ProfileSuccessResponse>("/users/me", {
        phone: phone.trim(),
        bio: bio.trim(),
        location: location.trim(),
      });

      onUserUpdated(toAuthUser(response.data.data.user));
      setSuccessMessage("Profile updated.");
    } catch (err) {
      const error = err as AxiosError<ProfileFailureResponse>;

      setError(
        error.response?.data?.error?.details ||
          error.response?.data?.error?.code ||
          "Could not update your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: "100vw", sm: 420 },
          height: "100%",
          bgcolor: "background.paper",
        }}
      >
        <Stack component="form" onSubmit={handleSubmit} sx={{ height: "100%" }}>
          <Box sx={{ px: 3, py: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: "rgba(31, 77, 70, 0.12)",
                  color: "primary.main",
                  fontWeight: 800,
                }}
              >
                {getInitials(user.displayName)}
              </Avatar>
              <Box>
                <Typography variant="h6">Profile</Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Box
            sx={{
              flex: 1,
              px: 3,
              py: 3,
              overflowY: "auto",
            }}
          >
            <Stack spacing={2.25}>
              {error && <Alert severity="error">{error}</Alert>}
              {successMessage && (
                <Alert severity="success">{successMessage}</Alert>
              )}

              <Box>
                <Typography variant="overline" color="text.secondary">
                  Account name
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {user.name}
                </Typography>
              </Box>

              <TextField label="Email" value={user.email} disabled fullWidth />

              <TextField
                label="Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Add a number"
                fullWidth
              />

              <TextField
                label="Location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, campus, or neighbourhood"
                fullWidth
              />

              <TextField
                label="Bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Write something short about yourself"
                multiline
                minRows={5}
                fullWidth
              />
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ px: 3, py: 2.5 }}>
            <Stack direction="row" spacing={1.5}>
              <Button
                type="button"
                variant="outlined"
                onClick={onClose}
                fullWidth
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save details"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  );
}

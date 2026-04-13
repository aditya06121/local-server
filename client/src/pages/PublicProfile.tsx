import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useThemeMode } from "../context/ThemeContext";
import { api } from "../lib/api";

type ProfileUser = { id: string; name: string; email: string; bio: string | null };
type Notice = { id: string; content: string; createdAt: string; author: { id: string; name: string; email: string } };
type ProfileError = { error?: { details?: string; code?: string } };
type NoticesResponse = { data: { notices: Notice[]; nextCursor: string | null } };

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function PublicProfile() {
  const { userId } = useParams();
  const { mode, toggleMode } = useThemeMode();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [profileError, setProfileError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noticesError, setNoticesError] = useState("");

  useEffect(() => {
    if (!userId) {
      setProfileError("Missing profile id.");
      setIsLoadingProfile(false);
      return;
    }

    let isActive = true;
    setIsLoadingProfile(true);
    setIsLoadingNotices(true);
    setProfileError("");
    setNoticesError("");

    api.get<{ data: { user: ProfileUser } }>(`/users/${userId}`)
      .then((res) => { if (isActive) setUser(res.data.data.user); })
      .catch((err: AxiosError<ProfileError>) => {
        if (!isActive) return;
        setProfileError(err.response?.data?.error?.details || err.response?.data?.error?.code || "Could not load this profile.");
      })
      .finally(() => { if (isActive) setIsLoadingProfile(false); });

    api.get<NoticesResponse>("/notices", { params: { authorId: userId } })
      .then((res) => {
        if (!isActive) return;
        setNotices(res.data.data.notices);
        setNextCursor(res.data.data.nextCursor);
      })
      .catch(() => { if (isActive) setNoticesError("Could not load this user's notices."); })
      .finally(() => { if (isActive) setIsLoadingNotices(false); });

    return () => { isActive = false; };
  }, [userId]);

  async function handleLoadMore() {
    if (!nextCursor || !userId) return;
    setIsLoadingMore(true);
    try {
      const res = await api.get<NoticesResponse>("/notices", { params: { authorId: userId, cursor: nextCursor } });
      setNotices((prev) => [...prev, ...res.data.data.notices]);
      setNextCursor(res.data.data.nextCursor);
    } catch {
      setNoticesError("Could not load more notices.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        color="transparent"
        sx={{
          backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.95),
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(10px)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 1, gap: 1.5, alignItems: "center", minHeight: 0 }}>
            <Box component={RouterLink} to="/" sx={{ flexGrow: 1, minWidth: 0, textDecoration: "none", color: "text.primary" }}>
              <Typography variant="h6" sx={{ lineHeight: 1.1, fontSize: { xs: "1.05rem", sm: "1.15rem" }, fontWeight: 700 }}>
                Local Server
              </Typography>
            </Box>
            <IconButton onClick={toggleMode} size="small" sx={{ width: 36, height: 36, border: "1px solid", borderColor: "divider", color: "text.secondary" }} aria-label="Toggle dark mode">
              {mode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Button component={RouterLink} to="/" variant="outlined" size="small" sx={{ borderRadius: 2 }}>
              Back to home
            </Button>
          </Box>

          {/* Profile card */}
          <Paper elevation={0} className="rounded-lg p-6 sm:p-7">
            {isLoadingProfile ? (
              <Stack spacing={1.25} alignItems="center" justifyContent="center" sx={{ minHeight: 180 }}>
                <CircularProgress size={30} />
                <Typography variant="body2" color="text.secondary">Loading profile</Typography>
              </Stack>
            ) : profileError ? (
              <Alert severity="error">{profileError}</Alert>
            ) : user ? (
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Public profile</Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontSize: { xs: "1.5rem", sm: "2rem" } }}>{user.name}</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>{user.email}</Typography>
                </Box>

                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.default" }}>
                  <Typography variant="overline" color="text.secondary">Bio</Typography>
                  <Typography variant="body1" sx={{ mt: 1.2, lineHeight: 1.8 }}>
                    {user.bio?.trim() ? user.bio : "This user has not added a bio yet."}
                  </Typography>
                </Box>
              </Stack>
            ) : null}
          </Paper>

          {/* User's notices */}
          <Paper elevation={0} className="rounded-lg p-5 sm:p-6">
            <Typography variant="h6" sx={{ mb: 0.75 }}>
              {user ? `${user.name}'s notices` : "Notices"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Public messages posted by this user.
            </Typography>

            {noticesError && <Alert severity="error" sx={{ mb: 2 }}>{noticesError}</Alert>}

            {isLoadingNotices ? (
              <Stack spacing={1.25} alignItems="center" justifyContent="center" sx={{ minHeight: 100 }}>
                <CircularProgress size={26} />
                <Typography variant="body2" color="text.secondary">Loading notices</Typography>
              </Stack>
            ) : notices.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No notices posted yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {notices.map((n) => (
                  <Box key={n.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5, py: 1.25, bgcolor: "background.paper" }}>
                    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                      <Typography variant="subtitle2" fontWeight={700}>{n.author.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatRelativeTime(n.createdAt)}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.content}</Typography>
                  </Box>
                ))}

                {nextCursor && (
                  <Button variant="outlined" size="small" onClick={handleLoadMore} disabled={isLoadingMore} sx={{ alignSelf: "center", mt: 0.5 }}>
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </Button>
                )}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

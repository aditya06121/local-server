import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { api } from "../lib/api";
import Noticeboard from "../components/Noticeboard";
import ProfileDrawer from "../components/ProfileDrawer";

type Friend = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  location: string | null;
};

type PendingRequest = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  direction: "received" | "sent";
  otherUser: { id: string; name: string; email: string };
};

type SearchUser = { id: string; name: string; email: string };

type ApiFailureResponse = { error?: { details?: string; code?: string } };
type FriendsResponse = { data: { friends: Friend[] } };
type RequestsResponse = { data: { requests: PendingRequest[] } };
type SearchResponse = { data: { users: SearchUser[] } };
type ActionResponse = { message?: string };

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiFailureResponse>;
  return (
    axiosError.response?.data?.error?.details ||
    axiosError.response?.data?.error?.code ||
    fallback
  );
}

function FlatPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7), p: 2.5 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{subtitle}</Typography>}
      </Box>
      {children}
    </Box>
  );
}

export default function Landing() {
  const { user, setAuthenticatedUser } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Friends state (only used when logged in)
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchFeedback, setSearchFeedback] = useState("Search by email to send a friend request.");
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [sectionNotice, setSectionNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  function handleLogout() {
    setIsLoggingOut(true);
    navigate("/logout", { replace: true });
  }

  async function fetchWorkspaceData() {
    const [friendsRes, requestsRes] = await Promise.all([
      api.get<FriendsResponse>("/friends"),
      api.get<RequestsResponse>("/friends/requests"),
    ]);
    return { friends: friendsRes.data.data.friends, requests: requestsRes.data.data.requests };
  }

  async function fetchSearchData(query: string) {
    const q = query.trim();
    if (!q) return { users: [] as SearchUser[], feedback: "Search by email to send a friend request." };
    if (q.length < 4) return { users: [] as SearchUser[], feedback: "Type at least 4 characters." };
    const res = await api.get<SearchResponse>("/friends/search", { params: { q } });
    const users = res.data.data.users;
    return { users, feedback: users.length ? `${users.length} match${users.length > 1 ? "es" : ""}.` : "No users found for this email prefix." };
  }

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    async function load() {
      setIsLoadingWorkspace(true);
      try {
        const data = await fetchWorkspaceData();
        if (!isActive) return;
        setFriends(data.friends);
        setRequests(data.requests);
      } catch (error) {
        if (!isActive) return;
        setSectionError(getErrorMessage(error, "Could not load friends."));
      } finally {
        if (isActive) setIsLoadingWorkspace(false);
      }
    }

    load();
    return () => { isActive = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    async function loadSearch() {
      setIsSearching(true);
      try {
        const data = await fetchSearchData(deferredSearchQuery);
        if (!isActive) return;
        setSearchResults(data.users);
        setSearchFeedback(data.feedback);
      } catch (error) {
        if (!isActive) return;
        setSearchResults([]);
        setSearchFeedback(getErrorMessage(error, "Search failed."));
      } finally {
        if (isActive) setIsSearching(false);
      }
    }

    loadSearch();
    return () => { isActive = false; };
  }, [deferredSearchQuery, user?.id]);

  async function refresh() {
    const [workspace, searchData] = await Promise.all([
      fetchWorkspaceData(),
      fetchSearchData(searchQuery),
    ]);
    setFriends(workspace.friends);
    setRequests(workspace.requests);
    setSearchResults(searchData.users);
    setSearchFeedback(searchData.feedback);
  }

  async function handleSendRequest(email: string) {
    setBusyAction(`send:${email}`);
    setSectionError(""); setSectionNotice("");
    try {
      const res = await api.post<ActionResponse>("/friends/request", { email });
      await refresh();
      setSectionNotice(res.data.message === "REQUEST_AUTO_ACCEPTED" ? "You are now friends." : "Friend request sent.");
    } catch (error) { setSectionError(getErrorMessage(error, "Could not send the friend request.")); }
    finally { setBusyAction(""); }
  }

  async function handleAcceptRequest(requestId: string) {
    setBusyAction(`accept:${requestId}`);
    setSectionError(""); setSectionNotice("");
    try {
      await api.post("/friends/accept", { requestId });
      await refresh();
      setSectionNotice("Friend request accepted.");
    } catch (error) { setSectionError(getErrorMessage(error, "Could not accept the request.")); }
    finally { setBusyAction(""); }
  }

  async function handleRejectRequest(requestId: string) {
    setBusyAction(`reject:${requestId}`);
    setSectionError(""); setSectionNotice("");
    try {
      await api.post("/friends/reject", { requestId });
      await refresh();
      setSectionNotice("Friend request rejected.");
    } catch (error) { setSectionError(getErrorMessage(error, "Could not reject the request.")); }
    finally { setBusyAction(""); }
  }

  async function handleCancelRequest(requestId: string) {
    setBusyAction(`cancel:${requestId}`);
    setSectionError(""); setSectionNotice("");
    try {
      await api.delete(`/friends/request/${requestId}`);
      await refresh();
      setSectionNotice("Friend request cancelled.");
    } catch (error) { setSectionError(getErrorMessage(error, "Could not cancel the request.")); }
    finally { setBusyAction(""); }
  }

  async function handleRemoveFriend(friendId: string) {
    setBusyAction(`remove:${friendId}`);
    setSectionError(""); setSectionNotice("");
    try {
      await api.delete(`/friends/${friendId}`);
      await refresh();
      setSectionNotice("Friend removed.");
    } catch (error) { setSectionError(getErrorMessage(error, "Could not remove this friend.")); }
    finally { setBusyAction(""); }
  }

  function getSearchResultStatus(result: SearchUser) {
    if (friends.some((f) => f.id === result.id)) return "friend";
    const req = requests.find((r) => r.otherUser.id === result.id);
    if (req?.direction === "sent") return "sent";
    if (req?.direction === "received") return "received";
    return "none";
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
            <Box
              component={RouterLink}
              to="/"
              sx={{ flexGrow: 1, minWidth: 0, textDecoration: "none", color: "text.primary" }}
            >
              {user ? (
                <Typography variant="h6" sx={{ lineHeight: 1.1, fontSize: { xs: "1.05rem", sm: "1.15rem" }, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Hello, {user.name}
                </Typography>
              ) : (
                <Typography variant="h6" sx={{ lineHeight: 1.1, fontSize: { xs: "1.05rem", sm: "1.15rem" }, fontWeight: 700 }}>
                  Local Server
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <IconButton onClick={toggleMode} size="small" sx={{ width: 36, height: 36, border: "1px solid", borderColor: "divider", color: "text.secondary" }} aria-label="Toggle dark mode">
                {mode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
              </IconButton>

              {user ? (
                <>
                  <Button variant="outlined" component={RouterLink} to="/profile" sx={{ px: 1.75, py: 0.8, minHeight: 0, minWidth: 0, borderRadius: 2 }}>
                    Profile
                  </Button>
                  <Button variant="outlined" onClick={() => setIsProfileOpen(true)} sx={{ px: 1.75, py: 0.8, minHeight: 0, minWidth: 0, borderRadius: 2 }}>
                    Settings
                  </Button>
                  <Button variant="contained" onClick={handleLogout} disabled={isLoggingOut} sx={{ px: 1.75, py: 0.8, minHeight: 0, minWidth: 0, borderRadius: 2 }}>
                    {isLoggingOut ? "Signing out..." : "Logout"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outlined" component={RouterLink} to="/login" sx={{ px: 1.75, py: 0.8, minHeight: 0, minWidth: 0, borderRadius: 2 }}>Login</Button>
                  <Button variant="contained" component={RouterLink} to="/register" sx={{ px: 1.75, py: 0.8, minHeight: 0, minWidth: 0, borderRadius: 2 }}>Register</Button>
                </>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 1.5 }}>
              <Typography
                component={RouterLink}
                to="/notices"
                variant="h6"
                sx={{ textDecoration: "none", color: "text.primary", "&:hover": { textDecoration: "underline" } }}
              >
                Notice Board
              </Typography>
              <Typography variant="body2" component={RouterLink} to="/notices" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                View all →
              </Typography>
            </Box>
            <Noticeboard currentUserId={user?.id ?? null} />
          </Box>

          {user && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: { xs: 2.5, sm: 3 }, bgcolor: "background.paper" }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
                  <Typography
                    component={RouterLink}
                    to="/friends"
                    variant="h6"
                    sx={{ textDecoration: "none", color: "text.primary", "&:hover": { textDecoration: "underline" } }}
                  >
                    Friends
                  </Typography>
                  <Typography variant="body2" component={RouterLink} to="/friends" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                    View all →
                  </Typography>
                </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: "-12px !important" }}>
                    Search by email, manage requests, and keep track of your network.
                  </Typography>

                {sectionError && <Alert severity="error" onClose={() => setSectionError("")}>{sectionError}</Alert>}
                {sectionNotice && <Alert severity="success" onClose={() => setSectionNotice("")}>{sectionNotice}</Alert>}

                {isLoadingWorkspace ? (
                  <Stack spacing={1.25} alignItems="center" justifyContent="center" sx={{ minHeight: 180 }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary">Loading friends</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {/* Search */}
                      <FlatPanel title="Find people" subtitle="Search is email-prefix based.">
                        <Stack spacing={1.5}>
                          <TextField label="Search by email" placeholder="Start typing an email" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth size="small" />
                          <Typography variant="body2" color="text.secondary">
                            {isSearching ? "Searching..." : searchFeedback}
                          </Typography>
                          <Stack spacing={1}>
                            {searchResults.map((result) => {
                              const status = getSearchResultStatus(result);
                              return (
                                <Box key={result.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5, py: 1.25, bgcolor: "background.paper" }}>
                                  <Stack spacing={1}>
                                    <Box>
                                      <Typography component={RouterLink} to={`/profiles/${result.id}`} variant="subtitle2" fontWeight={700} sx={{ color: "text.primary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{result.name}</Typography>
                                      <Typography component={RouterLink} to={`/profiles/${result.id}`} variant="body2" color="text.secondary" sx={{ display: "inline-block", mt: 0.25, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{result.email}</Typography>
                                    </Box>
                                    <Box>
                                      {status === "friend" && (
                                        <Typography variant="caption" sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), color: "primary.main", fontWeight: 700, display: "inline-block" }}>
                                          Already friends
                                        </Typography>
                                      )}
                                      {status === "sent" && (
                                        <Typography variant="caption" sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08), color: "secondary.main", fontWeight: 700, display: "inline-block" }}>
                                          Request sent
                                        </Typography>
                                      )}
                                      {status === "received" && (
                                        <Button variant="contained" size="small" onClick={() => { const req = requests.find(r => r.otherUser.id === result.id); if (req) handleAcceptRequest(req.id); }} disabled={!!busyAction}>
                                          Accept request
                                        </Button>
                                      )}
                                      {status === "none" && (
                                        <Button variant="contained" size="small" onClick={() => handleSendRequest(result.email)} disabled={busyAction === `send:${result.email}`}>
                                          {busyAction === `send:${result.email}` ? "Sending..." : "Add friend"}
                                        </Button>
                                      )}
                                    </Box>
                                  </Stack>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Stack>
                      </FlatPanel>

                      {/* Pending requests */}
                      <FlatPanel title={`Pending requests (${requests.length})`} subtitle="Sent and received requests waiting to be accepted.">
                        {requests.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No pending requests right now.</Typography>
                        ) : (
                          <Stack spacing={1}>
                            {requests.map((req) => (
                              <Box key={req.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5, py: 1.25, bgcolor: "background.paper" }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: req.direction === "received" ? (t) => alpha(t.palette.primary.main, 0.08) : (t) => alpha(t.palette.secondary.main, 0.08), color: req.direction === "received" ? "primary.main" : "secondary.main", fontWeight: 700, lineHeight: 1.6 }}>
                                    {req.direction === "received" ? "Received" : "Sent"}
                                  </Typography>
                                </Stack>
                                <Typography component={RouterLink} to={`/profiles/${req.otherUser.id}`} variant="subtitle2" fontWeight={700} sx={{ color: "text.primary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{req.otherUser.name}</Typography>
                                <Typography component={RouterLink} to={`/profiles/${req.otherUser.id}`} variant="body2" color="text.secondary" sx={{ display: "inline-block", mt: 0.4, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{req.otherUser.email}</Typography>
                                {req.direction === "received" ? (
                                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                    <Button variant="contained" size="small" onClick={() => handleAcceptRequest(req.id)} disabled={busyAction === `accept:${req.id}`}>{busyAction === `accept:${req.id}` ? "Accepting..." : "Accept"}</Button>
                                    <Button variant="outlined" size="small" onClick={() => handleRejectRequest(req.id)} disabled={busyAction === `reject:${req.id}`}>{busyAction === `reject:${req.id}` ? "Rejecting..." : "Reject"}</Button>
                                  </Stack>
                                ) : (
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Awaiting their response.</Typography>
                                    <Button variant="outlined" color="secondary" size="small" onClick={() => handleCancelRequest(req.id)} disabled={busyAction === `cancel:${req.id}`}>{busyAction === `cancel:${req.id}` ? "Cancelling..." : "Cancel"}</Button>
                                  </Stack>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </FlatPanel>
                    </div>

                    {/* Friends list */}
                    <FlatPanel title={`Your friends (${friends.length})`} subtitle="People already connected to you.">
                      {friends.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No friends yet. Start from the search panel above.</Typography>
                      ) : (
                        <Stack spacing={1}>
                          {friends.map((friend) => (
                            <Box key={friend.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5, py: 1.35, bgcolor: "background.paper" }}>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography component={RouterLink} to={`/profiles/${friend.id}`} variant="subtitle2" fontWeight={700} sx={{ color: "text.primary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{friend.name}</Typography>
                                  <Typography component={RouterLink} to={`/profiles/${friend.id}`} variant="body2" color="text.secondary" sx={{ display: "block", mt: 0.35, wordBreak: "break-word", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{friend.email}</Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>{friend.bio?.trim() ? friend.bio : "No bio added yet."}</Typography>
                                </Box>
                                <Button variant="outlined" color="secondary" size="small" onClick={() => handleRemoveFriend(friend.id)} disabled={busyAction === `remove:${friend.id}`} sx={{ flexShrink: 0 }}>
                                  {busyAction === `remove:${friend.id}` ? "Removing..." : "Remove"}
                                </Button>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </FlatPanel>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </Container>

      {user && (
        <ProfileDrawer open={isProfileOpen} onClose={() => setIsProfileOpen(false)} onUserUpdated={setAuthenticatedUser} user={user} />
      )}
    </Box>
  );
}

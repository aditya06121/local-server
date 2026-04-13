import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

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
  otherUser: {
    id: string;
    name: string;
    email: string;
  };
};

type SearchUser = {
  id: string;
  name: string;
  email: string;
};

type ApiFailureResponse = {
  error?: {
    details?: string;
    code?: string;
  };
};

type FriendsResponse = {
  data: {
    friends: Friend[];
  };
};

type RequestsResponse = {
  data: {
    requests: PendingRequest[];
  };
};

type SearchResponse = {
  data: {
    users: SearchUser[];
  };
};

type ActionResponse = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiFailureResponse>;
  return (
    axiosError.response?.data?.error?.details ||
    axiosError.response?.data?.error?.code ||
    fallback
  );
}

function FlatPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
        p: 2.5,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchFeedback, setSearchFeedback] = useState(
    "Search by email to send a friend request.",
  );
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [sectionNotice, setSectionNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  async function fetchWorkspaceData() {
    const [friendsResponse, requestsResponse] = await Promise.all([
      api.get<FriendsResponse>("/friends"),
      api.get<RequestsResponse>("/friends/requests"),
    ]);

    return {
      friends: friendsResponse.data.data.friends,
      requests: requestsResponse.data.data.requests,
    };
  }

  async function fetchSearchData(query: string) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return {
        users: [] as SearchUser[],
        feedback: "Search by email to send a friend request.",
      };
    }

    if (trimmedQuery.length < 4) {
      return {
        users: [] as SearchUser[],
        feedback: "Type at least 4 characters. Search is email-based right now.",
      };
    }

    const response = await api.get<SearchResponse>("/friends/search", {
      params: { q: trimmedQuery },
    });
    const users = response.data.data.users;

    return {
      users,
      feedback: users.length
        ? `${users.length} available match${users.length > 1 ? "es" : ""}.`
        : "No available users for this email prefix.",
    };
  }

  useEffect(() => {
    let isActive = true;

    async function loadWorkspace() {
      setIsLoadingWorkspace(true);
      try {
        const data = await fetchWorkspaceData();
        if (!isActive) return;
        setFriends(data.friends);
        setRequests(data.requests);
        setSectionError("");
      } catch (error) {
        if (!isActive) return;
        setSectionError(
          getErrorMessage(error, "Could not load your profile workspace."),
        );
      } finally {
        if (isActive) setIsLoadingWorkspace(false);
      }
    }

    loadWorkspace();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isActive = true;

    async function loadSearchResults() {
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

    loadSearchResults();
    return () => {
      isActive = false;
    };
  }, [deferredSearchQuery]);

  if (!user) return null;

  async function refreshWorkspaceSections() {
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
    setSectionError("");
    setSectionNotice("");
    try {
      const response = await api.post<ActionResponse>("/friends/request", {
        email,
      });
      await refreshWorkspaceSections();
      setSectionNotice(
        response.data.message === "REQUEST_AUTO_ACCEPTED"
          ? "That request already existed in reverse. You are now friends."
          : "Friend request sent.",
      );
    } catch (error) {
      setSectionError(
        getErrorMessage(error, "Could not send the friend request."),
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleAcceptRequest(requestId: string) {
    setBusyAction(`accept:${requestId}`);
    setSectionError("");
    setSectionNotice("");
    try {
      await api.post("/friends/accept", { requestId });
      await refreshWorkspaceSections();
      setSectionNotice("Friend request accepted.");
    } catch (error) {
      setSectionError(getErrorMessage(error, "Could not accept the request."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleRejectRequest(requestId: string) {
    setBusyAction(`reject:${requestId}`);
    setSectionError("");
    setSectionNotice("");
    try {
      await api.post("/friends/reject", { requestId });
      await refreshWorkspaceSections();
      setSectionNotice("Friend request rejected.");
    } catch (error) {
      setSectionError(getErrorMessage(error, "Could not reject the request."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleRemoveFriend(friendId: string) {
    setBusyAction(`remove:${friendId}`);
    setSectionError("");
    setSectionNotice("");
    try {
      await api.delete(`/friends/${friendId}`);
      await refreshWorkspaceSections();
      setSectionNotice("Friend removed.");
    } catch (error) {
      setSectionError(getErrorMessage(error, "Could not remove this friend."));
    } finally {
      setBusyAction("");
    }
  }

  return (
    <Stack spacing={3}>
      {/* Bio */}
      <Paper elevation={0} className="rounded-lg p-6 sm:p-7">
        <Box>
          <Typography variant="overline" color="text.secondary">
            Bio
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mt: 1.25,
              lineHeight: 1.4,
              fontSize: { xs: "1.1rem", sm: "1.4rem" },
              maxWidth: 880,
            }}
          >
            {user.bio?.trim()
              ? user.bio
              : "No bio yet. Open Settings from the navbar and add one."}
          </Typography>
        </Box>
      </Paper>

      {/* Notice Board link */}
      <Paper
        elevation={0}
        component={RouterLink}
        to="/notices"
        sx={{
          p: { xs: 2.5, sm: 3 },
          textDecoration: "none",
          display: "block",
          transition: "border-color 0.15s",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        <Typography
          variant="overline"
          color="primary"
          sx={{ fontWeight: 700 }}
        >
          Community
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5 }}>
          Notice Board
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          See and post short messages visible to everyone.
        </Typography>
      </Paper>

      {/* Friends */}
      <Paper elevation={0} className="rounded-lg p-5 sm:p-6">
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6">Friends</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Search by email, manage requests, and keep track of your network.
            </Typography>
          </Box>

          {sectionError && <Alert severity="error">{sectionError}</Alert>}
          {sectionNotice && <Alert severity="success">{sectionNotice}</Alert>}

          {isLoadingWorkspace ? (
            <Stack
              spacing={1.25}
              alignItems="center"
              justifyContent="center"
              sx={{ minHeight: 220 }}
            >
              <CircularProgress size={30} />
              <Typography variant="body2" color="text.secondary">
                Loading friends
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <div className="grid gap-3 lg:grid-cols-2">
                <FlatPanel
                  title="Find people"
                  subtitle="Search is email-prefix based."
                >
                  <Stack spacing={1.5}>
                    <TextField
                      label="Search by email"
                      placeholder="Start typing an email"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      fullWidth
                      size="small"
                    />

                    <Typography variant="body2" color="text.secondary">
                      {isSearching ? "Searching..." : searchFeedback}
                    </Typography>

                    <Stack spacing={1}>
                      {searchResults.map((result) => (
                        <Box
                          key={result.id}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            px: 1.5,
                            py: 1.25,
                            bgcolor: "background.paper",
                          }}
                        >
                          <Stack spacing={1}>
                            <Box>
                              <Typography
                                component={RouterLink}
                                to={`/profiles/${result.id}`}
                                variant="subtitle2"
                                fontWeight={700}
                                sx={{
                                  color: "text.primary",
                                  textDecoration: "none",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {result.name}
                              </Typography>
                              <Typography
                                component={RouterLink}
                                to={`/profiles/${result.id}`}
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  display: "inline-block",
                                  mt: 0.25,
                                  textDecoration: "none",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {result.email}
                              </Typography>
                            </Box>
                            <Box>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleSendRequest(result.email)}
                                disabled={
                                  busyAction === `send:${result.email}`
                                }
                              >
                                {busyAction === `send:${result.email}`
                                  ? "Sending..."
                                  : "Add friend"}
                              </Button>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </FlatPanel>

                <FlatPanel
                  title={`Pending requests (${requests.length})`}
                  subtitle="Sent and received requests waiting to be accepted."
                >
                  {requests.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No pending requests right now.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {requests.map((request) => (
                        <Box
                          key={request.id}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            px: 1.5,
                            py: 1.25,
                            bgcolor: "background.paper",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor:
                                  request.direction === "received"
                                    ? (theme) =>
                                        alpha(theme.palette.primary.main, 0.08)
                                    : (theme) =>
                                        alpha(
                                          theme.palette.secondary.main,
                                          0.08,
                                        ),
                                color:
                                  request.direction === "received"
                                    ? "primary.main"
                                    : "secondary.main",
                                fontWeight: 700,
                                lineHeight: 1.6,
                              }}
                            >
                              {request.direction === "received"
                                ? "Received"
                                : "Sent"}
                            </Typography>
                          </Stack>
                          <Typography
                            component={RouterLink}
                            to={`/profiles/${request.otherUser.id}`}
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{
                              color: "text.primary",
                              textDecoration: "none",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {request.otherUser.name}
                          </Typography>
                          <Typography
                            component={RouterLink}
                            to={`/profiles/${request.otherUser.id}`}
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "inline-block",
                              mt: 0.4,
                              textDecoration: "none",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {request.otherUser.email}
                          </Typography>

                          {request.direction === "received" ? (
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ mt: 1.5 }}
                            >
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() =>
                                  handleAcceptRequest(request.id)
                                }
                                disabled={
                                  busyAction === `accept:${request.id}`
                                }
                              >
                                {busyAction === `accept:${request.id}`
                                  ? "Accepting..."
                                  : "Accept"}
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() =>
                                  handleRejectRequest(request.id)
                                }
                                disabled={
                                  busyAction === `reject:${request.id}`
                                }
                              >
                                {busyAction === `reject:${request.id}`
                                  ? "Rejecting..."
                                  : "Reject"}
                              </Button>
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mt: 1 }}
                            >
                              Awaiting their response.
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </FlatPanel>
              </div>

              <FlatPanel
                title={`Your friends (${friends.length})`}
                subtitle="Compact view of the people already connected to you."
              >
                {friends.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No friends yet. Start from the search panel above.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {friends.map((friend) => (
                      <Box
                        key={friend.id}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          px: 1.5,
                          py: 1.35,
                          bgcolor: "background.paper",
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.25}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              component={RouterLink}
                              to={`/profiles/${friend.id}`}
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{
                                color: "text.primary",
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {friend.name}
                            </Typography>
                            <Typography
                              component={RouterLink}
                              to={`/profiles/${friend.id}`}
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                mt: 0.35,
                                wordBreak: "break-word",
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {friend.email}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.75, lineHeight: 1.6 }}
                            >
                              {friend.bio?.trim()
                                ? friend.bio
                                : "No bio added yet."}
                            </Typography>
                          </Box>

                          <Button
                            variant="outlined"
                            color="secondary"
                            size="small"
                            onClick={() => handleRemoveFriend(friend.id)}
                            disabled={busyAction === `remove:${friend.id}`}
                            sx={{ flexShrink: 0 }}
                          >
                            {busyAction === `remove:${friend.id}`
                              ? "Removing..."
                              : "Remove"}
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
      </Paper>
    </Stack>
  );
}

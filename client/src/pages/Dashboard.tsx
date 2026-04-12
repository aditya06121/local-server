import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
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

type Notice = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
};

type NoticesResponse = {
  data: {
    notices: Notice[];
    nextCursor: string | null;
  };
};

type PostNoticeResponse = {
  data: {
    notice: Notice;
  };
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
        bgcolor: "rgba(255, 255, 255, 0.7)",
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

function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Paper elevation={0} className="rounded-lg p-6">
      <Typography variant="overline" color="text.secondary">
        Later
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
        {description}
      </Typography>
    </Paper>
  );
}

const MAX_CONTENT_LENGTH = 500;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Noticeboard({ currentUserId }: { currentUserId: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const deletingRef = useRef<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get<NoticesResponse>("/notices");
        if (!isActive) return;
        setNotices(res.data.data.notices);
        setNextCursor(res.data.data.nextCursor);
      } catch {
        if (!isActive) return;
        setError("Could not load the noticeboard.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load();
    return () => { isActive = false; };
  }, []);

  async function handlePost() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsPosting(true);
    setError("");
    setNotice("");

    try {
      const res = await api.post<PostNoticeResponse>("/notices", { content: trimmed });
      setNotices((prev) => [res.data.data.notice, ...prev]);
      setContent("");
      setNotice("Notice posted.");
    } catch {
      setError("Could not post your notice.");
    } finally {
      setIsPosting(false);
    }
  }

  async function handleDelete(noticeId: string) {
    deletingRef.current.add(noticeId);
    setDeletingIds(new Set(deletingRef.current));
    setError("");

    try {
      await api.delete(`/notices/${noticeId}`);
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
    } catch {
      setError("Could not delete that notice.");
    } finally {
      deletingRef.current.delete(noticeId);
      setDeletingIds(new Set(deletingRef.current));
    }
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);

    try {
      const res = await api.get<NoticesResponse>("/notices", {
        params: { cursor: nextCursor },
      });
      setNotices((prev) => [...prev, ...res.data.data.notices]);
      setNextCursor(res.data.data.nextCursor);
    } catch {
      setError("Could not load more notices.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const remaining = MAX_CONTENT_LENGTH - content.length;

  return (
    <Paper elevation={0} className="rounded-lg p-5 sm:p-6">
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6">Noticeboard</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Post a short message for everyone to see.
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            bgcolor: "rgba(255,255,255,0.7)",
          }}
        >
          <Stack spacing={1.5}>
            <TextField
              multiline
              minRows={2}
              maxRows={5}
              placeholder="Write a notice..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              inputProps={{ maxLength: MAX_CONTENT_LENGTH }}
              fullWidth
              size="small"
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                variant="caption"
                color={remaining < 50 ? "error" : "text.secondary"}
              >
                {remaining} characters remaining
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handlePost}
                disabled={isPosting || !content.trim()}
              >
                {isPosting ? "Posting..." : "Post"}
              </Button>
            </Stack>
          </Stack>
        </Box>

        {isLoading ? (
          <Stack spacing={1.25} alignItems="center" justifyContent="center" sx={{ minHeight: 120 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">Loading notices</Typography>
          </Stack>
        ) : notices.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No notices yet. Be the first to post one.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {notices.map((n) => (
              <Box
                key={n.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 1.5,
                  py: 1.25,
                  bgcolor: "background.paper",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                      <Typography
                        component={RouterLink}
                        to={`/profiles/${n.author.id}`}
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{
                          color: "text.primary",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {n.author.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(n.createdAt)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {n.content}
                    </Typography>
                  </Box>
                  {n.author.id === currentUserId && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingIds.has(n.id)}
                      sx={{ flexShrink: 0, minWidth: 0, px: 1 }}
                    >
                      {deletingIds.has(n.id) ? "…" : "Delete"}
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}

            {nextCursor && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                sx={{ alignSelf: "center", mt: 0.5 }}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export default function Dashboard() {
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

        if (!isActive) {
          return;
        }

        setFriends(data.friends);
        setRequests(data.requests);
        setSectionError("");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSectionError(
          getErrorMessage(error, "Could not load your dashboard workspace."),
        );
      } finally {
        if (isActive) {
          setIsLoadingWorkspace(false);
        }
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

        if (!isActive) {
          return;
        }

        setSearchResults(data.users);
        setSearchFeedback(data.feedback);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSearchResults([]);
        setSearchFeedback(getErrorMessage(error, "Search failed."));
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }

    loadSearchResults();

    return () => {
      isActive = false;
    };
  }, [deferredSearchQuery]);

  if (!user) {
    return null;
  }

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
      const response = await api.post<ActionResponse>("/friends/request", { email });

      await refreshWorkspaceSections();
      setSectionNotice(
        response.data.message === "REQUEST_AUTO_ACCEPTED"
          ? "That request already existed in reverse. You are now friends."
          : "Friend request sent.",
      );
    } catch (error) {
      setSectionError(getErrorMessage(error, "Could not send the friend request."));
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
              : "No bio yet. Open Profile from the navbar and add one."}
          </Typography>
        </Box>
      </Paper>

      <Noticeboard currentUserId={user.id} />

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
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
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
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
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
                                disabled={busyAction === `send:${result.email}`}
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
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: request.direction === "received"
                                  ? "rgba(31, 77, 70, 0.08)"
                                  : "rgba(180, 107, 77, 0.08)",
                                color: request.direction === "received"
                                  ? "primary.main"
                                  : "secondary.main",
                                fontWeight: 700,
                                lineHeight: 1.6,
                              }}
                            >
                              {request.direction === "received" ? "Received" : "Sent"}
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
                              "&:hover": {
                                textDecoration: "underline",
                              },
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
                              "&:hover": {
                                textDecoration: "underline",
                              },
                            }}
                          >
                            {request.otherUser.email}
                          </Typography>

                          {request.direction === "received" ? (
                            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleAcceptRequest(request.id)}
                                disabled={busyAction === `accept:${request.id}`}
                              >
                                {busyAction === `accept:${request.id}`
                                  ? "Accepting..."
                                  : "Accept"}
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={busyAction === `reject:${request.id}`}
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

      <PlaceholderCard
        title="DMs"
        description="Direct messages will be implemented later."
      />
    </Stack>
  );
}

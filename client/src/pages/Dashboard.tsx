import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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
  fromUser: {
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
        borderRadius: 4,
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

function ProfileFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        px: 2,
        py: 1.5,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
        {value}
      </Typography>
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
    <Paper elevation={0} className="rounded-2xl p-6">
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
      <Paper elevation={0} className="rounded-2xl p-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <Box>
            <Typography variant="overline" color="text.secondary">
              Bio
            </Typography>
            <Typography variant="h5" sx={{ mt: 1.5, lineHeight: 1.35 }}>
              {user.bio?.trim()
                ? user.bio
                : "No bio yet. Open Profile in the navbar and add one so this section feels like yours."}
            </Typography>
          </Box>

          <Stack spacing={1.25}>
            <ProfileFact label="Email" value={user.email} />
            <ProfileFact
              label="Phone"
              value={user.phone?.trim() ? user.phone : "Not added yet"}
            />
            <ProfileFact
              label="Location"
              value={user.location?.trim() ? user.location : "Not added yet"}
            />
          </Stack>
        </div>
      </Paper>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
        <Paper elevation={0} className="rounded-2xl p-8">
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5">Friends</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Search by email, manage incoming requests, and keep track of the
                people already connected to your account.
              </Typography>
            </Box>

            {sectionError && <Alert severity="error">{sectionError}</Alert>}
            {sectionNotice && <Alert severity="success">{sectionNotice}</Alert>}

            {isLoadingWorkspace ? (
              <Stack
                spacing={1.5}
                alignItems="center"
                justifyContent="center"
                sx={{ minHeight: 280 }}
              >
                <CircularProgress size={34} />
                <Typography variant="body2" color="text.secondary">
                  Loading your friends workspace
                </Typography>
              </Stack>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <Stack spacing={2}>
                  <FlatPanel
                    title="Find people"
                    subtitle="The backend search is email-prefix based and ignores users already in your network."
                  >
                    <Stack spacing={2}>
                      <TextField
                        label="Search by email"
                        placeholder="Start typing an email prefix"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        fullWidth
                      />

                      <Typography variant="body2" color="text.secondary">
                        {isSearching ? "Searching..." : searchFeedback}
                      </Typography>

                      <Stack spacing={1.25}>
                        {searchResults.map((result) => (
                          <Box
                            key={result.id}
                            sx={{
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 3,
                              px: 2,
                              py: 1.75,
                              bgcolor: "background.paper",
                            }}
                          >
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1.5}
                              justifyContent="space-between"
                              alignItems={{ xs: "flex-start", sm: "center" }}
                            >
                              <Box>
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {result.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {result.email}
                                </Typography>
                              </Box>
                              <Button
                                variant="contained"
                                onClick={() => handleSendRequest(result.email)}
                                disabled={busyAction === `send:${result.email}`}
                              >
                                {busyAction === `send:${result.email}`
                                  ? "Sending..."
                                  : "Add friend"}
                              </Button>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>
                  </FlatPanel>

                  <FlatPanel
                    title={`Pending requests (${requests.length})`}
                    subtitle="These are inbound requests waiting on your decision."
                  >
                    {requests.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No pending requests right now.
                      </Typography>
                    ) : (
                      <Stack spacing={1.25}>
                        {requests.map((request) => (
                          <Box
                            key={request.id}
                            sx={{
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 3,
                              px: 2,
                              py: 1.75,
                              bgcolor: "background.paper",
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight={700}>
                              {request.fromUser.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {request.fromUser.email}
                            </Typography>

                            <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
                              <Button
                                variant="contained"
                                onClick={() => handleAcceptRequest(request.id)}
                                disabled={busyAction === `accept:${request.id}`}
                              >
                                {busyAction === `accept:${request.id}`
                                  ? "Accepting..."
                                  : "Accept"}
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={busyAction === `reject:${request.id}`}
                              >
                                {busyAction === `reject:${request.id}`
                                  ? "Rejecting..."
                                  : "Reject"}
                              </Button>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </FlatPanel>
                </Stack>

                <FlatPanel
                  title={`Your friends (${friends.length})`}
                  subtitle="Everything the backend exposes about each friend is surfaced here."
                >
                  {friends.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No friends yet. Search by email on the left to start
                      building the list.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {friends.map((friend) => (
                        <Box
                          key={friend.id}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 3,
                            p: 2.25,
                            bgcolor: "background.paper",
                          }}
                        >
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "flex-start" }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                                {friend.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.65 }}
                              >
                                {friend.email}
                              </Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              color="secondary"
                              onClick={() => handleRemoveFriend(friend.id)}
                              disabled={busyAction === `remove:${friend.id}`}
                            >
                              {busyAction === `remove:${friend.id}`
                                ? "Removing..."
                                : "Remove"}
                            </Button>
                          </Stack>

                          <Divider sx={{ my: 2 }} />

                          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                            {friend.bio?.trim()
                              ? friend.bio
                              : "No bio added by this friend yet."}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ mt: 2 }}
                          >
                            <ProfileFact
                              label="Phone"
                              value={friend.phone?.trim() ? friend.phone : "Hidden"}
                            />
                            <ProfileFact
                              label="Location"
                              value={
                                friend.location?.trim() ? friend.location : "Not shared"
                              }
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </FlatPanel>
              </div>
            )}
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <PlaceholderCard
            title="DMs"
            description="Direct messages will be implemented later. The dashboard already leaves space for them."
          />
          <PlaceholderCard
            title="Noticeboard"
            description="Noticeboard will be implemented later. This card keeps the roadmap visible without inventing unsupported UI."
          />
        </Stack>
      </div>
    </Stack>
  );
}

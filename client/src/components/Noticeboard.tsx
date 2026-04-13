import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

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

export default function Noticeboard({
  currentUserId,
}: {
  currentUserId: string | null;
}) {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const deletingRef = useRef<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get<NoticesResponse>("/notices", {
          skipAuthRedirect: true,
        } as any);
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
    return () => {
      isActive = false;
    };
  }, []);

  function handleComposeClick() {
    if (!currentUserId) {
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }
    setIsComposing(true);
    setTimeout(() => textFieldRef.current?.focus(), 150);
  }

  function closeCompose() {
    setIsComposing(false);
    setContent("");
  }

  async function handlePost() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsPosting(true);
    setError("");
    setNotice("");

    try {
      const res = await api.post<PostNoticeResponse>("/notices", {
        content: trimmed,
      });
      setNotices((prev) => [res.data.data.notice, ...prev]);
      setContent("");
      setIsComposing(false);
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
        skipAuthRedirect: true,
      } as any);
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
      <Stack spacing={2}>
        {/* Header row */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography variant="h6">Noticeboard</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Short messages visible to everyone.
            </Typography>
          </Box>
          <IconButton
            onClick={isComposing ? closeCompose : handleComposeClick}
            size="small"
            sx={{
              width: 32,
              height: 32,
              border: "1px solid",
              borderColor: isComposing ? "secondary.main" : "divider",
              bgcolor: isComposing
                ? (theme) => alpha(theme.palette.secondary.main, 0.06)
                : "background.paper",
              color: isComposing ? "secondary.main" : "text.secondary",
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              transition: "transform 0.2s, border-color 0.2s, background-color 0.2s",
              transform: isComposing ? "rotate(45deg)" : "rotate(0deg)",
              flexShrink: 0,
              mt: 0.25,
            }}
            aria-label={isComposing ? "Cancel" : "Write a notice"}
          >
            +
          </IconButton>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="success" onClose={() => setNotice("")}>
            {notice}
          </Alert>
        )}

        {/* Collapsible compose form */}
        <Collapse in={isComposing} unmountOnExit>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
            }}
          >
            <Stack spacing={1.5}>
              <TextField
                inputRef={textFieldRef}
                multiline
                minRows={3}
                maxRows={6}
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                inputProps={{ maxLength: MAX_CONTENT_LENGTH }}
                fullWidth
                size="small"
              />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="caption"
                  color={remaining < 50 ? "error" : "text.secondary"}
                >
                  {remaining} left
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={closeCompose}
                    disabled={isPosting}
                  >
                    Cancel
                  </Button>
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
            </Stack>
          </Box>
        </Collapse>

        {isLoading ? (
          <Stack
            spacing={1.25}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 120 }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Loading notices
            </Typography>
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
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="baseline"
                      flexWrap="wrap"
                    >
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
                      sx={{
                        mt: 0.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {n.content}
                    </Typography>
                  </Box>
                  {currentUserId && n.author.id === currentUserId && (
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

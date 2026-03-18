import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

function InsightCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Paper elevation={0} className="h-full rounded-2xl border border-gray-100 p-6">
      <Stack spacing={1.25}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Stack spacing={2} className="gap-4">
      <Paper elevation={0} className="rounded-2xl border border-gray-100 p-8">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" className="font-semibold">
              Hello, {user?.displayName ?? "there"}.
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5, maxWidth: 720 }}
            >
              Your session is active. The root route is protected, auth is
              stored in React context, and failed authenticated requests are
              refreshed automatically.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Button variant="contained" className="rounded-xl normal-case">
              Session active
            </Button>
            <Button variant="outlined" className="rounded-xl normal-case">
              {user?.email ?? "No email"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard
          title="Identity"
          description={`Signed in as ${user?.displayName ?? "unknown"} with ${user?.email ?? "no email"} attached to the current session.`}
        />
        <InsightCard
          title="Refresh"
          description="When an authenticated request returns 401, the client calls the refresh endpoint and retries once."
        />
        <InsightCard
          title="Routing"
          description="The root route is protected. Without valid cookies, navigation is redirected to login."
        />
      </div>

      <Paper elevation={0} className="rounded-2xl border border-gray-100 p-8">
        <Box className="max-w-2xl">
          <Typography variant="h6">Session Snapshot</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The frontend is aligned with the backend contract. Login and
            register use the returned user payload for identity, while the
            backend keeps access and refresh tokens in cookies.
          </Typography>
          <Divider sx={{ my: 3 }} />
          <Stack spacing={2.5}>
            {[
              [
                "Route behavior",
                "Unauthenticated visitors are redirected to /login from /.",
              ],
              [
                "Auth context",
                "User state is restored from /auth/me when the app boots.",
              ],
              [
                "Logout",
                "Signing out clears the context immediately and requests cookie cleanup on the backend.",
              ],
            ].map(([title, description]) => (
              <Box key={title}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}

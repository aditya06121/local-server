import { Box, Paper, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
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
  );
}

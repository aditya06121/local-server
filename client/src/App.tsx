import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Outlet, useNavigate } from "react-router-dom";
import ProfileDrawer from "./components/ProfileDrawer";
import { useAuth } from "./context/AuthContext";

function getInitials(name?: string) {
  if (!name) {
    return "MP";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function App() {
  const navigate = useNavigate();
  const { user, setAuthenticatedUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  function handleLogout() {
    setIsLoggingOut(true);
    navigate("/logout", { replace: true });
  }

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        color="transparent"
        sx={{
          backgroundColor: alpha("#ffffff", 0.95),
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(10px)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{
              py: 1.5,
              gap: 2,
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
                Hello, {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Your profile, friends, and account details all live here now.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1.25}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              <Button
                variant="outlined"
                onClick={() => setIsProfileOpen(true)}
                sx={{
                  justifyContent: "flex-start",
                  px: 1.2,
                  minWidth: { xs: 0, sm: 172 },
                  flex: { xs: 1, sm: "0 0 auto" },
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: alpha("#1f4d46", 0.1),
                      color: "primary.main",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {getInitials(user.displayName)}
                  </Avatar>
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="body2" fontWeight={700}>
                      Profile
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Edit bio, phone, location
                    </Typography>
                  </Box>
                </Stack>
              </Button>

              <Button
                variant="contained"
                onClick={handleLogout}
                disabled={isLoggingOut}
                sx={{ flex: { xs: 1, sm: "0 0 auto" } }}
              >
                {isLoggingOut ? "Signing out..." : "Logout"}
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Outlet />
      </Container>

      <ProfileDrawer
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUserUpdated={setAuthenticatedUser}
        user={user}
      />
    </Box>
  );
}

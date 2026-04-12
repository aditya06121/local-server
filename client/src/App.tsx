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
              py: 1,
              gap: 1.5,
              alignItems: "center",
              minHeight: 0,
            }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  lineHeight: 1.1,
                  fontSize: { xs: "1.05rem", sm: "1.15rem" },
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Hello, {user.name}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                width: "auto",
                flexShrink: 0,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setIsProfileOpen(true)}
                sx={{
                  justifyContent: "flex-start",
                  px: 1,
                  py: 0.75,
                  minWidth: 0,
                  minHeight: 0,
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: alpha("#1f4d46", 0.1),
                      color: "primary.main",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {getInitials(user.displayName)}
                  </Avatar>
                  <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
                    <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                      Profile
                    </Typography>
                  </Box>
                </Stack>
              </Button>

              <Button
                variant="contained"
                onClick={handleLogout}
                disabled={isLoggingOut}
                sx={{
                  px: 1.75,
                  py: 0.8,
                  minHeight: 0,
                  minWidth: 0,
                  borderRadius: 2,
                }}
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

import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import ProfileDrawer from "./components/ProfileDrawer";
import { useAuth } from "./context/AuthContext";
import { useThemeMode } from "./context/ThemeContext";

export default function App() {
  const navigate = useNavigate();
  const { user, setAuthenticatedUser } = useAuth();
  const { mode, toggleMode } = useThemeMode();
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
          backgroundColor: (theme) =>
            alpha(theme.palette.background.paper, 0.95),
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
            <Box
              component={RouterLink}
              to="/"
              sx={{ flexGrow: 1, minWidth: 0, textDecoration: "none", color: "text.primary" }}
            >
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
              alignItems="center"
              sx={{ width: "auto", flexShrink: 0 }}
            >
              <IconButton
                onClick={toggleMode}
                size="small"
                sx={{
                  width: 36,
                  height: 36,
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                }}
                aria-label="Toggle dark mode"
              >
                {mode === "dark" ? (
                  <Brightness7Icon fontSize="small" />
                ) : (
                  <Brightness4Icon fontSize="small" />
                )}
              </IconButton>

              <Button
                variant="outlined"
                onClick={() => setIsProfileOpen(true)}
                sx={{
                  justifyContent: "flex-start",
                  px: 1.25,
                  py: 0.75,
                  minWidth: 0,
                  minHeight: 0,
                  borderRadius: 2,
                  gap: 1,
                }}
              >
                <SettingsIcon
                  sx={{ fontSize: 18, color: "primary.main", flexShrink: 0 }}
                />
                <Box
                  sx={{
                    display: { xs: "none", sm: "block" },
                    fontWeight: 700,
                    fontSize: "0.875rem",
                  }}
                >
                  Settings
                </Box>
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

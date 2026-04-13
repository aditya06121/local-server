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
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import Noticeboard from "../components/Noticeboard";
import ProfileDrawer from "../components/ProfileDrawer";

export default function Landing() {
  const { user, setAuthenticatedUser } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  function handleLogout() {
    setIsLoggingOut(true);
    navigate("/logout", { replace: true });
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
            sx={{ py: 1, gap: 1.5, alignItems: "center", minHeight: 0 }}
          >
            <Box
              component={RouterLink}
              to="/"
              sx={{
                flexGrow: 1,
                minWidth: 0,
                textDecoration: "none",
                color: "text.primary",
              }}
            >
              {user ? (
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
              ) : (
                <Typography
                  variant="h6"
                  sx={{
                    lineHeight: 1.1,
                    fontSize: { xs: "1.05rem", sm: "1.15rem" },
                    fontWeight: 700,
                  }}
                >
                  Local Server
                </Typography>
              )}
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexShrink: 0 }}
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

              {user ? (
                <>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/profile"
                    sx={{
                      px: 1.75,
                      py: 0.8,
                      minHeight: 0,
                      minWidth: 0,
                      borderRadius: 2,
                    }}
                  >
                    Profile
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
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/login"
                    sx={{
                      px: 1.75,
                      py: 0.8,
                      minHeight: 0,
                      minWidth: 0,
                      borderRadius: 2,
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to="/register"
                    sx={{
                      px: 1.75,
                      py: 0.8,
                      minHeight: 0,
                      minWidth: 0,
                      borderRadius: 2,
                    }}
                  >
                    Register
                  </Button>
                </>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Noticeboard currentUserId={user?.id ?? null} />

        </Stack>
      </Container>

      {user && (
        <ProfileDrawer
          open={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onUserUpdated={setAuthenticatedUser}
          user={user}
        />
      )}
    </Box>
  );
}

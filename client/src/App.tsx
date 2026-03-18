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
import { useAuth } from "./context/AuthContext";

function getInitials(name?: string) {
  if (!name) {
    return "AU";
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
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleLogout() {
    setIsLoggingOut(true);
    navigate("/logout", { replace: true });
  }

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        color="transparent"
        sx={{
          backgroundColor: alpha("#ffffff", 0.94),
          borderBottom: "1px solid",
          borderColor: "rgba(229, 231, 235, 1)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 1.5, gap: 2 }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ flexGrow: 1 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "16px",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.main",
                  color: "common.white",
                  fontWeight: 800,
                }}
              >
                AU
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Dashboard
                </Typography>
                <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                  Hello, {user?.displayName ?? "there"}
                </Typography>
              </Box>
            </Stack>

            <Avatar
              sx={{
                display: { xs: "none", sm: "flex" },
                bgcolor: alpha("#1f4d46", 0.08),
                color: "primary.main",
                fontWeight: 800,
              }}
            >
              {getInitials(user?.displayName)}
            </Avatar>
            <Button variant="outlined" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Signing out..." : "Logout"}
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}

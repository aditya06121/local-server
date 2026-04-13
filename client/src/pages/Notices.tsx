import {
  AppBar,
  Box,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import Noticeboard from "../components/Noticeboard";

export default function Notices() {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();

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
              <Typography
                variant="h6"
                sx={{
                  lineHeight: 1.1,
                  fontSize: { xs: "1.05rem", sm: "1.15rem" },
                  fontWeight: 700,
                }}
              >
                Noticeboard
              </Typography>
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
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        <Noticeboard currentUserId={user?.id ?? null} />
      </Container>
    </Box>
  );
}

import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AuthFormShell from "../components/AuthFormShell";
import { useAuth } from "../context/AuthContext";

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: number | undefined;

    async function runLogout() {
      await logout();

      if (!isMounted) return;

      setIsDone(true);
      timeoutId = window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 1100);
    }

    runLogout();

    return () => {
      isMounted = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [logout, navigate]);

  return (
    <AuthFormShell
      title={isDone ? "Signed out" : "Logging out"}
      subtitle={
        isDone
          ? "Your session has been cleared."
          : "Please wait while your session is being closed."
      }
      footerText="Want to come back?"
      footerLinkLabel="Open login"
      footerLinkTo="/login"
    >
      <div className="flex flex-col gap-4">
        <Box
          sx={{
            height: 10,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "rgba(23, 32, 29, 0.08)",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: isDone ? "100%" : "68%",
              bgcolor: "primary.main",
              transition: "width 360ms ease",
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          {isDone
            ? "Redirecting you to login."
            : "Closing session and clearing local auth state."}
        </Typography>

        <Button
          variant="outlined"
          fullWidth
          className="rounded-xl normal-case"
          onClick={() => navigate("/", { replace: true })}
        >
          Go to login now
        </Button>
      </div>
    </AuthFormShell>
  );
}

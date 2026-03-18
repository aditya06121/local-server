import React from "react";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ minHeight: "70vh", display: "grid", placeItems: "center", p: 4 }}>
        <Stack spacing={2.5} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 86,
              height: 86,
              borderRadius: "28px",
              display: "grid",
              placeItems: "center",
              bgcolor: alpha("#1f4d46", 0.08),
              color: "primary.main",
            }}
          >
            <Typography variant="h5" fontWeight={800}>
              404
            </Typography>
          </Box>
          <Typography variant="h3">Page not found</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
            The address you opened does not match an active route. Head back to
            the dashboard or return to the previous page.
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              justifyContent: "center",
              pt: 1,
            }}
          >
            <Button variant="contained" onClick={() => navigate("/")}>
              Open Dashboard
            </Button>

            <Button variant="outlined" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};

export default NotFound;

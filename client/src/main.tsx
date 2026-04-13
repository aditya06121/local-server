import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline } from "@mui/material";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AppThemeProvider } from "./context/ThemeContext";
import Landing from "./pages/Landing.tsx";
import Login from "./pages/Login.tsx";
import Notices from "./pages/Notices.tsx";
import Logout from "./pages/Logout.tsx";
import NotFound from "./pages/NotFound.tsx";
import Friends from "./pages/Friends.tsx";
import Profile from "./pages/Profile.tsx";
import PublicProfile from "./pages/PublicProfile.tsx";
import Register from "./pages/Register.tsx";

const router = createBrowserRouter([
  // Public landing page
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/notices",
    element: <Notices />,
  },
  // Public profile — no auth required
  {
    path: "/profiles/:userId",
    element: <PublicProfile />,
  },
  // Authenticated pages — share the App navbar layout
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <App />,
        children: [
          { path: "/profile", element: <Profile /> },
          { path: "/friends", element: <Friends /> },
        ],
      },
    ],
  },
  // Legacy / convenience redirects
  {
    path: "/dashboard",
    element: <Navigate to="/profile" replace />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/logout",
    element: <Logout />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>,
);

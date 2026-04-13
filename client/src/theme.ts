import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";

export function createAppTheme(mode: "light" | "dark") {
  const isDark = mode === "dark";

  let theme = createTheme({
    palette: {
      mode,
      primary: {
        main: "#1f4d46",
        light: "#34685f",
        dark: "#163833",
      },
      secondary: {
        main: "#b46b4d",
      },
      background: {
        default: isDark ? "#0c0c0c" : "#f9fafb",
        paper: isDark ? "#161616" : "#ffffff",
      },
      text: {
        primary: isDark ? "#f3f4f6" : "#111827",
        secondary: isDark ? "#9ca3af" : "#6b7280",
      },
      divider: isDark ? "rgba(40, 40, 40, 1)" : "rgba(229, 231, 235, 1)",
    },
    shape: {
      borderRadius: 4,
    },
    typography: {
      fontFamily: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
      h1: { fontWeight: 700, letterSpacing: "-0.04em" },
      h2: { fontWeight: 700, letterSpacing: "-0.04em" },
      h3: { fontWeight: 700, letterSpacing: "-0.03em" },
      h4: { fontWeight: 700, letterSpacing: "-0.03em" },
      h5: { fontWeight: 700, letterSpacing: "-0.02em" },
      h6: { fontWeight: 700, letterSpacing: "-0.02em" },
      button: {
        fontWeight: 700,
        letterSpacing: "-0.01em",
        textTransform: "none",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            color: isDark ? "#f3f4f6" : "#111827",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${isDark ? "rgba(55, 65, 81, 1)" : "rgba(243, 244, 246, 1)"}`,
            boxShadow: isDark
              ? "0 1px 2px rgba(0, 0, 0, 0.2)"
              : "0 1px 2px rgba(17, 24, 39, 0.04)",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            paddingInline: 18,
            minHeight: 44,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: isDark
              ? alpha("#161616", 0.8)
              : alpha("#ffffff", 0.8),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 700,
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme);
}

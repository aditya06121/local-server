import type { ReactNode } from "react";
import { Container, Link, Paper, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";

type AuthFormShellProps = {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  children: ReactNode;
};

const pageTransition = {
  duration: 0.22,
  ease: "easeOut" as const,
};

export default function AuthFormShell({
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children,
}: AuthFormShellProps) {
  return (
    <Container maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        className="min-h-screen flex items-center justify-center px-4 py-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={pageTransition}
          className="w-full"
        >
          <Paper
            elevation={0}
            className="w-full overflow-hidden border border-gray-100 rounded-2xl p-8"
          >
            <div className="mb-6 flex items-start gap-4">
              <div className="mt-1 h-16 w-1 rounded-full bg-[var(--mui-palette-primary-main)]" />
              <div>
                <Typography variant="h5" className="font-semibold">
                  {title}
                </Typography>
                <Typography variant="body2" className="mt-2 text-gray-500">
                  {subtitle}
                </Typography>
              </div>
            </div>

            {children}

            <div className="mt-6 text-center">
              <Typography variant="body2" className="text-gray-500">
                {footerText}{" "}
                <Link
                  component={RouterLink}
                  to={footerLinkTo}
                  underline="hover"
                  className="font-medium"
                >
                  {footerLinkLabel}
                </Link>
              </Typography>
            </div>
          </Paper>
        </motion.div>
      </motion.div>
    </Container>
  );
}

import { api } from "./api";

const DISPLAY_NAME_STORAGE_KEY = "auth-display-name:";

type BackendAuthUser = {
  id?: string;
  userId?: string;
  email: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

function toDisplayName(email: string, preferredName?: string) {
  if (preferredName?.trim()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `${DISPLAY_NAME_STORAGE_KEY}${email}`,
        preferredName.trim(),
      );
    }

    return preferredName.trim();
  }

  if (typeof window !== "undefined") {
    const storedName = window.localStorage.getItem(
      `${DISPLAY_NAME_STORAGE_KEY}${email}`,
    );

    if (storedName?.trim()) {
      return storedName.trim();
    }
  }

  const localPart = email.split("@")[0] ?? "friend";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();

  if (!normalized) {
    return "Friend";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toAuthUser(
  user: BackendAuthUser,
  preferredName?: string,
): AuthUser {
  return {
    id: user.id ?? user.userId ?? user.email,
    email: user.email,
    displayName: toDisplayName(user.email, preferredName),
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await api.get<{ data?: { user?: BackendAuthUser } }>("/auth/me", {
      skipAuthRedirect: true,
    });
    const user = res.data.data?.user;

    return user ? toAuthUser(user) : null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await api.post("/auth/logout", {}, { skipAuthRefresh: true });
  } catch {
    // ignore errors so UI can still clear client state
  }
}

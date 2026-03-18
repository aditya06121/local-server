import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUser } from "../../src/services/auth.register.js";
import bcrypt from "bcrypt";
import { createSession, createUser } from "../../src/db/queries.js";

vi.mock("../../src/db/queries.js", () => ({
  createUser: vi.fn(),
  createSession: vi.fn(),
  isUniqueViolation: vi.fn((error: { code?: string }) => error?.code === "P2002"),
}));

vi.mock("bcrypt");
vi.mock("../../src/utils/auth.token.js", () => ({
  generateAccessToken: vi.fn(() => "access-token"),
  generateRefreshToken: vi.fn(() => "refresh-token"),
  hashRefreshToken: vi.fn(() => "hashed-refresh-token"),
}));

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create user and return tokens", async () => {
    const email = `${Date.now()}@mail.com`;

    (bcrypt.hash as any).mockResolvedValue("hashed_password");

    vi.mocked(createUser).mockResolvedValue({
      id: "1",
      email,
    });

    vi.mocked(createSession).mockResolvedValue({} as never);

    const result = await registerUser({
      name: "test",
      email,
      password: "123456",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe(email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }
  });

  it("should fail if email exists", async () => {
    const email = `${Date.now()}@mail.com`;

    (bcrypt.hash as any).mockResolvedValue("hashed_password");
    vi.mocked(createUser).mockRejectedValue(
      Object.assign(new Error("Email already exists"), { code: "P2002" }),
    );

    const result = await registerUser({
      name: "test",
      email,
      password: "123456",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EMAIL_EXISTS");
    }
  });
});

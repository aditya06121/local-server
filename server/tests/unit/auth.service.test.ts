import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUser } from "../../src/services/auth.register.js";
import bcrypt from "bcrypt";
import { createUserWithSession } from "../../src/db/user.query.js";

vi.mock("../../src/db/user.query.js", () => ({
  createUserWithSession: vi.fn(),
  isUniqueViolation: vi.fn((error: { code?: string }) => error?.code === "23505"),
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
    const email = `Test-${Date.now()}@mail.com`;

    (bcrypt.hash as any).mockResolvedValue("hashed_password");

    vi.mocked(createUserWithSession).mockResolvedValue({
      id: "1",
      email: email.toLowerCase(),
    });

    const result = await registerUser({
      name: "test",
      email,
      password: "123456",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe(email.toLowerCase());
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }
    expect(createUserWithSession).toHaveBeenCalledWith(
      expect.objectContaining({
        email: email.toLowerCase(),
        name: "test",
        password: "hashed_password",
      }),
      expect.objectContaining({
        userId: expect.any(String),
        tokenId: expect.any(String),
        refreshToken: "hashed-refresh-token",
      }),
    );
  });

  it("should fail if email exists", async () => {
    const email = `${Date.now()}@mail.com`;

    (bcrypt.hash as any).mockResolvedValue("hashed_password");
    vi.mocked(createUserWithSession).mockRejectedValue(
      Object.assign(new Error("Email already exists"), { code: "23505" }),
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

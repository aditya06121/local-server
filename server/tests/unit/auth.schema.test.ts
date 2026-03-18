import { describe, expect, it } from "vitest";
import {
  loginSchema,
  logoutSchema,
  meSchema,
  refreshSchema,
  registerSchema,
} from "../../src/schema/auth.schema.js";

describe("auth schema failure responses", () => {
  it("should expose a 500 DB failure response for register", () => {
    expect(registerSchema.response).toHaveProperty("500");
    expect(registerSchema.response[500]).toMatchObject({
      type: "object",
      required: ["success", "message", "error"],
      properties: {
        success: { const: false },
        error: {
          type: "object",
          required: ["code"],
        },
      },
    });
  });

  it("should expose a 500 DB failure response for login", () => {
    expect(loginSchema.response).toHaveProperty("500");
    expect(loginSchema.response[500]).toMatchObject({
      type: "object",
      required: ["success", "message", "error"],
      properties: {
        success: { const: false },
        error: {
          type: "object",
          required: ["code"],
        },
      },
    });
  });

  it("should expose refresh responses for success, unauthorized, and DB failures", () => {
    expect(refreshSchema.response).toHaveProperty("200");
    expect(refreshSchema.response).toHaveProperty("401");
    expect(refreshSchema.response).toHaveProperty("429");
    expect(refreshSchema.response).toHaveProperty("500");
  });

  it("should expose logout responses for success and DB failures", () => {
    expect(logoutSchema.response).toHaveProperty("200");
    expect(logoutSchema.response).toHaveProperty("429");
    expect(logoutSchema.response).toHaveProperty("500");
  });

  it("should expose register and login rate-limit responses", () => {
    expect(registerSchema.response).toHaveProperty("429");
    expect(loginSchema.response).toHaveProperty("429");
  });

  it("should expose protected user responses for success and unauthorized", () => {
    expect(meSchema.response).toHaveProperty("200");
    expect(meSchema.response).toHaveProperty("401");
  });
});

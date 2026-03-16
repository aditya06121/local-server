import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("GET /api/dice", () => {
  it("should return a dice roll between 1 and 6", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/dice",
    });

    const body = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(body.roll).toBeGreaterThanOrEqual(1);
    expect(body.roll).toBeLessThanOrEqual(6);
  });
});

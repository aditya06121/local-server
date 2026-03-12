import request from "supertest";
import app from "../app.js";

describe("API routes", () => {
  test("GET / should return backend message", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      message: "backend running on pi zero",
    });
  });

  test("GET /health should return ok", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("ok");
  });
});

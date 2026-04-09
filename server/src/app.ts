import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import authRoutes from "./routes/auth.routes.js";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { failure } from "./utils/response.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    trustProxy: true,
  });

  app.register(cookie);
  app.register(rateLimit, {
    global: false,
    hook: "preHandler",
  });
  app.setErrorHandler((error, _req, reply) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 429
    ) {
      const details =
        "message" in error && typeof error.message === "string"
          ? error.message
          : "Too many requests, retry after the configured window";

      return reply.status(429).send(failure("RATE_LIMIT_EXCEEDED", details));
    }
    return reply.send(error);
  });

  app.register(authRoutes, { prefix: "/auth" });

  return app;
}

const app = buildApp();

export default app;

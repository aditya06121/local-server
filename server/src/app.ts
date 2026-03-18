import Fastify from "fastify";
import authRoutes from "./routes/auth.routes.js";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { failure } from "./utils/response.js";

const app = Fastify();

app.register(cookie);
app.register(rateLimit, {
  global: false,
  hook: "preHandler",
});

app.setErrorHandler((error, _req, reply) => {
  if (error.statusCode === 429) {
    const details =
      error.message || "Too many requests, retry after the configured window";

    return reply.status(429).send(failure("RATE_LIMIT_EXCEEDED", details));
  }

  return reply.send(error);
});

app.register(authRoutes, { prefix: "/auth" });

export default app;

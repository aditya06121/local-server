import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import friendsRoutes from "./routes/friend.routes.js";
import { failure } from "./utils/response.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  app.register(cookie);
  app.register(rateLimit, {
    global: false,
    hook: "preHandler",
    errorResponseBuilder: (_req, context) => ({
      statusCode: context.statusCode,
      ...failure(
        "RATE_LIMIT_EXCEEDED",
        `Rate limit exceeded, retry in ${context.after}`,
      ),
    }),
  });

  app.get("/", async () => {
    return { status: "ok" };
  });

  app.register(authRoutes, { prefix: "/auth" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(friendsRoutes, { prefix: "/friends" });

  return app;
}

const app = buildApp();

export default app;

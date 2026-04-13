import { FastifyInstance } from "fastify";

import { registerHandler } from "../controllers/auth.register.js";
import { loginHandler } from "../controllers/auth.login.js";
import { refreshHandler } from "../controllers/auth.refresh.js";
import { logoutHandler } from "../controllers/auth.logout.js";
import { verifyAccessToken } from "../utils/auth.token.js";

import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "../schema/auth.schema.js";

const registerRateLimit = {
  max: 10,
  timeWindow: "1 minute",
};

const loginRateLimit = {
  max: 10,
  timeWindow: "1 minute",
};

const refreshRateLimit = {
  max: 20,
  timeWindow: "1 minute",
};

const logoutRateLimit = {
  max: 20,
  timeWindow: "1 minute",
};

export default async function authRoutes(app: FastifyInstance) {
  app.get("/check", async (req, reply) => {
    const token = req.cookies.accessToken;

    if (!token) {
      return reply.status(401).send();
    }

    try {
      verifyAccessToken(token);
      return reply.status(200).send();
    } catch {
      return reply.status(401).send();
    }
  });

  app.post(
    "/register",
    { schema: registerSchema, config: { rateLimit: registerRateLimit } },
    registerHandler,
  );

  app.post(
    "/login",
    { schema: loginSchema, config: { rateLimit: loginRateLimit } },
    loginHandler,
  );

  app.post(
    "/refresh-token",
    { schema: refreshSchema, config: { rateLimit: refreshRateLimit } },
    refreshHandler,
  );

  app.post(
    "/logout",
    { schema: logoutSchema, config: { rateLimit: logoutRateLimit } },
    logoutHandler,
  );
}

import { FastifyInstance } from "fastify";

import { registerHandler } from "../controllers/auth.register.js";
import { loginHandler } from "../controllers/auth.login.js";
import { refreshHandler } from "../controllers/auth.refresh.js";
import { logoutHandler } from "../controllers/auth.logout.js";

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

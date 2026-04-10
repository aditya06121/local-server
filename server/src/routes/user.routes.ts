import { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { updateHandler, getHandler } from "../controllers/user.data.js";

import {
  getProfileSchema,
  updateProfileSchema,
} from "../schema/user.schema.js";

const userRateLimit = {
  max: 50,
  timeWindow: "1 minute",
};

export default async function userRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    {
      preHandler: authMiddleware,
      schema: getProfileSchema,
      config: { rateLimit: userRateLimit },
    },
    getHandler,
  );

  app.patch(
    "/me",
    {
      preHandler: authMiddleware,
      schema: updateProfileSchema,
      config: { rateLimit: userRateLimit },
    },
    updateHandler,
  );
}

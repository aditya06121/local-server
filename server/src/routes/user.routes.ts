import { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  updateHandler,
  getHandler,
  getPublicHandler,
} from "../controllers/user.data.js";

import {
  getProfileSchema,
  getPublicProfileSchema,
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

  app.get(
    "/:userId",
    {
      preHandler: authMiddleware,
      schema: getPublicProfileSchema,
      config: { rateLimit: userRateLimit },
    },
    getPublicHandler,
  );
}

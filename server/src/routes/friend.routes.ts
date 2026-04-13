import { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";

import {
  sendRequestHandler,
  acceptRequestHandler,
  rejectRequestHandler,
  cancelRequestHandler,
  removeFriendHandler,
  getFriendsHandler,
  getPendingRequestsHandler,
  searchUsersHandler,
} from "../controllers/friends.controller.js";

import {
  sendRequestSchema,
  acceptRequestSchema,
  rejectRequestSchema,
  cancelRequestSchema,
  getFriendsSchema,
  getRequestsSchema,
  removeFriendSchema,
  searchUsersSchema,
} from "../schema/friends.schema.js";

const friendsRateLimit = {
  max: 50,
  timeWindow: "1 minute",
};

export default async function friendsRoutes(app: FastifyInstance) {
  app.post(
    "/request",
    {
      preHandler: authMiddleware,
      schema: sendRequestSchema,
      config: { rateLimit: friendsRateLimit },
    },
    sendRequestHandler,
  );

  app.post(
    "/accept",
    {
      preHandler: authMiddleware,
      schema: acceptRequestSchema,
      config: { rateLimit: friendsRateLimit },
    },
    acceptRequestHandler,
  );

  app.post(
    "/reject",
    {
      preHandler: authMiddleware,
      schema: rejectRequestSchema,
      config: { rateLimit: friendsRateLimit },
    },
    rejectRequestHandler,
  );

  app.delete(
    "/request/:requestId",
    {
      preHandler: authMiddleware,
      schema: cancelRequestSchema,
      config: { rateLimit: friendsRateLimit },
    },
    cancelRequestHandler,
  );

  app.get(
    "/",
    {
      preHandler: authMiddleware,
      schema: getFriendsSchema,
      config: { rateLimit: friendsRateLimit },
    },
    getFriendsHandler,
  );

  app.get(
    "/requests",
    {
      preHandler: authMiddleware,
      schema: getRequestsSchema,
      config: { rateLimit: friendsRateLimit },
    },
    getPendingRequestsHandler,
  );

  app.get(
    "/search",
    {
      preHandler: authMiddleware,
      schema: searchUsersSchema,
      config: { rateLimit: friendsRateLimit },
    },
    searchUsersHandler,
  );

  app.delete(
    "/:friendId",
    {
      preHandler: authMiddleware,
      schema: removeFriendSchema,
      config: { rateLimit: friendsRateLimit },
    },
    removeFriendHandler,
  );
}

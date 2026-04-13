import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  postNoticeHandler,
  getNoticesHandler,
  deleteNoticeHandler,
} from "../controllers/notice.controller.js";
import {
  postNoticeSchema,
  getNoticesSchema,
  deleteNoticeSchema,
} from "../schema/notice.schema.js";

const noticesRateLimit = {
  max: 30,
  timeWindow: "1 minute",
};

const postRateLimit = {
  max: 5,
  timeWindow: "1 minute",
};

export default async function noticeRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: authMiddleware,
      schema: postNoticeSchema,
      config: { rateLimit: postRateLimit },
    },
    postNoticeHandler,
  );

  app.get(
    "/",
    {
      schema: getNoticesSchema,
      config: { rateLimit: noticesRateLimit },
    },
    getNoticesHandler,
  );

  app.delete(
    "/:noticeId",
    {
      preHandler: authMiddleware,
      schema: deleteNoticeSchema,
      config: { rateLimit: noticesRateLimit },
    },
    deleteNoticeHandler,
  );
}

import { FastifyRequest, FastifyReply } from "fastify";
import { failure, success } from "../utils/response.js";
import { listNotices, postNotice, removeNotice } from "../services/notice.service.js";

export async function postNoticeHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { content } = req.body as { content: string };

    const notice = await postNotice(userId, content);

    return res.status(201).send(success("NOTICE_POSTED", { notice }));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getNoticesHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const { cursor, limit, authorId } = req.query as { cursor?: string; limit?: number; authorId?: string };

    const result = await listNotices(cursor, limit, authorId);

    return res.send(success("NOTICES_FETCHED", result));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function deleteNoticeHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { noticeId } = req.params as { noticeId: string };

    await removeNotice(noticeId, userId);

    return res.send(success("NOTICE_DELETED", {}));
  } catch (err) {
    return handleError(res, err);
  }
}

function handleError(res: FastifyReply, err: unknown) {
  const message = (err as Error).message;

  switch (message) {
    case "CONTENT_REQUIRED":
    case "CONTENT_TOO_LONG":
      return res.status(400).send(failure(message, message));

    case "FORBIDDEN":
      return res.status(403).send(failure(message, "You can only delete your own notices"));

    case "NOTICE_NOT_FOUND":
      return res.status(404).send(failure(message, message));

    case "UNAUTHORIZED":
      return res.status(401).send(failure(message, message));

    default:
      return res.status(500).send(failure("INTERNAL_ERROR", message));
  }
}

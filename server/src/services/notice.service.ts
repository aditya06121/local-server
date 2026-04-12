import {
  createNotice,
  deleteNotice,
  findNoticeById,
  getNoticesPaginated,
} from "../db/notice.query.js";

const MAX_CONTENT_LENGTH = 500;

export async function postNotice(userId: string, content: string) {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("CONTENT_REQUIRED");
  }

  if (trimmed.length > MAX_CONTENT_LENGTH) {
    throw new Error("CONTENT_TOO_LONG");
  }

  return createNotice(userId, trimmed);
}

export async function listNotices(cursor?: string, limit?: number) {
  return getNoticesPaginated(cursor, limit);
}

export async function removeNotice(noticeId: string, requestingUserId: string) {
  const notice = await findNoticeById(noticeId);

  if (!notice) {
    throw new Error("NOTICE_NOT_FOUND");
  }

  if (notice.userId !== requestingUserId) {
    throw new Error("FORBIDDEN");
  }

  await deleteNotice(noticeId);
}

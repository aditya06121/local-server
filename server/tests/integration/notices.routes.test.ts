import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../../src/app.js";
import dbConnect, { closeDb } from "../../src/db.js";
import { deleteNoticesByUserIds } from "../../src/db/notice.query.js";
import { deleteUsersByEmails } from "../../src/db/user.query.js";

let app: FastifyInstance;

const createdEmails = new Set<string>();
const createdUserIds: string[] = [];
const runId = Date.now();
let emailSequence = 0;
let remoteAddressSequence = 0;

function nextEmail(prefix: string) {
  emailSequence += 1;
  const email = `${prefix}-${runId}-${emailSequence}@mail.com`;
  createdEmails.add(email);
  return email;
}

function nextRemoteAddress() {
  remoteAddressSequence += 1;
  return `10.40.0.${(remoteAddressSequence % 240) + 1}`;
}

function getCookieValue(
  cookies: Array<{ name: string; value?: string }>,
  name: string,
) {
  return cookies.find((c) => c.name === name)?.value;
}

async function cleanupUsers() {
  const emails = [...createdEmails];
  if (emails.length === 0) return;
  await deleteNoticesByUserIds(createdUserIds);
  await deleteUsersByEmails(emails);
}

async function registerUser(prefix: string) {
  const payload = {
    name: `${prefix} name`,
    email: nextEmail(prefix),
    password: "123456",
  };

  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    remoteAddress: nextRemoteAddress(),
    payload,
  });

  expect(response.statusCode).toBe(201);

  const body = response.json() as {
    data: { user: { id: string; email: string } };
  };

  createdUserIds.push(body.data.user.id);

  return {
    payload,
    user: body.data.user,
    accessToken: getCookieValue(response.cookies, "accessToken")!,
  };
}

async function postNotice(accessToken: string, content: string) {
  return app.inject({
    method: "POST",
    url: "/notices",
    remoteAddress: nextRemoteAddress(),
    cookies: { accessToken },
    payload: { content },
  });
}

async function getNotices(cursor?: string, limit?: number) {
  const query = new URLSearchParams();
  if (cursor) query.set("cursor", cursor);
  if (limit !== undefined) query.set("limit", String(limit));
  const qs = query.toString();

  return app.inject({
    method: "GET",
    url: `/notices${qs ? `?${qs}` : ""}`,
    remoteAddress: nextRemoteAddress(),
  });
}

async function deleteNotice(accessToken: string, noticeId: string) {
  return app.inject({
    method: "DELETE",
    url: `/notices/${noticeId}`,
    remoteAddress: nextRemoteAddress(),
    cookies: { accessToken },
  });
}

beforeAll(async () => {
  await dbConnect();
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await cleanupUsers();
  await app.close();
  await closeDb();
});

beforeEach(() => {
  emailSequence = 0;
  // remoteAddressSequence intentionally not reset — the 5/min POST rate limit
  // is per IP, so tests must use distinct IPs to avoid hitting the cap.
});

afterEach(async () => {
  await cleanupUsers();
  createdUserIds.length = 0;
  createdEmails.clear();
});

describe("/notices", () => {
  it("posts a notice and returns it with author info", async () => {
    const user = await registerUser("notice-post");

    const response = await postNotice(user.accessToken, "Hello from the board!");

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      message: "NOTICE_POSTED",
      data: {
        notice: {
          id: expect.any(String),
          content: "Hello from the board!",
          createdAt: expect.any(String),
          author: {
            id: user.user.id,
            name: user.payload.name,
            email: user.payload.email,
          },
        },
      },
    });
  });

  it("trims whitespace from content before saving", async () => {
    const user = await registerUser("notice-trim");

    const response = await postNotice(user.accessToken, "  trimmed notice  ");

    expect(response.statusCode).toBe(201);
    expect(response.json().data.notice.content).toBe("trimmed notice");
  });

  it("rejects empty content", async () => {
    const user = await registerUser("notice-empty");

    const response = await postNotice(user.accessToken, "   ");

    expect(response.statusCode).toBe(400);
  });

  it("rejects content exceeding 500 characters", async () => {
    const user = await registerUser("notice-long");

    const response = await postNotice(user.accessToken, "x".repeat(501));

    expect(response.statusCode).toBe(400);
  });

  it("requires authentication to post", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/notices",
      remoteAddress: nextRemoteAddress(),
      payload: { content: "no auth" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns all notices newest first", async () => {
    const userA = await registerUser("notice-list-a");
    const userB = await registerUser("notice-list-b");

    await postNotice(userA.accessToken, "first notice");
    await postNotice(userB.accessToken, "second notice");

    const response = await getNotices();

    expect(response.statusCode).toBe(200);

    const { notices, nextCursor } = response.json().data;

    expect(Array.isArray(notices)).toBe(true);
    expect(notices.length).toBeGreaterThanOrEqual(2);
    expect(nextCursor).toBeDefined();

    // Verify descending order
    for (let i = 1; i < notices.length; i++) {
      expect(new Date(notices[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(notices[i].createdAt).getTime(),
      );
    }

    // Each notice has required fields
    for (const notice of notices) {
      expect(notice).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        createdAt: expect.any(String),
        author: {
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String),
        },
      });
    }
  });

  it("paginates with cursor correctly", async () => {
    const user = await registerUser("notice-cursor");

    // Post 3 notices, page size 2 → should get cursor after page 1
    await postNotice(user.accessToken, "notice one");
    await postNotice(user.accessToken, "notice two");
    await postNotice(user.accessToken, "notice three");

    const page1 = await getNotices(undefined, 2);
    expect(page1.statusCode).toBe(200);

    const page1Body = page1.json().data;
    expect(page1Body.notices).toHaveLength(2);
    expect(page1Body.nextCursor).not.toBeNull();

    const page2 = await getNotices(page1Body.nextCursor, 2);
    expect(page2.statusCode).toBe(200);

    const page2Body = page2.json().data;
    expect(page2Body.notices.length).toBeGreaterThanOrEqual(1);

    // No overlap between pages
    const page1Ids = new Set(page1Body.notices.map((n: { id: string }) => n.id));
    for (const notice of page2Body.notices) {
      expect(page1Ids.has(notice.id)).toBe(false);
    }
  });

  it("allows unauthenticated access to list", async () => {
    const response = await getNotices();

    expect(response.statusCode).toBe(200);
  });

  it("owner can delete their own notice", async () => {
    const user = await registerUser("notice-delete-owner");

    const postRes = await postNotice(user.accessToken, "to be deleted");
    const noticeId = postRes.json().data.notice.id;

    const deleteRes = await deleteNotice(user.accessToken, noticeId);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json()).toMatchObject({
      success: true,
      message: "NOTICE_DELETED",
    });
  });

  it("non-owner cannot delete another user's notice", async () => {
    const owner = await registerUser("notice-delete-owner2");
    const other = await registerUser("notice-delete-other");

    const postRes = await postNotice(owner.accessToken, "owner's notice");
    const noticeId = postRes.json().data.notice.id;

    const deleteRes = await deleteNotice(other.accessToken, noticeId);

    expect(deleteRes.statusCode).toBe(403);
  });

  it("returns 404 when deleting a non-existent notice", async () => {
    const user = await registerUser("notice-delete-missing");

    const deleteRes = await deleteNotice(user.accessToken, "non-existent-id");

    expect(deleteRes.statusCode).toBe(404);
  });

  it("requires authentication to delete", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/notices/some-id",
      remoteAddress: nextRemoteAddress(),
    });

    expect(response.statusCode).toBe(401);
  });
});

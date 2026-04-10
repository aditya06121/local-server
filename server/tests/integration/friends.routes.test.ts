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
import {
  findFriendRequestBetweenUsers,
  findFriendRequestById,
  findFriendship,
  getFriendsByUserId,
  getPendingRequestsForUser,
} from "../../src/db/friend.query.js";
import { deleteUsersByEmails } from "../../src/db/user.query.js";

let app: FastifyInstance;

const createdEmails = new Set<string>();
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
  return `10.30.0.${(remoteAddressSequence % 240) + 1}`;
}

function getCookieValue(
  cookies: Array<{
    name: string;
    value?: string;
  }>,
  name: string,
) {
  return cookies.find((cookie) => cookie.name === name)?.value;
}

async function cleanupUsers() {
  const emails = [...createdEmails];

  if (emails.length === 0) {
    return;
  }

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
    data: {
      user: {
        id: string;
        email: string;
      };
    };
  };

  return {
    payload,
    user: body.data.user,
    accessToken: getCookieValue(response.cookies, "accessToken")!,
  };
}

async function updateProfile(
  accessToken: string,
  payload: {
    phone: string;
    bio: string;
    location: string;
  },
) {
  const response = await app.inject({
    method: "PATCH",
    url: "/users/me",
    remoteAddress: nextRemoteAddress(),
    cookies: {
      accessToken,
    },
    payload,
  });

  expect(response.statusCode).toBe(200);
}

async function sendRequest(accessToken: string, email: string) {
  return app.inject({
    method: "POST",
    url: "/friends/request",
    remoteAddress: nextRemoteAddress(),
    cookies: {
      accessToken,
    },
    payload: { email },
  });
}

async function acceptRequest(accessToken: string, requestId: string) {
  return app.inject({
    method: "POST",
    url: "/friends/accept",
    remoteAddress: nextRemoteAddress(),
    cookies: {
      accessToken,
    },
    payload: { requestId },
  });
}

describe("/friends", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await cleanupUsers();
    await closeDb();
  });

  it("sends a friend request by email and persists a pending record", async () => {
    const sender = await registerUser("friend-send-from");
    const recipient = await registerUser("friend-send-to");

    const response = await sendRequest(sender.accessToken, recipient.payload.email);
    const body = response.json() as {
      success: boolean;
      message: string;
      data: {
        request: {
          id: string;
          fromUserId: string;
          toUserId: string;
          status: string;
        };
      };
    };

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: "REQUEST_SENT",
      data: {
        request: {
          id: expect.any(String),
          fromUserId: sender.user.id,
          toUserId: recipient.user.id,
          status: "pending",
        },
      },
    });

    const storedRequest = await findFriendRequestBetweenUsers(
      sender.user.id,
      recipient.user.id,
    );

    expect(storedRequest).not.toBeNull();
    expect(storedRequest).toMatchObject({
      fromUserId: sender.user.id,
      toUserId: recipient.user.id,
      status: "pending",
    });
    await expect(findFriendship(sender.user.id, recipient.user.id)).resolves.toBeNull();
    await expect(findFriendship(recipient.user.id, sender.user.id)).resolves.toBeNull();
  });

  it("auto-accepts reverse pending requests and creates a bidirectional friendship", async () => {
    const firstUser = await registerUser("friend-auto-first");
    const secondUser = await registerUser("friend-auto-second");

    const firstRequest = await sendRequest(
      firstUser.accessToken,
      secondUser.payload.email,
    );

    expect(firstRequest.statusCode).toBe(200);

    const reverseResponse = await sendRequest(
      secondUser.accessToken,
      firstUser.payload.email,
    );

    expect(reverseResponse.statusCode).toBe(200);
    expect(reverseResponse.json()).toMatchObject({
      success: true,
      message: "REQUEST_AUTO_ACCEPTED",
      data: {},
    });

    const request = await findFriendRequestBetweenUsers(
      firstUser.user.id,
      secondUser.user.id,
    );

    expect(request).not.toBeNull();
    expect(request?.status).toBe("accepted");
    expect(await findFriendship(firstUser.user.id, secondUser.user.id)).not.toBeNull();
    expect(await findFriendship(secondUser.user.id, firstUser.user.id)).not.toBeNull();
  });

  it("accepts a pending request and creates a bidirectional friendship", async () => {
    const sender = await registerUser("friend-accept-from");
    const recipient = await registerUser("friend-accept-to");

    const requestResponse = await sendRequest(
      sender.accessToken,
      recipient.payload.email,
    );

    expect(requestResponse.statusCode).toBe(200);

    const request = await findFriendRequestBetweenUsers(
      sender.user.id,
      recipient.user.id,
    );

    expect(request).not.toBeNull();

    const response = await acceptRequest(recipient.accessToken, request!.id);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      message: "REQUEST_ACCEPTED",
      data: {},
    });

    const storedRequest = await findFriendRequestById(request!.id);

    expect(storedRequest?.status).toBe("accepted");
    expect(await findFriendship(sender.user.id, recipient.user.id)).not.toBeNull();
    expect(await findFriendship(recipient.user.id, sender.user.id)).not.toBeNull();
  });

  it("rejects a pending request without creating a friendship", async () => {
    const sender = await registerUser("friend-reject-from");
    const recipient = await registerUser("friend-reject-to");

    const requestResponse = await sendRequest(
      sender.accessToken,
      recipient.payload.email,
    );

    expect(requestResponse.statusCode).toBe(200);

    const request = await findFriendRequestBetweenUsers(
      sender.user.id,
      recipient.user.id,
    );

    expect(request).not.toBeNull();

    const response = await app.inject({
      method: "POST",
      url: "/friends/reject",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: recipient.accessToken,
      },
      payload: {
        requestId: request!.id,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      message: "REQUEST_REJECTED",
      data: {},
    });

    const storedRequest = await findFriendRequestById(request!.id);

    expect(storedRequest?.status).toBe("rejected");
    await expect(findFriendship(sender.user.id, recipient.user.id)).resolves.toBeNull();
    await expect(findFriendship(recipient.user.id, sender.user.id)).resolves.toBeNull();
  });

  it("allows re-sending a friend request after a rejection", async () => {
    const sender = await registerUser("friend-reresend-from");
    const recipient = await registerUser("friend-reresend-to");

    const firstRequest = await sendRequest(sender.accessToken, recipient.payload.email);
    expect(firstRequest.statusCode).toBe(200);

    const storedRequest = await findFriendRequestBetweenUsers(
      sender.user.id,
      recipient.user.id,
    );

    const rejectResponse = await app.inject({
      method: "POST",
      url: "/friends/reject",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: recipient.accessToken,
      },
      payload: {
        requestId: storedRequest!.id,
      },
    });

    expect(rejectResponse.statusCode).toBe(200);

    const resendResponse = await sendRequest(
      sender.accessToken,
      recipient.payload.email.toUpperCase(),
    );

    expect(resendResponse.statusCode).toBe(200);
    expect(resendResponse.json()).toMatchObject({
      success: true,
      message: "REQUEST_SENT",
      data: {
        request: {
          id: storedRequest!.id,
          fromUserId: sender.user.id,
          toUserId: recipient.user.id,
          status: "pending",
        },
      },
    });

    const updatedRequest = await findFriendRequestById(storedRequest!.id);

    expect(updatedRequest?.status).toBe("pending");
    expect(updatedRequest?.fromUserId).toBe(sender.user.id);
    expect(updatedRequest?.toUserId).toBe(recipient.user.id);
  });

  it("returns enriched friend records from GET /friends", async () => {
    const requester = await registerUser("friend-list-requester");
    const friend = await registerUser("friend-list-target");

    await updateProfile(friend.accessToken, {
      phone: "+91-8888888888",
      bio: "Enjoys databases",
      location: "Bengaluru",
    });

    const requestResponse = await sendRequest(
      requester.accessToken,
      friend.payload.email,
    );

    expect(requestResponse.statusCode).toBe(200);

    const request = await findFriendRequestBetweenUsers(
      requester.user.id,
      friend.user.id,
    );

    const acceptResponse = await acceptRequest(friend.accessToken, request!.id);

    expect(acceptResponse.statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/friends",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: requester.accessToken,
      },
    });

    const body = response.json() as {
      data: {
        friends: Array<{
          id: string;
          name: string;
          email: string;
          phone: string | null;
          bio: string | null;
          location: string | null;
          password?: string;
        }>;
      };
    };

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      data: {
        friends: [
          {
            id: friend.user.id,
            name: friend.payload.name,
            email: friend.payload.email,
            phone: "+91-8888888888",
            bio: "Enjoys databases",
            location: "Bengaluru",
          },
        ],
      },
    });
    expect(body.data.friends[0]?.password).toBeUndefined();

    const storedFriends = await getFriendsByUserId(requester.user.id);

    expect(storedFriends).toHaveLength(1);
    expect(storedFriends[0]).toMatchObject({
      id: friend.user.id,
      phone: "+91-8888888888",
      bio: "Enjoys databases",
      location: "Bengaluru",
    });
  });

  it("returns pending requests with the nested fromUser payload", async () => {
    const sender = await registerUser("friend-pending-from");
    const recipient = await registerUser("friend-pending-to");

    const requestResponse = await sendRequest(
      sender.accessToken,
      recipient.payload.email,
    );

    expect(requestResponse.statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/friends/requests",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: recipient.accessToken,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      message: "REQUESTS_FETCHED",
      data: {
        requests: [
          {
            id: expect.any(String),
            status: "pending",
            fromUser: {
              id: sender.user.id,
              name: sender.payload.name,
              email: sender.payload.email,
            },
          },
        ],
      },
    });

    const storedRequests = await getPendingRequestsForUser(recipient.user.id);

    expect(storedRequests).toHaveLength(1);
    expect(storedRequests[0]).toMatchObject({
      status: "pending",
      fromUser: {
        id: sender.user.id,
        email: sender.payload.email,
      },
    });
  });

  it("removes both friendship rows when a friend is deleted", async () => {
    const firstUser = await registerUser("friend-remove-first");
    const secondUser = await registerUser("friend-remove-second");

    const requestResponse = await sendRequest(
      firstUser.accessToken,
      secondUser.payload.email,
    );

    expect(requestResponse.statusCode).toBe(200);

    const request = await findFriendRequestBetweenUsers(
      firstUser.user.id,
      secondUser.user.id,
    );

    const acceptResponse = await acceptRequest(secondUser.accessToken, request!.id);

    expect(acceptResponse.statusCode).toBe(200);

    const response = await app.inject({
      method: "DELETE",
      url: `/friends/${secondUser.user.id}`,
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: firstUser.accessToken,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      message: "FRIEND_REMOVED",
      data: {},
    });
    await expect(findFriendship(firstUser.user.id, secondUser.user.id)).resolves.toBeNull();
    await expect(findFriendship(secondUser.user.id, firstUser.user.id)).resolves.toBeNull();
  });

  it("allows sending a new request after removing a friend", async () => {
    const firstUser = await registerUser("friend-rerequest-first");
    const secondUser = await registerUser("friend-rerequest-second");

    const initialRequest = await sendRequest(
      firstUser.accessToken,
      secondUser.payload.email,
    );
    expect(initialRequest.statusCode).toBe(200);

    const storedRequest = await findFriendRequestBetweenUsers(
      firstUser.user.id,
      secondUser.user.id,
    );

    const acceptResponse = await acceptRequest(secondUser.accessToken, storedRequest!.id);
    expect(acceptResponse.statusCode).toBe(200);

    const removeResponse = await app.inject({
      method: "DELETE",
      url: `/friends/${secondUser.user.id}`,
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: firstUser.accessToken,
      },
    });
    expect(removeResponse.statusCode).toBe(200);

    const resendResponse = await sendRequest(
      secondUser.accessToken,
      firstUser.payload.email,
    );

    expect(resendResponse.statusCode).toBe(200);
    expect(resendResponse.json()).toMatchObject({
      success: true,
      message: "REQUEST_SENT",
      data: {
        request: {
          id: storedRequest!.id,
          fromUserId: secondUser.user.id,
          toUserId: firstUser.user.id,
          status: "pending",
        },
      },
    });
  });

  it("filters search results to exclude self, friends, and pending requests", async () => {
    const currentUser = await registerUser("searchable-self");
    const friend = await registerUser("searchable-friend");
    const outgoingPending = await registerUser("searchable-outgoing");
    const incomingPending = await registerUser("searchable-incoming");
    const candidate = await registerUser("searchable-candidate");

    const friendRequest = await sendRequest(
      currentUser.accessToken,
      friend.payload.email,
    );
    expect(friendRequest.statusCode).toBe(200);

    const storedFriendRequest = await findFriendRequestBetweenUsers(
      currentUser.user.id,
      friend.user.id,
    );
    await acceptRequest(friend.accessToken, storedFriendRequest!.id);

    const outgoingRequest = await sendRequest(
      currentUser.accessToken,
      outgoingPending.payload.email,
    );
    expect(outgoingRequest.statusCode).toBe(200);

    const incomingRequest = await sendRequest(
      incomingPending.accessToken,
      currentUser.payload.email,
    );
    expect(incomingRequest.statusCode).toBe(200);

    const shortQueryResponse = await app.inject({
      method: "GET",
      url: "/friends/search?q=abc",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: currentUser.accessToken,
      },
    });

    expect(shortQueryResponse.statusCode).toBe(200);
    expect(shortQueryResponse.json()).toMatchObject({
      success: true,
      message: "SEARCH_RESULTS",
      data: {
        users: [],
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/friends/search?q=searchable-",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: currentUser.accessToken,
      },
    });

    const body = response.json() as {
      data: {
        users: Array<{
          id: string;
          name: string;
          email: string;
          phone?: string;
        }>;
      };
    };

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: "SEARCH_RESULTS",
      data: {
        users: [
          {
            id: candidate.user.id,
            name: candidate.payload.name,
            email: candidate.payload.email,
          },
        ],
      },
    });
    expect(body.data.users).toHaveLength(1);
    expect(body.data.users[0]?.phone).toBeUndefined();
  });
});

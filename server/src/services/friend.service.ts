import { db } from "../db.js";
import {
  createFriendRequest,
  createFriendship,
  deleteFriendship,
  findFriendRequestById,
  findFriendRequestBetweenUsers,
  findFriendship,
  findUserByEmailExact,
  getFriendsByUserId,
  getPendingRequestsForUser,
  resetFriendRequest,
  searchUsersByEmailFiltered,
  updateFriendRequestStatus,
} from "../db/friend.query.js";
import { isUniqueViolation } from "../db/user.query.js";

async function sendFriendRequestInternal(
  fromUserId: string,
  email: string,
  shouldRetryOnUniqueViolation: boolean,
) {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    return await db.transaction(async (tx) => {
      const targetUser = await findUserByEmailExact(normalizedEmail, tx);

      if (!targetUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const toUserId = targetUser.id;

      if (fromUserId === toUserId) {
        throw new Error("CANNOT_SELF_REQUEST");
      }

      const existingFriend = await findFriendship(fromUserId, toUserId, tx);

      if (existingFriend) {
        throw new Error("ALREADY_FRIENDS");
      }

      const existingRequest = await findFriendRequestBetweenUsers(
        fromUserId,
        toUserId,
        tx,
      );

      if (existingRequest) {
        if (
          existingRequest.status === "pending" &&
          existingRequest.fromUserId === toUserId
        ) {
          await updateFriendRequestStatus(tx, existingRequest.id, "accepted");
          await createFriendship(tx, fromUserId, toUserId);
          return { autoAccepted: true };
        }

        if (existingRequest.status === "pending") {
          throw new Error("REQUEST_ALREADY_EXISTS");
        }

        const request = await resetFriendRequest(
          tx,
          existingRequest.id,
          fromUserId,
          toUserId,
        );

        return { request };
      }

      const request = await createFriendRequest(fromUserId, toUserId, tx);

      return { request };
    });
  } catch (error) {
    if (shouldRetryOnUniqueViolation && isUniqueViolation(error)) {
      return sendFriendRequestInternal(fromUserId, email, false);
    }

    throw error;
  }
}

export async function sendFriendRequest(fromUserId: string, email: string) {
  return sendFriendRequestInternal(fromUserId, email, true);
}

export async function acceptFriendRequest(requestId: string, userId: string) {
  await db.transaction(async (tx) => {
    const request = await findFriendRequestById(requestId, tx);

    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    if (request.toUserId !== userId) {
      throw new Error("UNAUTHORIZED");
    }

    if (request.status !== "pending") {
      throw new Error("INVALID_REQUEST_STATE");
    }

    await updateFriendRequestStatus(tx, requestId, "accepted");

    await createFriendship(tx, request.fromUserId, request.toUserId);
  });
}

export async function rejectFriendRequest(requestId: string, userId: string) {
  await db.transaction(async (tx) => {
    const request = await findFriendRequestById(requestId, tx);

    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    if (request.toUserId !== userId) {
      throw new Error("UNAUTHORIZED");
    }

    if (request.status !== "pending") {
      throw new Error("INVALID_REQUEST_STATE");
    }

    await updateFriendRequestStatus(tx, requestId, "rejected");
  });
}

export async function removeFriend(userId: string, friendId: string) {
  if (userId === friendId) {
    throw new Error("INVALID_OPERATION");
  }

  await db.transaction(async (tx) => {
    await deleteFriendship(tx, userId, friendId);
  });
}

export async function getMyFriends(userId: string) {
  return getFriendsByUserId(userId);
}

export async function getMyPendingRequests(userId: string) {
  return getPendingRequestsForUser(userId);
}

export async function searchUsers(query: string, userId: string) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery || normalizedQuery.length < 4) {
    return [];
  }

  return searchUsersByEmailFiltered(normalizedQuery, userId);
}

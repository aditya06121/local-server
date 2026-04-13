import { FastifyRequest, FastifyReply } from "fastify";
import { failure, success } from "../utils/response.js";

import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getMyFriends,
  getMyPendingRequests,
  getRelationshipStatus,
  searchUsers,
} from "../services/friend.service.js";

export async function sendRequestHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).send(failure("INVALID_INPUT", "email required"));
    }

    const result = await sendFriendRequest(userId, email);

    if ("autoAccepted" in result) {
      return res.send(success("REQUEST_AUTO_ACCEPTED", {}));
    }

    return res.send(success("REQUEST_SENT", result));
  } catch (err) {
    return handleError(res, err);
  }
}
export async function acceptRequestHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { requestId } = req.body as { requestId: string };

    if (!requestId) {
      return res
        .status(400)
        .send(failure("INVALID_INPUT", "requestId required"));
    }

    await acceptFriendRequest(requestId, userId);

    return res.send(success("REQUEST_ACCEPTED", {}));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function rejectRequestHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { requestId } = req.body as { requestId: string };

    if (!requestId) {
      return res
        .status(400)
        .send(failure("INVALID_INPUT", "requestId required"));
    }

    await rejectFriendRequest(requestId, userId);

    return res.send(success("REQUEST_REJECTED", {}));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function cancelRequestHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { requestId } = req.params as { requestId: string };

    await cancelFriendRequest(requestId, userId);

    return res.send(success("REQUEST_CANCELLED", {}));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function removeFriendHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { friendId } = req.params as { friendId: string };

    if (!friendId) {
      return res
        .status(400)
        .send(failure("INVALID_INPUT", "friendId required"));
    }

    await removeFriend(userId, friendId);

    return res.send(success("FRIEND_REMOVED", {}));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getFriendsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const friends = await getMyFriends(userId);

    return res.send(success("FRIENDS_FETCHED", { friends }));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getPendingRequestsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const requests = await getMyPendingRequests(userId);

    return res.send(success("REQUESTS_FETCHED", { requests }));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getRelationshipHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }
    const { targetUserId } = req.params as { targetUserId: string };
    const relationship = await getRelationshipStatus(userId, targetUserId);
    return res.send(success("RELATIONSHIP_FETCHED", { relationship }));
  } catch (err) {
    return handleError(res, err);
  }
}

export async function searchUsersHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { q } = req.query as { q: string };

    const users = await searchUsers(q, userId);

    return res.send(success("SEARCH_RESULTS", { users }));
  } catch (err) {
    return res
      .status(500)
      .send(failure("INTERNAL_ERROR", (err as Error).message));
  }
}
function handleError(res: FastifyReply, err: unknown) {
  const message = (err as Error).message;

  switch (message) {
    case "CANNOT_SELF_REQUEST":
    case "ALREADY_FRIENDS":
    case "REQUEST_ALREADY_EXISTS":
    case "INVALID_REQUEST_STATE":
    case "USER_NOT_FOUND":
    case "INVALID_OPERATION":
      return res.status(400).send(failure(message, message));

    case "REQUEST_NOT_FOUND":
      return res.status(404).send(failure(message, message));

    case "UNAUTHORIZED":
      return res.status(401).send(failure(message, message));

    default:
      return res.status(500).send(failure("INTERNAL_ERROR", message));
  }
}

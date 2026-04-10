import { beforeEach, describe, expect, it, vi } from "vitest";

const { txMock, transactionMock } = vi.hoisted(() => {
  const txMock = { tag: "tx" };
  const transactionMock = vi.fn(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
  );

  return { txMock, transactionMock };
});

vi.mock("../../src/db.js", () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock("../../src/db/friend.query.js", () => ({
  createFriendRequest: vi.fn(),
  findFriendRequestBetweenUsers: vi.fn(),
  findFriendship: vi.fn(),
  createFriendship: vi.fn(),
  updateFriendRequestStatus: vi.fn(),
  deleteFriendship: vi.fn(),
  getFriendsByUserId: vi.fn(),
  getPendingRequestsForUser: vi.fn(),
  findFriendRequestById: vi.fn(),
  findUserByEmailExact: vi.fn(),
  resetFriendRequest: vi.fn(),
  searchUsersByEmailFiltered: vi.fn(),
}));

vi.mock("../../src/db/user.query.js", () => ({
  isUniqueViolation: vi.fn(() => false),
}));

import {
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "../../src/services/friend.service.js";
import {
  createFriendRequest,
  createFriendship,
  deleteFriendship,
  findFriendRequestBetweenUsers,
  findFriendRequestById,
  findFriendship,
  findUserByEmailExact,
  resetFriendRequest,
  searchUsersByEmailFiltered,
  updateFriendRequestStatus,
} from "../../src/db/friend.query.js";
import { isUniqueViolation } from "../../src/db/user.query.js";

describe("friend.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(
      async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
    );
  });

  describe("sendFriendRequest", () => {
    it("creates a pending request for a valid target", async () => {
      const request = {
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "pending",
      };

      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-2",
      } as never);
      vi.mocked(findFriendship).mockResolvedValue(null);
      vi.mocked(findFriendRequestBetweenUsers).mockResolvedValue(null);
      vi.mocked(createFriendRequest).mockResolvedValue(request as never);

      const result = await sendFriendRequest("user-1", "  Friend@Mail.com  ");

      expect(findUserByEmailExact).toHaveBeenCalledWith("friend@mail.com", txMock);
      expect(findFriendship).toHaveBeenCalledWith("user-1", "user-2", txMock);
      expect(findFriendRequestBetweenUsers).toHaveBeenCalledWith(
        "user-1",
        "user-2",
        txMock,
      );
      expect(createFriendRequest).toHaveBeenCalledWith("user-1", "user-2", txMock);
      expect(result).toEqual({ request });
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it("rejects self requests", async () => {
      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-1",
      } as never);

      await expect(sendFriendRequest("user-1", "self@mail.com")).rejects.toThrow(
        "CANNOT_SELF_REQUEST",
      );
      expect(findFriendship).not.toHaveBeenCalledWith("user-1", "user-1", txMock);
      expect(createFriendRequest).not.toHaveBeenCalled();
    });

    it("rejects users who are already friends", async () => {
      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-2",
      } as never);
      vi.mocked(findFriendship).mockResolvedValue({ id: "friendship" } as never);

      await expect(sendFriendRequest("user-1", "friend@mail.com")).rejects.toThrow(
        "ALREADY_FRIENDS",
      );
      expect(findFriendRequestBetweenUsers).not.toHaveBeenCalled();
      expect(createFriendRequest).not.toHaveBeenCalled();
    });

    it("rejects when a pending request already exists in the same direction", async () => {
      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-2",
      } as never);
      vi.mocked(findFriendship).mockResolvedValue(null);
      vi.mocked(findFriendRequestBetweenUsers).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "pending",
      } as never);

      await expect(sendFriendRequest("user-1", "friend@mail.com")).rejects.toThrow(
        "REQUEST_ALREADY_EXISTS",
      );
      expect(createFriendRequest).not.toHaveBeenCalled();
    });

    it("auto-accepts when a reverse pending request exists", async () => {
      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-2",
      } as never);
      vi.mocked(findFriendship).mockResolvedValue(null);
      vi.mocked(findFriendRequestBetweenUsers).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-2",
        toUserId: "user-1",
        status: "pending",
      } as never);

      const result = await sendFriendRequest("user-1", "friend@mail.com");

      expect(result).toEqual({ autoAccepted: true });
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(updateFriendRequestStatus).toHaveBeenCalledWith(
        txMock,
        "request-1",
        "accepted",
      );
      expect(createFriendship).toHaveBeenCalledWith(txMock, "user-1", "user-2");
      expect(createFriendRequest).not.toHaveBeenCalled();
    });

    it("resets a resolved request back to pending for the same pair", async () => {
      const request = {
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "pending",
      };

      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-2",
      } as never);
      vi.mocked(findFriendship).mockResolvedValue(null);
      vi.mocked(findFriendRequestBetweenUsers).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-2",
        toUserId: "user-1",
        status: "rejected",
      } as never);
      vi.mocked(resetFriendRequest).mockResolvedValue(request as never);

      const result = await sendFriendRequest("user-1", "friend@mail.com");

      expect(resetFriendRequest).toHaveBeenCalledWith(
        txMock,
        "request-1",
        "user-1",
        "user-2",
      );
      expect(result).toEqual({ request });
    });

    it("retries once when a unique constraint races request creation", async () => {
      const request = {
        id: "request-1",
        fromUserId: "user-2",
        toUserId: "user-1",
        status: "pending",
      };

      vi.mocked(findUserByEmailExact).mockResolvedValue({
        id: "user-2",
      } as never);
      vi.mocked(findFriendship).mockResolvedValue(null);
      vi.mocked(findFriendRequestBetweenUsers)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(request as never);
      vi.mocked(createFriendRequest).mockRejectedValueOnce(
        Object.assign(new Error("duplicate key"), { code: "23505" }),
      );
      vi.mocked(isUniqueViolation).mockReturnValue(true);

      const result = await sendFriendRequest("user-1", "friend@mail.com");

      expect(isUniqueViolation).toHaveBeenCalled();
      expect(result).toEqual({ autoAccepted: true });
      expect(transactionMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("acceptFriendRequest", () => {
    it("accepts a valid pending request", async () => {
      vi.mocked(findFriendRequestById).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "pending",
      } as never);

      await acceptFriendRequest("request-1", "user-2");

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(findFriendRequestById).toHaveBeenCalledWith("request-1", txMock);
      expect(updateFriendRequestStatus).toHaveBeenCalledWith(
        txMock,
        "request-1",
        "accepted",
      );
      expect(createFriendship).toHaveBeenCalledWith(txMock, "user-1", "user-2");
    });

    it("rejects an invalid recipient", async () => {
      vi.mocked(findFriendRequestById).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-3",
        status: "pending",
      } as never);

      await expect(acceptFriendRequest("request-1", "user-2")).rejects.toThrow(
        "UNAUTHORIZED",
      );
      expect(updateFriendRequestStatus).not.toHaveBeenCalled();
      expect(createFriendship).not.toHaveBeenCalled();
    });

    it("rejects requests that are already resolved", async () => {
      vi.mocked(findFriendRequestById).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "accepted",
      } as never);

      await expect(acceptFriendRequest("request-1", "user-2")).rejects.toThrow(
        "INVALID_REQUEST_STATE",
      );
      expect(updateFriendRequestStatus).not.toHaveBeenCalled();
      expect(createFriendship).not.toHaveBeenCalled();
    });
  });

  describe("rejectFriendRequest", () => {
    it("rejects a valid pending request", async () => {
      vi.mocked(findFriendRequestById).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "pending",
      } as never);

      await rejectFriendRequest("request-1", "user-2");

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(findFriendRequestById).toHaveBeenCalledWith("request-1", txMock);
      expect(updateFriendRequestStatus).toHaveBeenCalledWith(
        txMock,
        "request-1",
        "rejected",
      );
      expect(createFriendship).not.toHaveBeenCalled();
    });

    it("rejects requests that are already resolved", async () => {
      vi.mocked(findFriendRequestById).mockResolvedValue({
        id: "request-1",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "rejected",
      } as never);

      await expect(rejectFriendRequest("request-1", "user-2")).rejects.toThrow(
        "INVALID_REQUEST_STATE",
      );
      expect(updateFriendRequestStatus).not.toHaveBeenCalled();
    });
  });

  describe("removeFriend", () => {
    it("removes both friendship records within a transaction", async () => {
      await removeFriend("user-1", "user-2");

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(deleteFriendship).toHaveBeenCalledWith(txMock, "user-1", "user-2");
    });

    it("rejects when the same user is provided twice", async () => {
      await expect(removeFriend("user-1", "user-1")).rejects.toThrow(
        "INVALID_OPERATION",
      );
      expect(transactionMock).not.toHaveBeenCalled();
      expect(deleteFriendship).not.toHaveBeenCalled();
    });
  });

  describe("searchUsers", () => {
    it("returns an empty list for queries shorter than four characters after trimming", async () => {
      await expect(searchUsers("  abc  ", "user-1")).resolves.toEqual([]);
      expect(searchUsersByEmailFiltered).not.toHaveBeenCalled();
    });

    it("delegates filtering to the query layer with normalized input", async () => {
      const users = [
        {
          id: "user-2",
          email: "target@mail.com",
          name: "Target",
        },
      ];

      vi.mocked(searchUsersByEmailFiltered).mockResolvedValue(users as never);

      const result = await searchUsers("  TARGET  ", "user-1");

      expect(searchUsersByEmailFiltered).toHaveBeenCalledWith("target", "user-1");
      expect(result).toEqual(users);
    });
  });
});

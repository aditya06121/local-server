import {
  updateMyProfile,
  getMyProfile,
  getPublicProfile,
} from "../services/user.data.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { failure, success } from "../utils/response.js";

export async function updateHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const { phone, bio, location } = req.body as {
      phone?: string;
      bio?: string;
      location?: string;
    };

    const updated = await updateMyProfile(userId, {
      phone,
      bio,
      location,
    });

    return res.send(success("PROFILE_UPDATED", { user: updated }));
  } catch (err) {
    if ((err as Error).message === "USER_NOT_FOUND") {
      return res.status(404).send(failure("USER_NOT_FOUND", "User not found"));
    }

    return res
      .status(500)
      .send(failure("INTERNAL_ERROR", (err as Error).message));
  }
}
export async function getHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).send(failure("UNAUTHORIZED", "Missing user"));
    }

    const user = await getMyProfile(userId);

    return res.send(success("PROFILE_FETCHED", { user }));
  } catch (err) {
    if ((err as Error).message === "USER_NOT_FOUND") {
      return res.status(404).send(failure("USER_NOT_FOUND", "User not found"));
    }

    return res
      .status(500)
      .send(failure("INTERNAL_ERROR", (err as Error).message));
  }
}

export async function getPublicHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const { userId } = req.params as { userId: string };

    const user = await getPublicProfile(userId);

    return res.send(success("PUBLIC_PROFILE_FETCHED", { user }));
  } catch (err) {
    if ((err as Error).message === "USER_NOT_FOUND") {
      return res.status(404).send(failure("USER_NOT_FOUND", "User not found"));
    }

    return res
      .status(500)
      .send(failure("INTERNAL_ERROR", (err as Error).message));
  }
}

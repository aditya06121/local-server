import { findPublicUserById, updateUserProfile } from "../db/user.query.js";

type UpdateProfileInput = {
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
};

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const user = await findPublicUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return updateUserProfile(userId, input);
}

export async function getMyProfile(userId: string) {
  const user = await findPublicUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
}

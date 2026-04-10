import {
  createApiFailureSchema,
  createApiSuccessSchema,
} from "../utils/response.js";

const failureSchema = createApiFailureSchema();

const userProfileSchema = {
  type: "object",
  required: ["id", "name", "email"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string", format: "email" },
    phone: { type: ["string", "null"] },
    bio: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
  },
};

export const getProfileSchema = {
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["user"],
      properties: {
        user: userProfileSchema,
      },
    }),
    401: failureSchema,
    404: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const updateProfileSchema = {
  body: {
    type: "object",
    properties: {
      phone: { type: "string" },
      bio: { type: "string" },
      location: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["user"],
      properties: {
        user: userProfileSchema,
      },
    }),
    401: failureSchema,
    404: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

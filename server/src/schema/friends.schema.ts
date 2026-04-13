import {
  createApiFailureSchema,
  createApiSuccessSchema,
} from "../utils/response.js";

const failureSchema = createApiFailureSchema();

const userSchema = {
  type: "object",
  required: ["id", "name", "email"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string", format: "email" },
  },
};

const friendSchema = {
  ...userSchema,
  properties: {
    ...userSchema.properties,
    phone: { type: ["string", "null"] },
    bio: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
  },
};

const friendRequestSchema = {
  type: "object",
  required: ["id", "status", "direction", "otherUser"],
  properties: {
    id: { type: "string" },
    status: {
      type: "string",
      enum: ["pending", "accepted", "rejected"],
    },
    direction: {
      type: "string",
      enum: ["received", "sent"],
    },
    otherUser: userSchema,
  },
};

const createdFriendRequestSchema = {
  type: "object",
  required: ["id", "fromUserId", "toUserId", "status"],
  properties: {
    id: { type: "string" },
    fromUserId: { type: "string" },
    toUserId: { type: "string" },
    status: {
      type: "string",
      enum: ["pending", "accepted", "rejected"],
    },
  },
};

export const sendRequestSchema = {
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      anyOf: [
        {
          type: "object",
          required: ["request"],
          properties: {
            request: createdFriendRequestSchema,
          },
        },
        {
          type: "object",
          additionalProperties: false,
        },
      ],
    }),
    400: failureSchema,
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const acceptRequestSchema = {
  body: {
    type: "object",
    required: ["requestId"],
    properties: {
      requestId: { type: "string" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      additionalProperties: false,
    }),
    400: failureSchema,
    401: failureSchema,
    404: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const rejectRequestSchema = acceptRequestSchema;

export const cancelRequestSchema = {
  params: {
    type: "object",
    required: ["requestId"],
    properties: {
      requestId: { type: "string" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      additionalProperties: false,
    }),
    400: failureSchema,
    401: failureSchema,
    404: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const getFriendsSchema = {
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["friends"],
      properties: {
        friends: {
          type: "array",
          items: friendSchema,
        },
      },
    }),
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const getRequestsSchema = {
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["requests"],
      properties: {
        requests: {
          type: "array",
          items: friendRequestSchema,
        },
      },
    }),
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const removeFriendSchema = {
  params: {
    type: "object",
    required: ["friendId"],
    properties: {
      friendId: { type: "string" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      additionalProperties: false,
    }),
    400: failureSchema,
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const getRelationshipSchema = {
  params: {
    type: "object",
    required: ["targetUserId"],
    properties: {
      targetUserId: { type: "string" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["relationship"],
      properties: {
        relationship: {
          type: "string",
          enum: ["self", "friends", "request_sent", "request_received", "none"],
        },
      },
    }),
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const searchUsersSchema = {
  querystring: {
    type: "object",
    required: ["q"],
    properties: {
      q: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["users"],
      properties: {
        users: {
          type: "array",
          items: userSchema,
        },
      },
    }),
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

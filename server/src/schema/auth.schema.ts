import {
  createApiFailureSchema,
  createApiSuccessSchema,
} from "../utils/response.js";

const registerSuccessDataSchema = {
  type: "object",
  required: ["user"],
  properties: {
    user: {
      type: "object",
      required: ["id", "email"],
      properties: {
        id: { type: "string" },
        email: { type: "string", format: "email" },
      },
    },
  },
};

const authFailureSchema = createApiFailureSchema();
const authDbFailureResponses = {
  500: authFailureSchema,
};
const authRateLimitResponses = {
  429: authFailureSchema,
};
const emptySuccessDataSchema = {
  type: "object",
  additionalProperties: false,
};

const meSuccessDataSchema = {
  type: "object",
  required: ["user"],
  properties: {
    user: {
      type: "object",
      required: ["userId", "email"],
      properties: {
        userId: { type: "string" },
        email: { type: "string", format: "email" },
      },
    },
  },
};

export const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password", "name"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
      name: { type: "string" },
    },
  },
  response: {
    201: createApiSuccessSchema(registerSuccessDataSchema),
    409: authFailureSchema,
    ...authRateLimitResponses,
    ...authDbFailureResponses,
  },
};

export const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
    },
  },
  response: {
    200: createApiSuccessSchema(registerSuccessDataSchema),
    401: authFailureSchema,
    ...authRateLimitResponses,
    ...authDbFailureResponses,
  },
};

export const refreshSchema = {
  response: {
    200: createApiSuccessSchema(emptySuccessDataSchema),
    401: authFailureSchema,
    ...authRateLimitResponses,
    ...authDbFailureResponses,
  },
};

export const logoutSchema = {
  response: {
    200: createApiSuccessSchema(emptySuccessDataSchema),
    ...authRateLimitResponses,
    ...authDbFailureResponses,
  },
};

export const meSchema = {
  response: {
    200: createApiSuccessSchema(meSuccessDataSchema),
    401: authFailureSchema,
  },
};

import {
  createApiFailureSchema,
  createApiSuccessSchema,
} from "../utils/response.js";

const terminalAuthSuccessDataSchema = {
  type: "object",
  required: ["token"],
  properties: {
    token: { type: "string" },
  },
};

const terminalAuthFailureSchema = createApiFailureSchema();

const terminalAuthRateLimitResponse = {
  429: terminalAuthFailureSchema,
};

export const terminalAuthSchema = {
  body: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: { type: "string", minLength: 1 },
      password: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  },
  response: {
    200: createApiSuccessSchema(terminalAuthSuccessDataSchema),
    401: terminalAuthFailureSchema,
    500: terminalAuthFailureSchema,
    ...terminalAuthRateLimitResponse,
  },
};

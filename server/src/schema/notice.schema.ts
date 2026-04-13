import {
  createApiFailureSchema,
  createApiSuccessSchema,
} from "../utils/response.js";

const failureSchema = createApiFailureSchema();

const authorSchema = {
  type: "object",
  required: ["id", "name", "email"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
  },
};

const noticeSchema = {
  type: "object",
  required: ["id", "content", "createdAt", "author"],
  properties: {
    id: { type: "string" },
    content: { type: "string" },
    createdAt: { type: "string" },
    author: authorSchema,
  },
};

export const postNoticeSchema = {
  body: {
    type: "object",
    required: ["content"],
    properties: {
      content: { type: "string" },
    },
  },
  response: {
    201: createApiSuccessSchema({
      type: "object",
      required: ["notice"],
      properties: {
        notice: noticeSchema,
      },
    }),
    400: failureSchema,
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const getNoticesSchema = {
  querystring: {
    type: "object",
    properties: {
      cursor: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 50 },
      authorId: { type: "string" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      required: ["notices"],
      properties: {
        notices: {
          type: "array",
          items: noticeSchema,
        },
        nextCursor: { type: ["string", "null"] },
      },
    }),
    401: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

export const deleteNoticeSchema = {
  params: {
    type: "object",
    required: ["noticeId"],
    properties: {
      noticeId: { type: "string" },
    },
  },
  response: {
    200: createApiSuccessSchema({
      type: "object",
      additionalProperties: false,
    }),
    401: failureSchema,
    403: failureSchema,
    404: failureSchema,
    429: failureSchema,
    500: failureSchema,
  },
};

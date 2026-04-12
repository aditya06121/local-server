import { FastifyInstance } from "fastify";
import {
  terminalAuthHandler,
  terminalWsHandler,
} from "../controllers/terminal.controller.js";
import { terminalAuthSchema } from "../schema/terminal.schema.js";

// Aggressive rate limit: only 5 OS auth attempts per IP per minute.
const terminalAuthRateLimit = {
  max: 5,
  timeWindow: "1 minute",
};

export default async function terminalRoutes(app: FastifyInstance) {
  app.post(
    "/auth",
    {
      schema: terminalAuthSchema,
      config: { rateLimit: terminalAuthRateLimit },
    },
    terminalAuthHandler,
  );

  app.get(
    "/ws",
    { websocket: true },
    terminalWsHandler,
  );
}

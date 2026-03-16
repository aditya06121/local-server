import Fastify from "fastify";

export function buildApp() {
  const app = Fastify();

  app.get("/api/dice", async () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    return { roll };
  });

  return app;
}

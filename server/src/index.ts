import app from "./app.js";
import "dotenv/config";
import dbConnect from "./db.js";
import { loadModules } from "./loadModules.js";

const start = async () => {
  try {
    await dbConnect();
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server running on port 3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

import app from "./app.js";
import "dotenv/config";
import dbConnect from "./db.js";

const start = async () => {
  try {
    await dbConnect();
    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });
    console.log("Server running");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

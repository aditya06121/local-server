import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.json({ message: "backend running on pi zero" });
});

app.get("/health", (req, res) => {
  res.send("ok");
});

export default app;

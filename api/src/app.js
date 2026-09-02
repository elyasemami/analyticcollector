// api/src/app.js
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const staticRoutes = require("./routes/static");
const perfRoutes = require("./routes/perf");
const activityRoutes = require("./routes/activity");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1);

app.use(express.json({ limit: "16kb" }));

var corsOptions = {
  origin: "https://eemami.dev",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use((req, _res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api", healthRoutes);
app.use("/api/static", staticRoutes);
app.use("/api/perf", perfRoutes);
app.use("/api/activity", activityRoutes);
app.use(errorHandler);

module.exports = app;

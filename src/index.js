const express = require("express");

const eventRoutes = require("./routes/events");
const registrationRoutes = require("./routes/registrations");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to EventFlow API",
  });
});

app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Centralized error handler
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`EventFlow API is running on http://localhost:${PORT}`);
  });
}

module.exports = app;

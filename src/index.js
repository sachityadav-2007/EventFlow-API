const express = require("express");

const eventRoutes = require("./routes/events");
const registrationRoutes = require("./routes/registrations");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = 3000;
app.use(express.json());


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to EventFlow API",
  });
});


app.use("/api/events", eventRoutes);


app.use("/api/registrations", registrationRoutes);


app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`EventFlow API is running on http://localhost:${PORT}`);
});
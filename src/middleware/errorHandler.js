// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  // Handle malformed JSON body errors from express.json()
  if (
    err.type === "entity.parse.failed" ||
    (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload in request body",
    });
  }

  // Determine appropriate HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Protect internal details: do not leak stack traces or internal errors to clients
  const message =
    statusCode === 500
      ? "Internal server error"
      : (err.message || "An error occurred");

  res.status(statusCode).json({
    success: false,
    message: message,
  });
};

module.exports = errorHandler;

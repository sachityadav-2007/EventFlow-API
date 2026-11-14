const errorHandler = (err, req, res, next) => {
  console.log(err.message);

  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};

module.exports = errorHandler;
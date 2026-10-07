function errorHandler(err, req, res, next) {
  console.error(err.stack);

  let status = err.status || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  }

  if (err.code === 11000) {
    status = 409;
    message = "A record with that value already exists";
  }

  res.status(status).json({
    success: false,
    message,
    data: null,
  });
}

module.exports = errorHandler;

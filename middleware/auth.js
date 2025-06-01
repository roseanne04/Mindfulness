const jwt = require("jsonwebtoken")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      error: "Access token required",
      message: "Please provide a valid authentication token",
    })
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production", (err, user) => {
    if (err) {
      return res.status(403).json({
        error: "Invalid token",
        message: "The provided token is invalid or expired",
      })
    }
    req.user = user
    next()
  })
}

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production", (err, user) => {
      if (!err) {
        req.user = user
      }
    })
  }
  next()
}

module.exports = {
  authenticateToken,
  optionalAuth,
}

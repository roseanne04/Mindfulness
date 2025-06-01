const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePassword = (password) => {
  return password && password.length >= 6
}

const validateRequired = (fields, body) => {
  const missing = []
  fields.forEach((field) => {
    if (!body[field] || (typeof body[field] === "string" && body[field].trim() === "")) {
      missing.push(field)
    }
  })
  return missing
}

const sanitizeInput = (input) => {
  if (typeof input !== "string") return input
  return input.trim().replace(/[<>]/g, "")
}

module.exports = {
  validateEmail,
  validatePassword,
  validateRequired,
  sanitizeInput,
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  // At least 6 characters — adjust rules as your team agrees
  return typeof password === "string" && password.length >= 6;
}

module.exports = { isValidEmail, isStrongPassword };

import jwt from "jsonwebtoken";

export function generateToken(user) {
  return jwt.sign(
    { user_id: user.user_id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[cC][oO][mM]$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  return {
    isValid: password.length >= 6 && passwordRegex.test(password),
    message: "Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number"
  };
}

export function validateName(name) {
  const trimmedName = name.trim();
  return {
    isValid: trimmedName.length >= 2 && trimmedName.length <= 50,
    message: "Name must be between 2 and 50 characters long",
    value: trimmedName
  };
}
export function validatePassword(password: string): boolean {
  // Password must be at least 8 characters long
  if (password.length < 8) return false;

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(password)) return false;

  // Must contain at least one number
  if (!/\d/.test(password)) return false;

  // Must contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

  return true;
}
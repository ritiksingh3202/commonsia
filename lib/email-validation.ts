/** Same rule as `/api/auth/register` — adequate for UX checks before submit. */
export function isValidEmailAddress(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

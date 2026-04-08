/**
 * OAuth client env resolution — classic names first, Auth.js `AUTH_*` as fallback.
 * Use everywhere Google/LinkedIn client id+secret are read (auth + calendar).
 */
export function getGoogleOAuthClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

export function getLinkedInOAuthClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? process.env.AUTH_LINKEDIN_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? process.env.AUTH_LINKEDIN_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

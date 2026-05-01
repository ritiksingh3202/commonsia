/** Maps Auth.js `error` query values to short user-facing copy. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "That email is already registered with a different sign-in method. Use email/password or the same social provider you used before.";
    case "MissingCSRF":
      return "Your session token expired. Refresh this page and try signing in again.";
    case "Configuration":
      return "Sign-in could not finish due to server configuration. Check the terminal running next dev for the real error. Common causes: database schema out of date (run npx prisma db push after pulling code — missing User columns break OAuth), Postgres rejected the connection (wrong DATABASE_URL or pooler user postgres.<project-ref>), PrismaAdapter errors, missing AUTH_SECRET in production, or AUTH_URL not matching the site you opened. Run npm run db:ping to verify DB credentials.";
    case "CredentialsSignin":
      return "That email or password didn't match our records. Check for typos, or sign in with Google / LinkedIn if you registered that way. New here? Create an account first.";
    case "AccessDenied":
      return "Sign-in was denied.";
    case "Verification":
      return "The sign-in link could not be verified. Request a new one.";
    case "CallbackRouteError":
      return "The sign-in response from the provider was incomplete. Close extra tabs, refresh, and try again.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Could not complete sign-in with the provider. Try again in a moment.";
    default:
      return "Something went wrong during sign-in. Try again or use a different method.";
  }
}

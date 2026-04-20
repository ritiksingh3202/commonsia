/** Maps Auth.js `error` query values to short user-facing copy. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "That email is already registered with a different sign-in method. Use email/password or the same social provider you used before.";
    case "MissingCSRF":
      return "Your session token expired. Refresh this page and try signing in again.";
    case "Configuration":
      return "Sign-in could not finish because the app server could not use your database (invalid Postgres password or wrong pooler username). Google and LinkedIn sign-in need a working database connection. Fix DATABASE_URL in .env, then run npm run db:ping to verify. Email/password sign-in needs the same fix.";
    case "CredentialsSignin":
      return "Invalid email or password. If you have not signed up yet, create an account first. If you use Google or LinkedIn, sign in with that option below.";
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

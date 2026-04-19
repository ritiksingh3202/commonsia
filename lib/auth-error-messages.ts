/** Maps Auth.js `error` query values to short user-facing copy. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "That email is already registered with a different sign-in method. Use email/password or the same social provider you used before.";
    case "MissingCSRF":
      return "Your session token expired. Refresh this page and try signing in again.";
    case "Configuration":
      return "We could not start a secure sign-in session. Please try again in a moment. You can also open the sign-in page and use email and password if you registered that way.";
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { authErrorMessage } from "@/lib/auth-error-messages";
import { isValidEmailAddress } from "@/lib/email-validation";
import { AUTH_ASSETS } from "./auth-assets";
import { LegalConsentLinks } from "@/components/legal/LegalConsentLinks";
import { AuthBackLink } from "./AuthBackLink";
import { AuthSocialRow } from "./AuthSocialRow";

/** `text-base` on mobile prevents iOS Safari viewport zoom on focus (needs >=16px). Shrinks to 13px on sm+. */
const field =
  "w-full rounded-md border border-[#e5e5e5] bg-white px-2.5 py-2 text-base text-[#0a0a0a] placeholder:text-[#717182] outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-[1.5px] focus:ring-primary/20 sm:text-[13px]";

type LoginFormProps = {
  /** Post-login URL (typically `/auth/continue` or `/auth/continue?next=…` from the login page). */
  callbackUrl?: string;
  /** Auth.js error code from ?error= when redirected from OAuth or sign-in. */
  authError?: string;
};

export function LoginForm({ callbackUrl = "/auth/continue", authError }: LoginFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-[360px] px-4 py-6 sm:py-8">
      <div className="mb-4">
        <AuthBackLink href="/auth" />
      </div>

      <div className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
        {authError ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-[12px] leading-snug text-amber-950 sm:text-[13px]"
          >
            {authErrorMessage(authError)}
          </div>
        ) : null}
        {credsError ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-left text-[12px] leading-snug text-red-950 sm:text-[13px]"
          >
            {credsError}
          </div>
        ) : null}
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Image
              src={AUTH_ASSETS.user}
              alt=""
              width={28}
              height={28}
              sizes="28px"
              className="icon-brand-line size-7 object-contain"
            />
          </div>
          <h1 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
            User Login
          </h1>
          <p className="mt-1.5 max-w-[260px] text-[13px] leading-snug text-[#717182]">
            Welcome back! Sign in to your account.
          </p>
        </div>

        <form
          className="space-y-3"
          suppressHydrationWarning
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const email = String(fd.get("email") ?? "").trim();
            const password = String(fd.get("password") ?? "");
            if (!email || !password) {
              setCredsError("Enter your email and password.");
              return;
            }
            if (!isValidEmailAddress(email)) {
              setCredsError("Enter a valid email address.");
              return;
            }
            setCredsError(null);
            setSubmitting(true);
            try {
              // `redirect: false` is unsafe here: next-auth parses `data.url` with `new URL(data.url)`
              // which throws when the server returns a relative callback URL (common for credentials).
              await signIn("credentials", {
                email: email.toLowerCase(),
                password,
                callbackUrl,
                redirect: true,
              });
            } catch {
              setCredsError(
                "Could not sign in. Check your connection, refresh the page, and try again.",
              );
              setSubmitting(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-[13px] font-medium text-[#0a0a0a]">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={field}
              required
              suppressHydrationWarning
              onFocus={() => setCredsError(null)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-[13px] font-medium text-[#0a0a0a]">
                Password
              </label>
              <button
                type="button"
                className="text-[12px] font-medium text-primary hover:underline sm:text-[13px]"
                onClick={() =>
                  window.alert(
                    "Password reset is not set up yet. If you signed up with Google or LinkedIn, use that option below.",
                  )
                }
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className={field}
              required
              suppressHydrationWarning
              onFocus={() => setCredsError(null)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            suppressHydrationWarning
            className="mt-1 w-full rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 sm:text-sm"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-4">
          <AuthSocialRow callbackUrl={callbackUrl} />
        </div>

        <LegalConsentLinks />

        <p className="mt-4 text-center text-[13px] text-[#717182]">
          Don&apos;t have an account?{" "}
          <Link href="/auth" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

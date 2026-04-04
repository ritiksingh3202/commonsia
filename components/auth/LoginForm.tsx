"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUTH_ASSETS } from "./auth-assets";
import { AuthBackLink } from "./AuthBackLink";
import { AuthSocialRow } from "./AuthSocialRow";

const field =
  "w-full rounded-md border border-[#e5e5e5] bg-white px-2.5 py-2 text-[13px] text-[#0a0a0a] placeholder:text-[#717182] outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-[1.5px] focus:ring-primary/20";

type LoginFormProps = {
  /** Safe post-login redirect (must be a same-origin path). */
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl = "/" }: LoginFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[360px] px-4 py-6 sm:py-8">
      <div className="mb-4">
        <AuthBackLink href="/auth" />
      </div>

      <div className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Image
              src={AUTH_ASSETS.user}
              alt=""
              width={28}
              height={28}
              className="size-7 object-contain"
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
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const email = String(fd.get("email") ?? "").trim();
            const password = String(fd.get("password") ?? "");
            if (!email || !password) {
              window.alert("Enter your email and password.");
              return;
            }
            setSubmitting(true);
            try {
              const res = await signIn("credentials", {
                email: email.toLowerCase(),
                password,
                redirect: false,
              });
              if (res?.error) {
                window.alert("Invalid email or password. If you signed up with Google or LinkedIn, use that button below.");
                return;
              }
              router.push(callbackUrl);
              router.refresh();
            } finally {
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
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-[13px] font-medium text-[#0a0a0a]">
                Password
              </label>
              <Link
                href="#"
                className="text-[12px] font-medium text-primary hover:underline sm:text-[13px]"
                onClick={(ev) => ev.preventDefault()}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className={field}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 sm:text-sm"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-4">
          <AuthSocialRow callbackUrl={callbackUrl} />
        </div>

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

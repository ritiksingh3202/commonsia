"use client";

import Link from "next/link";

type Props = {
  editProfileHref: string;
  triggerClassName: string;
};

/** Pencil on own profile hero — navigates to the full edit profile flow. */
export function ProfileHeroEditMenuButton({ editProfileHref, triggerClassName }: Props) {
  return (
    <Link href={editProfileHref} aria-label="Edit profile" className={triggerClassName}>
      <PencilIcon className="size-[18px]" />
    </Link>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

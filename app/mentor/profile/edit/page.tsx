import Link from "next/link";

export default function MentorProfileEditPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-[#0a0a0a]">Profile editing is coming soon.</p>
      <Link
        href="/mentor"
        className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

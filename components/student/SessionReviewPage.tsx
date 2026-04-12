"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const REVIEW_TAGS = [
  "Very Helpful",
  "Great Communicator",
  "Inspiring",
  "Patient",
  "Knowledgeable",
  "Well Prepared",
  "Gave Practical Advice",
  "Career Guidance",
  "Portfolio Feedback",
  "Technical Skills",
] as const;

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-[#0a0a0a] shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

export type SessionReviewProps = {
  mentorUserId: string;
  mentorName: string;
  mentorSubtitle: string;
  mentorInitials: string;
  sessionType: string;
  durationMinutes: number;
  dateDisplay: string;
  bookNextHref: string;
};

export function SessionReviewPage({
  mentorUserId,
  mentorName,
  mentorSubtitle,
  mentorInitials,
  sessionType,
  durationMinutes,
  dateDisplay,
  bookNextHref,
}: SessionReviewProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratingError, setRatingError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeStars = hoveredRating || rating;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    if (rating === 0) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    setSubmitError(null);
    try {
      const res = await fetch("/api/session-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorUserId,
          mentorName,
          sessionType,
          durationMinutes,
          dateDisplay,
          rating,
          tags: selectedTags,
          comment: review.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not save your review. Please try again.");
        return;
      }
    } catch {
      setSubmitError("Could not save your review. Please try again.");
      return;
    }
    setSuccess(true);
    window.setTimeout(() => router.push("/student"), 900);
  };

  const skip = () => {
    router.push("/student");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/30 to-white pb-16">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex justify-end">
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 transition hover:text-primary"
          >
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>

        {success ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
            Thank you for your feedback! Redirecting…
          </p>
        ) : null}
        {submitError ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-900">
            {submitError}
          </p>
        ) : null}

        <div className="rounded-2xl border-2 border-neutral-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="pb-6 text-center">
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-100">
              <IconCheck className="size-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#0a0a0a]">Session Completed!</h1>
            <p className="mt-2 text-base text-neutral-600">How was your session with {mentorName}?</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-neutral-50 p-4">
              <div className="mb-3 flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {mentorInitials}
                </div>
                <div className="min-w-0 text-left">
                  <h2 className="text-lg font-semibold text-[#0a0a0a]">{mentorName}</h2>
                  <p className="text-sm text-neutral-600">{mentorSubtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 border-t border-neutral-200/80 pt-3 text-center text-sm sm:grid-cols-3 sm:gap-4">
                <div>
                  <p className="text-neutral-500">Session Type</p>
                  <p className="font-medium text-[#0a0a0a]">{sessionType}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Duration</p>
                  <p className="font-medium text-[#0a0a0a]">{durationMinutes} minutes</p>
                </div>
                <div>
                  <p className="text-neutral-500">Date</p>
                  <p className="font-medium text-[#0a0a0a]">{dateDisplay}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-[#0a0a0a]">Rate Your Experience</label>
              <div className="flex justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRating(star);
                      setRatingError(false);
                    }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    <IconStar filled={star <= activeStars} className="size-10 sm:size-12" />
                  </button>
                ))}
              </div>
              {ratingError ? (
                <p className="text-center text-sm text-red-600">Please provide a rating</p>
              ) : null}
              {rating > 0 ? (
                <p className="text-center text-sm text-neutral-600">
                  {rating === 1 && "We're sorry to hear that. Please share your concerns below."}
                  {rating === 2 && "Thank you for your feedback. How can we improve?"}
                  {rating === 3 && "Good! Tell us more about your experience."}
                  {rating === 4 && "Great! We'd love to hear what went well."}
                  {rating === 5 && "Excellent! We're thrilled you had a great session!"}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-[#0a0a0a]">
                What did you like? <span className="font-normal text-neutral-500">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                      selectedTags.includes(tag)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-neutral-300 text-[#0a0a0a] hover:border-neutral-400"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-[#0a0a0a]">
                Share Your Experience <span className="font-normal text-neutral-500">(Optional)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={5}
                placeholder="Tell us about your session... What did you learn? How did your mentor help you?"
                className={`${field} min-h-[8rem] resize-y`}
              />
              <p className="text-xs text-neutral-500">
                Your feedback helps us improve and helps other students find the right mentor.
              </p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-950">
                <span aria-hidden>💡</span>
                Your Review Matters
              </h3>
              <ul className="space-y-1 text-sm text-sky-900/90">
                <li>• Helps other students choose the right mentor</li>
                <li>• Provides valuable feedback to mentors</li>
                <li>• Improves the overall mentorship experience</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={skip}
                className="flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={success}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-primary/10 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-[#0a0a0a]">Want to continue with {mentorName}?</h3>
              <p className="mt-1 text-sm text-neutral-600">
                Book your next session and keep the momentum going!
              </p>
            </div>
            <Link
              href={bookNextHref}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Book Next Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar({ className, filled }: { className?: string; filled: boolean }) {
  return (
    <svg
      className={`${className ?? ""} ${filled ? "text-primary" : "text-neutral-300"}`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

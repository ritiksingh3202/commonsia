"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { compressImageToDataUrl } from "@/lib/resize-image-client";

type Props = {
  /** After successful save — update local state before refresh */
  onUploaded?: (imageDataUrl: string) => void;
  className?: string;
  iconClassName?: string;
};

export function ProfileAvatarPhotoButton({ onUploaded, className, iconClassName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/")) return;
      setBusy(true);
      try {
        const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, quality: 0.88 });
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        if (!res.ok) throw new Error("Could not save photo.");
        onUploaded?.(dataUrl);
        router.refresh();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setBusy(false);
      }
    },
    [onUploaded, router],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(ev) => void onChange(ev)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={className}
        aria-label="Change profile photo"
        title="Change profile photo"
      >
        {busy ? (
          <span className="size-[18px] animate-pulse rounded-full bg-primary/50" aria-hidden />
        ) : (
          <PencilIcon className={iconClassName ?? "size-[18px]"} />
        )}
      </button>
    </>
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

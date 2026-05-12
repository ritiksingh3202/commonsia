"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCroppedAvatarDataUrl } from "@/lib/crop-cover-client";
import { resolveUrlForCanvasCrop } from "@/lib/resolve-crop-image-url";

type Props = {
  /** Current profile image URL (http(s), data URL, or blob). Omit or null if no photo yet. */
  currentImageSrc?: string | null;
  /** After successful save — update local state before refresh */
  onUploaded?: (imageDataUrl: string) => void;
  className?: string;
  iconClassName?: string;
};

export function ProfileAvatarPhotoButton({
  currentImageSrc,
  onUploaded,
  className,
  iconClassName,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const revokeImage = useCallback(() => {
    setImageSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => revokeImage();
  }, [revokeImage]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    revokeImage();
  }, [revokeImage]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, busy, closeModal]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const onCropComplete = useCallback((_a: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const saveCroppedToProfile = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const dataUrl = await getCroppedAvatarDataUrl(imageSrc, croppedAreaPixels);
      // Convert the canvas data URL to a binary blob and upload to Supabase Storage.
      // The server writes the resulting CDN URL back to User.image — no base64 in Postgres.
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const fd = new FormData();
      fd.set("file", blob, "avatar.jpg");
      const res = await fetch("/api/profile/upload-image?type=avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save photo.");
      }
      const { url } = (await res.json()) as { url: string };
      onUploaded?.(url);
      closeModal();
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    setMenuOpen(false);
    revokeImage();
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setModalOpen(true);
  };

  const openEditCurrent = async () => {
    const src = currentImageSrc?.trim();
    if (!src) {
      window.alert("Add a profile photo first.");
      setMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    setBusy(true);
    try {
      revokeImage();
      const url = await resolveUrlForCanvasCrop(src);
      setImageSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setModalOpen(true);
    } catch {
      window.alert("Could not load your current photo for editing. Try Add new.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />
      <div ref={menuRef} className={className}>
        <button
          type="button"
          disabled={busy}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex size-full items-center justify-center"
          aria-label="Profile photo options"
          title="Profile photo options"
        >
          {busy ? (
            <span className="size-[18px] animate-pulse rounded-full bg-primary/50" aria-hidden />
          ) : (
            <PencilIcon className={iconClassName ?? "size-[18px]"} />
          )}
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1.5 min-w-[9.5rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-lg ring-1 ring-black/5"
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-[#0a0a0a] transition hover:bg-black/[0.04]"
              onClick={() => inputRef.current?.click()}
            >
              Add new
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!currentImageSrc?.trim()}
              className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-[#0a0a0a] transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
              title={!currentImageSrc?.trim() ? "Add a photo first" : undefined}
              onClick={() => void openEditCurrent()}
            >
              Edit
            </button>
          </div>
        ) : null}
      </div>

      {modalOpen && imageSrc ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
        >
          <div className="flex max-h-[min(92vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
            <div className="border-b border-black/5 px-4 py-3 sm:px-5">
              <h2 id="avatar-crop-title" className="text-base font-semibold text-[#0a0a0a]">
                Adjust profile photo
              </h2>
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                Drag and zoom, then save. The photo appears as a circle on your profile.
              </p>
            </div>
            <div className="relative aspect-square w-full min-h-[220px] bg-neutral-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={0}
                aspect={1}
                cropShape="round"
                minZoom={0.5}
                maxZoom={3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
                objectFit="cover"
              />
            </div>
            <div className="space-y-3 border-t border-black/5 px-4 py-3 sm:px-5">
              <label className="flex items-center gap-3 text-[13px] text-[#374151]">
                <span className="shrink-0 font-medium">Zoom</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-2 w-full accent-primary"
                />
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
                  className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0a0a0a] transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveCroppedToProfile()}
                  disabled={busy || !croppedAreaPixels}
                  className="rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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

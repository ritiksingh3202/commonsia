"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProfileCover } from "@/components/ProfileCover";
import { getCroppedCoverDataUrl } from "@/lib/crop-cover-client";
import { resolveUrlForCanvasCrop } from "@/lib/resolve-crop-image-url";
import {
  PROFILE_COVER_ASPECT_RATIO,
  profileCoverAspectStyle,
  profileCoverDisplaySrc,
} from "@/lib/profile-cover";

type Props = {
  bannerImageUrl: string | null;
  onSave: (dataUrl: string) => Promise<void>;
};

export function ProfileCoverStrip({ bannerImageUrl, onSave }: Props) {
  const displaySrc = profileCoverDisplaySrc(bannerImageUrl);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const openEditCurrentCrop = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      revokeImage();
      const url = await resolveUrlForCanvasCrop(displaySrc);
      setImageSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setModalOpen(true);
    } catch {
      window.alert("Could not load the current cover for editing. Try Add new.");
    } finally {
      setBusy(false);
    }
  };

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const dataUrl = await getCroppedCoverDataUrl(imageSrc, croppedAreaPixels);
      await onSave(dataUrl);
      closeModal();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not process cover image.");
    } finally {
      setBusy(false);
    }
  };

  const cropStageStyle = profileCoverAspectStyle();

  return (
    <>
      <ProfileCover imageSrc={displaySrc} alt="" priority stripBottomShade>
        <div ref={menuRef} className="absolute bottom-4 right-4 z-[25] sm:bottom-5 sm:right-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white/95 px-3 py-2 text-[12px] font-medium text-[#0a0a0a] shadow-lg backdrop-blur-sm transition hover:bg-white disabled:opacity-60 sm:px-3.5"
            aria-label="Cover photo options"
          >
            {busy ? (
              <span className="size-4 animate-pulse rounded-full bg-primary/60" />
            ) : (
              <PencilIcon className="size-[15px] sm:size-4" />
            )}
            <span className="hidden sm:inline">Cover</span>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 bottom-full z-[30] mb-1.5 min-w-[10rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-xl ring-1 ring-black/5"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-[#0a0a0a] transition hover:bg-black/[0.04]"
                onClick={() => fileRef.current?.click()}
              >
                Add new
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-[#0a0a0a] transition hover:bg-black/[0.04] disabled:opacity-50"
                onClick={() => void openEditCurrentCrop()}
              >
                Edit
              </button>
            </div>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onPickFile}
        />
      </ProfileCover>

      {modalOpen && imageSrc ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cover-crop-title"
        >
          <div className="flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl sm:max-w-xl">
            <div className="border-b border-black/5 px-4 py-3 sm:px-5">
              <h2 id="cover-crop-title" className="text-base font-semibold text-[#0a0a0a]">
                Adjust cover
              </h2>
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                Wide banner — same framing as your profile. Drag, zoom, then save.
              </p>
            </div>
            <div className="relative w-full min-h-[180px] bg-neutral-900" style={cropStageStyle}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={0}
                aspect={PROFILE_COVER_ASPECT_RATIO}
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
                  onClick={() => void applyCrop()}
                  disabled={busy || !croppedAreaPixels}
                  className="rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save cover"}
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

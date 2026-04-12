/** WhatsApp-style: "Ritik Raj" → "RR"; one word → first two letters. */
export function initialsFromDisplayName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : `${w[0] ?? "?"}`.toUpperCase();
  }
  const a = parts[0][0] ?? "";
  const b = parts[parts.length - 1][0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function hashToIndex(seed: string, len: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % len;
}

/** Light wash backgrounds + readable foreground (WhatsApp-like). */
const AVATAR_PAIRS: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "#E3F2FD", fg: "#1565C0" },
  { bg: "#E8F5E9", fg: "#2E7D32" },
  { bg: "#FFF3E0", fg: "#E65100" },
  { bg: "#F3E5F5", fg: "#6A1B9A" },
  { bg: "#E0F7FA", fg: "#006064" },
  { bg: "#FBE9E7", fg: "#BF360C" },
  { bg: "#E8EAF6", fg: "#283593" },
  { bg: "#FFF8E1", fg: "#F57F17" },
  { bg: "#E0F2F1", fg: "#004D40" },
  { bg: "#F1F8E9", fg: "#33691E" },
  { bg: "#EDE7F6", fg: "#4527A0" },
  { bg: "#FFEBEE", fg: "#C62828" },
  { bg: "#E1F5FE", fg: "#0277BD" },
  { bg: "#F9FBE7", fg: "#827717" },
];

export function avatarColorsFromSeed(seed: string): { bg: string; fg: string } {
  const i = hashToIndex(seed || "user", AVATAR_PAIRS.length);
  return AVATAR_PAIRS[i] ?? AVATAR_PAIRS[0];
}

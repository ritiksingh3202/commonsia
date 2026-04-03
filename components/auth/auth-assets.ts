/** `public/auth_assets/` — student & mentor role icons, generic user (login) */
export const AUTH_ASSETS = {
  student: "/auth_assets/student_icon.svg",
  mentor: "/auth_assets/mentor_icon.svg",
  user: "/auth_assets/user.svg",
} as const;

export type AuthRole = "student" | "mentor";

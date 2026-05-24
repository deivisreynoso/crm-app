import { redirect } from "next/navigation";

/** Legacy path — password reset UI lives at /reset-password */
export default function LegacyResetPasswordRedirect() {
  redirect("/reset-password");
}

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  detectLocale,
  isLocale,
  type Locale,
} from "@/lib/website/i18n";
import { LOCALE_COOKIE } from "@/lib/website/locale-cookie";

export default async function RootPage() {
  const cookieStore = await cookies();
  const saved = cookieStore.get(LOCALE_COOKIE)?.value;
  let locale: Locale;
  if (saved && isLocale(saved)) {
    locale = saved;
  } else {
    const h = await headers();
    locale = detectLocale(h.get("accept-language"));
  }
  redirect(`/${locale}`);
}

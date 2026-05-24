import Image from "next/image";
import Link from "next/link";
import type { Locale, WebsiteDictionary } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  dict: WebsiteDictionary;
};

export function WebsiteFooter({ lang, dict }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0f1754] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          <div className="space-y-4 max-w-sm">
            <Image
              src="/brand/logo-dark.png"
              alt="ClickIn 360"
              width={160}
              height={42}
              className="h-9 w-auto"
            />
            <p className="text-sm text-white/75 leading-relaxed">{dict.footer.tagline}</p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href={`/${lang}/how-it-works`} className="text-white/80 hover:text-white transition-colors">
              {dict.footer.howItWorks}
            </Link>
            <Link href={`/${lang}/offers`} className="text-white/80 hover:text-white transition-colors">
              {dict.nav.offers}
            </Link>
            <Link href={`/${lang}/about`} className="text-white/80 hover:text-white transition-colors">
              {dict.nav.about}
            </Link>
            <Link href={`/${lang}/contact`} className="text-white/80 hover:text-white transition-colors">
              {dict.footer.contact}
            </Link>
            <a href={`/${lang}#faq`} className="text-white/80 hover:text-white transition-colors">
              {dict.nav.faq}
            </a>
            <Link href={`/${lang}/book-call`} className="text-white/80 hover:text-white transition-colors">
              {dict.nav.book}
            </Link>
            <Link href="/login" className="text-white/80 hover:text-white transition-colors">
              {dict.footer.login}
            </Link>
          </nav>
        </div>

        <div className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/55">
          <p>
            © {year} ClickIn 360 LLC. {dict.footer.rights}
          </p>
          <Link href={`/${lang}#faq`} className="hover:text-white/80">
            {dict.footer.privacy}
          </Link>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/website/language-toggle";
import { WebsiteMobileNav } from "@/components/website/website-mobile-nav";
import type { Locale, WebsiteDictionary } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  dict: WebsiteDictionary;
};

type NavItem = {
  href: string;
  key: keyof WebsiteDictionary["nav"];
  anchor?: boolean;
};

const navItems: NavItem[] = [
  { href: "#problem", key: "problem", anchor: true },
  { href: "/how-it-works", key: "solution" },
  { href: "/offers", key: "offers" },
  { href: "#platforms", key: "platforms", anchor: true },
  { href: "/about", key: "about" },
  { href: "#faq", key: "faq", anchor: true },
];

function navHref(item: NavItem, lang: Locale, onHome: boolean) {
  if (item.anchor && onHome) return item.href;
  if (item.anchor) return `/${lang}${item.href}`;
  return `/${lang}${item.href}`;
}

export function WebsiteHeader({ lang, dict }: Props) {
  const pathname = usePathname();
  const onHome = pathname === `/${lang}` || pathname === `/${lang}/`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--card-border)]/80 bg-white/90 dark:bg-[var(--header)] backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-[4.5rem] flex items-center gap-4">
          <Link
            href={`/${lang}`}
            className="flex items-center shrink-0 min-w-[120px] sm:min-w-[150px]"
          >
            <Image
              src="/brand/logo-light.png"
              alt="ClickIn 360"
              width={180}
              height={48}
              className="h-9 sm:h-10 w-auto dark:hidden"
              priority
            />
            <Image
              src="/brand/logo-dark.png"
              alt="ClickIn 360"
              width={180}
              height={48}
              className="h-9 sm:h-10 w-auto hidden dark:block"
              priority
            />
          </Link>

          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-1"
            aria-label="Principal"
          >
            {navItems.map((item) => (
              <a
                key={item.key}
                href={navHref(item, lang, onHome)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--sidebar-hover)] transition-colors"
              >
                {dict.nav[item.key]}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <LanguageToggle lang={lang} />
            <Link href="/login" className="hidden sm:block">
              <Button size="sm" variant="ghost" className="text-[var(--muted)] font-medium">
                {dict.nav.login}
              </Button>
            </Link>
            <Link href={`/${lang}/book-call`} className="hidden md:block">
              <Button size="sm" className="font-semibold shadow-sm px-5">
                {dict.nav.bookCta}
              </Button>
            </Link>
            <WebsiteMobileNav lang={lang} dict={dict} />
          </div>
        </div>
      </div>
    </header>
  );
}

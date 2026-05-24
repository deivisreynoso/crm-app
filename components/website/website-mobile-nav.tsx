"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/website/language-toggle";
import type { Locale, WebsiteDictionary } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  dict: WebsiteDictionary;
};

const navKeys = [
  { href: "#problem", key: "problem" as const, anchor: true },
  { href: "/how-it-works", key: "solution" as const },
  { href: "/offers", key: "offers" as const },
  { href: "#platforms", key: "platforms" as const, anchor: true },
  { href: "/about", key: "about" as const },
  { href: "#faq", key: "faq" as const, anchor: true },
];

export function WebsiteMobileNav({ lang, dict }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === `/${lang}` || pathname === `/${lang}/`;

  function hrefFor(item: (typeof navKeys)[number]) {
    if (item.anchor && onHome) return item.href;
    if (item.anchor) return `/${lang}${item.href}`;
    return `/${lang}${item.href}`;
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--card-border)] bg-[var(--card)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed top-[4.5rem] left-4 right-4 z-50 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)] p-4 flex flex-col gap-1">
            {navKeys.map((item) => (
              <a
                key={item.key}
                href={hrefFor(item)}
                className="px-4 py-3 rounded-xl text-base font-medium text-heading hover:bg-[var(--sidebar-hover)]"
                onClick={() => setOpen(false)}
              >
                {dict.nav[item.key]}
              </a>
            ))}
            <Link
              href={`/${lang}/book-call`}
              className="px-4 py-3 rounded-xl text-base font-medium text-[var(--secondary)]"
              onClick={() => setOpen(false)}
            >
              {dict.nav.book}
            </Link>
            <div className="flex items-center gap-3 pt-3 mt-2 border-t border-[var(--card-border)]">
              <LanguageToggle lang={lang} />
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">
                  {dict.nav.login}
                </Button>
              </Link>
              <Link href={`/${lang}/book-call`} className="flex-1" onClick={() => setOpen(false)}>
                <Button className="w-full">{dict.nav.bookCta}</Button>
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

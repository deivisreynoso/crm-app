"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAIN_NAV, SECONDARY_NAV } from "@/lib/navigation";
import { useTheme } from "@/components/dashboard/theme-provider";

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)] shadow-sm"
          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-[var(--sidebar-active-fg)]" : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--secondary)]"
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: typeof MAIN_NAV;
  pathname: string;
}) {
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-text-muted)]">
          {title}
        </p>
      )}
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive}
          />
        );
      })}
    </div>
  );
}

export function SidebarBrand() {
  const { theme, mounted } = useTheme();
  const src =
    mounted && theme === "dark"
      ? "/brand/logo-dark.png"
      : "/brand/logo-light.png";

  return (
    <Link href="/dashboard" className="flex items-center px-0.5 py-1 w-full">
      <Image
        src={src}
        alt="ClickIn"
        width={320}
        height={80}
        className="h-16 w-full max-w-[320px] object-contain object-left"
        priority
      />
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6" aria-label="Main navigation">
      <NavSection items={MAIN_NAV} pathname={pathname} />
      <NavSection title="Tools" items={SECONDARY_NAV} pathname={pathname} />
    </nav>
  );
}

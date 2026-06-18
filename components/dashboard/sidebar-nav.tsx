"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { MAIN_NAV, type NavIconAccent, type NavItem } from "@/lib/navigation";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

export const navIconAccentStyles: Record<
  NavIconAccent,
  { idle: string; active: string }
> = {
  navy: {
    idle: "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]",
    active: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  },
  sky: {
    idle: "bg-[color-mix(in_srgb,var(--secondary)_20%,transparent)] text-[var(--secondary)]",
    active: "bg-[var(--secondary)] text-[#0f1419]",
  },
  magenta: {
    idle: "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]",
    active: "bg-[var(--accent)] text-white",
  },
  success: {
    idle: "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]",
    active: "bg-[var(--success)] text-white",
  },
};

function NavLink({
  href,
  label,
  icon: Icon,
  iconAccent = "navy",
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconAccent?: NavIconAccent;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const accent = navIconAccentStyles[iconAccent];

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)] shadow-sm"
          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
          isActive ? accent.active : accent.idle
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  pathname,
  dict,
  onNavigate,
}: {
  title?: string;
  items: typeof MAIN_NAV;
  pathname: string;
  dict: Record<string, string>;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-text-muted)]">
          {title}
        </p>
      )}
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const label =
          (item.labelKey && dict[item.labelKey]) || item.label;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            label={label}
            icon={item.icon}
            iconAccent={item.iconAccent}
            isActive={isActive}
            onNavigate={onNavigate}
          />
        );
      })}
    </div>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center w-full">
      <Image
        src="/brand/logo-light.png"
        alt="ClickIn"
        width={200}
        height={48}
        className="h-9 w-full object-contain object-left dark:hidden"
        priority
      />
      <Image
        src="/brand/logo-dark.png"
        alt="ClickIn"
        width={200}
        height={48}
        className="h-9 w-full object-contain object-left hidden dark:block"
        priority
      />
    </Link>
  );
}

function filterNavByRole(items: NavItem[], canWrite: boolean) {
  return items.filter((item) => !item.requiresWrite || canWrite);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { dict } = useCrmLocale();
  const { canWrite } = useWorkspaceCapabilities();
  const navDict = dict.nav as Record<string, string>;
  const navItems = filterNavByRole(MAIN_NAV, canWrite);

  return (
    <nav className="flex flex-col gap-5" aria-label="Main navigation">
      <NavSection
        items={navItems}
        pathname={pathname}
        dict={navDict}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

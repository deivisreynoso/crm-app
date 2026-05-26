"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { MAIN_NAV, SECONDARY_NAV, type NavItem } from "@/lib/navigation";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

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
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)] shadow-sm"
          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
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
  dict,
}: {
  title?: string;
  items: typeof MAIN_NAV;
  pathname: string;
  dict: Record<string, string>;
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
            isActive={isActive}
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

export function SidebarNav() {
  const pathname = usePathname();
  const { dict, locale } = useCrmLocale();
  const { canWrite } = useWorkspaceCapabilities();
  const navDict = dict.nav as Record<string, string>;
  const toolsTitle = locale === "es" ? "Herramientas" : "Tools";
  const toolsNav = filterNavByRole(SECONDARY_NAV, canWrite);

  return (
    <nav className="flex flex-col gap-5" aria-label="Main navigation">
      <NavSection items={MAIN_NAV} pathname={pathname} dict={navDict} />
      {toolsNav.length > 0 && (
        <NavSection
          title={toolsTitle}
          items={toolsNav}
          pathname={pathname}
          dict={navDict}
        />
      )}
    </nav>
  );
}

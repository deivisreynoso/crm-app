"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CRM_OBJECTS } from "@/lib/constants/crm-objects";
import { cn } from "@/lib/utils";

function activeObjectHref(pathname: string) {
  const match = CRM_OBJECTS.find(
    (o) => o.href !== "/dashboard" && pathname.startsWith(o.href)
  );
  if (match) return match;
  if (pathname.startsWith("/dashboard")) {
    return CRM_OBJECTS.find((o) => o.id === "home");
  }
  return CRM_OBJECTS[0];
}

export function AppLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = activeObjectHref(pathname);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {current && (
          <span
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center text-white text-xs shrink-0",
              current.iconBg
            )}
          >
            {current.glyph}
          </span>
        )}
        <span className="flex-1 text-left truncate">
          {current?.label ?? "CRM"}
        </span>
        <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-50 w-72 bg-white border border-slate-200 rounded-lg shadow-xl py-2 max-h-[70vh] overflow-y-auto"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            All objects
          </p>
          {CRM_OBJECTS.map((obj) => {
            const isActive =
              pathname === obj.href || pathname.startsWith(`${obj.href}/`);
            return (
              <Link
                key={obj.id}
                href={obj.href}
                role="option"
                aria-selected={isActive}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors",
                  isActive && "bg-slate-50 ring-1 ring-inset ring-slate-200"
                )}
              >
                <span
                  className={cn(
                    "w-9 h-9 rounded flex items-center justify-center text-white text-sm shrink-0",
                    obj.iconBg
                  )}
                >
                  {obj.glyph}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">
                    {obj.label}
                  </span>
                  {obj.description && (
                    <span className="block text-xs text-slate-500 truncate">
                      {obj.description}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

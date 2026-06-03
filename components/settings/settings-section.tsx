"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <Card padding="lg" className={cn(className)}>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-heading">{title}</h2>
        {description && (
          <p className="text-sm text-body-muted mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

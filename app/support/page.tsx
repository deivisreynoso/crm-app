import { redirect } from "next/navigation";
import { PublicSupportWidget } from "@/components/support/public-support-widget";
import { isSupportWidgetEnabled } from "@/lib/support/widget-status";

type Props = { searchParams: Promise<{ embed?: string }> };

export default async function SupportRootPage({ searchParams }: Props) {
  const { embed } = await searchParams;
  const isEmbed = embed === "1";

  if (!isEmbed) {
    redirect("/en/support");
  }

  const enabled = await isSupportWidgetEnabled();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicSupportWidget embed enabled={enabled} />
    </div>
  );
}

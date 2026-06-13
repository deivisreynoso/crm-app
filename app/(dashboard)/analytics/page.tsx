import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const safeTab =
    tab === "operations" ||
    tab === "pipeline" ||
    tab === "website" ||
    tab === "finances"
      ? tab
      : null;
  redirect(safeTab ? `/dashboard?tab=${safeTab}` : "/dashboard");
}

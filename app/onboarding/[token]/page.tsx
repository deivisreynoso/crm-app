import { PublicOnboardingPage } from "@/components/onboarding/public-onboarding-page";

type Props = { params: Promise<{ token: string }> };

export default async function OnboardingTokenPage({ params }: Props) {
  const { token } = await params;
  return <PublicOnboardingPage token={token} />;
}

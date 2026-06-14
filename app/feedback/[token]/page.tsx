import { PublicFeedbackPage } from "@/components/onboarding/public-feedback-page";

type Props = { params: Promise<{ token: string }> };

export default async function FeedbackTokenPage({ params }: Props) {
  const { token } = await params;
  return <PublicFeedbackPage token={token} />;
}

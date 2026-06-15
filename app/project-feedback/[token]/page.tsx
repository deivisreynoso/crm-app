import { PublicProjectFeedbackPage } from "@/components/project-feedback/public-project-feedback-page";

type PageProps = { params: Promise<{ token: string }> };

export default async function ProjectFeedbackPage({ params }: PageProps) {
  const { token } = await params;
  return <PublicProjectFeedbackPage token={token} />;
}

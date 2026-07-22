import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Assistant Integration",
  description: "Connect your private PHub dashboard to ChatGPT Actions, Gemini Gems, or Claude Projects. Secure OAuth 2.0 configuration guidelines and OpenAPI specifications.",
  openGraph: {
    title: `AI Assistant Integration — ${SITE_NAME}`,
    description: "Connect your private PHub dashboard to ChatGPT Actions, Gemini Gems, or Claude Projects.",
    type: "website",
  },
  twitter: {
    title: `AI Assistant Integration — ${SITE_NAME}`,
    description: "Connect your private PHub dashboard to ChatGPT Actions, Gemini Gems, or Claude Projects.",
  }
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect to ChatGPT",
  description:
    "Wire PHub Dashboard up to a ChatGPT Custom GPT — import the OpenAPI schema, authenticate with your token, and log expenses or update your watchlist by chatting.",
  alternates: { canonical: "/gpt" },
  openGraph: { url: "/gpt", title: "Connect PHub Dashboard to ChatGPT" },
  twitter: { title: "Connect PHub Dashboard to ChatGPT" },
};

export default function GptLayout({ children }: { children: React.ReactNode }) {
  return children;
}

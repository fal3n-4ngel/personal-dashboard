import { ImageResponse } from "next/og";
import { SocialCard } from "@/lib/og-image";

export const alt = "PHub Dashboard — one dashboard for expenses, watchlist, books, and notes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<SocialCard />, { ...size });
}

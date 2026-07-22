"use client";

import React, { useEffect, useState } from "react";
import { AUTHOR } from "@/lib/site";

interface LandingPageProps {
  onLogin: () => void;
  authError?: string;
  firebaseAuthReady: boolean;
}

/* ─── Live multi-timezone clock, footer flourish ───
 * One ticking `now` drives every city so they stay in lockstep; each city
 * just reformats the same Date via Intl instead of running its own timer. */
const CLOCK_ZONES: { label: string; region: string; zone: string }[] = [
  {
    label: "Local",
    region: "Your device",
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  { label: "IST", region: "India", zone: "Asia/Kolkata" },
  { label: "UTC", region: "Universal", zone: "UTC" },
];

function useTicker() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const id = setInterval(update, 1000);
    // Ticks once almost immediately (rather than waiting a full second for
    // setInterval's first callback) — deferred via setTimeout(0) rather than
    // called synchronously here, so this is still "setState in a callback",
    // not "setState synchronously within an effect".
    const kick = setTimeout(update, 0);
    return () => {
      clearInterval(id);
      clearTimeout(kick);
    };
  }, []);
  return now;
}

/* ─── ChatGPT demo thread: cycles through example exchanges on a loop ─── */
const GPT_EXAMPLES: { user: string; replyMain: string; replyDetail: string }[] =
  [
    {
      user: "spent ₹450 on lunch today",
      replyMain: "✅ Logged ₹450 to Food",
      replyDetail: "“Lunch today” · just now",
    },
    {
      user: "add dune part two to my watchlist",
      replyMain: "✅ Added to Plan to Watch",
      replyDetail: "Dune: Part Two · movie",
    },
    {
      user: "how much did I spend this week?",
      replyMain: "₹3,240 spent this week",
      replyDetail: "Mostly Food (₹1,850) & Transport (₹640)",
    },
  ];

function ChatDemo() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<"user" | "typing" | "reply">("user");

  useEffect(() => {
    const delay = phase === "user" ? 900 : phase === "typing" ? 1100 : 2400;
    const timeout = setTimeout(() => {
      if (phase === "user") setPhase("typing");
      else if (phase === "typing") setPhase("reply");
      else {
        setExampleIndex((i) => (i + 1) % GPT_EXAMPLES.length);
        setPhase("user");
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [phase]);

  const example = GPT_EXAMPLES[exampleIndex];

  return (
    <div className="flex h-full w-full flex-col justify-end gap-2.5">
      <div
        className="max-w-[82%] animate-[bubbleIn_0.28s_cubic-bezier(0.16,1,0.3,1)_both] self-end rounded-[15px] rounded-br-[4px] bg-[#1c1b18] px-[15px] py-[11px] text-[12.5px] leading-[1.5] text-white"
        key={`u-${exampleIndex}`}
      >
        {example.user}
      </div>
      {phase === "typing" && (
        <div className="flex animate-[bubbleIn_0.28s_cubic-bezier(0.16,1,0.3,1)_both] items-center gap-1 self-start rounded-[15px] rounded-bl-[4px] border border-[#e5e3db] bg-white px-[15px] py-[13px]">
          <span className="h-[5px] w-[5px] animate-[chatDotBounce_1s_infinite_ease-in-out_both] rounded-full bg-[#9c9a92]" />
          <span className="h-[5px] w-[5px] animate-[chatDotBounce_1s_infinite_ease-in-out_both] rounded-full bg-[#9c9a92] [animation-delay:0.15s]" />
          <span className="h-[5px] w-[5px] animate-[chatDotBounce_1s_infinite_ease-in-out_both] rounded-full bg-[#9c9a92] [animation-delay:0.3s]" />
        </div>
      )}
      {phase === "reply" && (
        <div
          className="max-w-[82%] animate-[bubbleIn_0.28s_cubic-bezier(0.16,1,0.3,1)_both] self-start rounded-[15px] rounded-bl-[4px] border border-[#bbf7d0] bg-[#f0fdf4] px-[15px] py-[11px] text-[12.5px] leading-[1.5] text-[#14532d]"
          key={`a-${exampleIndex}`}
        >
          <div className="font-bold">{example.replyMain}</div>
          <div className="mt-[3px] text-[11px] text-[#15803d] opacity-85">
            {example.replyDetail}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveClockStrip() {
  const now = useTicker();
  return (
    <div className="mt-1 flex max-[900px]:flex-wrap max-[900px]:gap-y-4">
      {CLOCK_ZONES.map((z, idx) => (
        <div
          className={`flex flex-col gap-[3px] border-l border-[#e5e3db] px-7 first:border-l-0 first:pl-0 max-[900px]:flex-[1_1_40%] max-[900px]:border-l-0 max-[900px]:pr-5 max-[900px]:pl-0 ${idx === 1 ? "max-[900px]:!border-l max-[900px]:!border-[#e5e3db] max-[900px]:!pl-5" : ""}`}
          key={z.zone}
        >
          <span className="font-mono text-[17px] font-semibold tracking-[0.5px] text-[#1c1b18] [font-variant-numeric:tabular-nums]">
            {now
              ? new Intl.DateTimeFormat("en-GB", {
                  timeZone: z.zone,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                }).format(now)
              : "--:--:--"}
          </span>
          <span className="text-xs font-semibold text-[#6e6c64]">
            {z.label}
          </span>
          <span className="font-mono text-[9.5px] tracking-[0.8px] text-[#b0aea6] uppercase">
            {z.region}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── New logo: bento-grid SVG ─── */
function BentoLogo({
  size = 22,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  const gap = size * 0.08;
  const cell = (size - gap * 3) / 2;
  const r = size * 0.12;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* top-left */}
      <rect x={gap} y={gap} width={cell} height={cell} rx={r} fill={color} />
      {/* top-right */}
      <rect
        x={gap * 2 + cell}
        y={gap}
        width={cell}
        height={cell}
        rx={r}
        fill={color}
        opacity="0.55"
      />
      {/* bottom-left */}
      <rect
        x={gap}
        y={gap * 2 + cell}
        width={cell}
        height={cell}
        rx={r}
        fill={color}
        opacity="0.55"
      />
      {/* bottom-right */}
      <rect
        x={gap * 2 + cell}
        y={gap * 2 + cell}
        width={cell}
        height={cell}
        rx={r}
        fill={color}
        opacity="0.85"
      />
    </svg>
  );
}

interface DiagramPoint {
  x: number;
  y: number;
}

interface DiagramCoords {
  c1_1: DiagramPoint;
  c1_2: DiagramPoint;
  c2_1: DiagramPoint;
  c2_2: DiagramPoint;
  c2_3: DiagramPoint;
  c2_1_r: DiagramPoint;
  c2_2_r: DiagramPoint;
  c2_3_r: DiagramPoint;
  hub_l: DiagramPoint;
  hub_r: DiagramPoint;
  c4_1: DiagramPoint;
  c4_2: DiagramPoint;
  midX: number;
  midY: number;
}

const HERO_REVEAL = "animate-[heroFadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_both]";
const HERO_BADGE =
  "mb-7 inline-flex items-center gap-1.5 rounded-full border border-[#e5e3db] bg-[#eae8e0] px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[1.5px] text-[#6e6c64] uppercase";
const HERO_TITLE =
  "mb-4 text-[58px] leading-[1.04] font-bold tracking-[-2.5px] text-[#1c1b18] max-[900px]:text-[40px] max-[900px]:tracking-[-1.8px] max-[480px]:text-[32px] max-[480px]:tracking-[-1.5px]";
const SERIF_ITALIC_STYLE: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
};
const HERO_CTA_PRIMARY =
  "flex cursor-pointer items-center gap-2 rounded-full border-none bg-[#1c1b18] px-7 py-[13px] text-sm font-semibold text-white no-underline transition-all duration-200 hover:-translate-y-px hover:bg-[#31302b] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";
const STEP_DESC = "text-[13px] leading-[1.55] text-[#6e6c64]";
const DIAGRAM_NODE =
  "flex w-full items-center gap-2.5 rounded-[10px] border border-[#e5e3db] bg-white px-3.5 py-2.5 shadow-[0_4px_12px_-2px_rgba(110,108,100,0.05)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#c4c2ba] hover:shadow-[0_6px_18px_-4px_rgba(110,108,100,0.12)]";
const NODE_ICON =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px]";
const NODE_TITLE =
  "mb-px overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] font-bold text-[#1c1b18]";
const NODE_DESC =
  "overflow-hidden text-ellipsis whitespace-nowrap text-[9.5px] text-[#6e6c64]";
const FEATURE_NUM =
  "mb-2 block font-mono text-[10px] font-semibold tracking-[0.5px] text-[#c4c2ba]";
const BROWSER_DOT = "h-2 w-2 rounded-full";
const FOOTER_LINK_ITEM =
  "inline-flex cursor-pointer items-center gap-1 text-[13px] text-[#6e6c64] no-underline transition-colors duration-150 hover:text-[#1c1b18]";
const FOOTER_COL_LABEL =
  "mb-4 block font-mono text-[10px] font-semibold tracking-wider text-[#9c9a92] uppercase";
const FI_YES = "shrink-0 text-[13px] text-[#22c55e]";

export default function LandingPage({
  onLogin,
  authError,
  firebaseAuthReady,
}: LandingPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [coords, setCoords] = useState<DiagramCoords | null>(null);

  useEffect(() => {
    const updateCoords = () => {
      const container = document.getElementById("dg-container");
      if (!container) return;
      const cRect = container.getBoundingClientRect();

      const getR = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.right - cRect.left,
          y: r.top + r.height / 2 - cRect.top,
        };
      };

      const getL = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.left - cRect.left,
          y: r.top + r.height / 2 - cRect.top,
        };
      };

      const c1_1 = getR("dg-c1-n1");
      const c1_2 = getR("dg-c1-n2");
      const c2_1 = getL("dg-c2-n1");
      const c2_2 = getL("dg-c2-n2");
      const c2_3 = getL("dg-c2-n3");

      const c2_1_r = getR("dg-c2-n1");
      const c2_2_r = getR("dg-c2-n2");
      const c2_3_r = getR("dg-c2-n3");
      const hub_l = getL("dg-hub");
      const hub_r = getR("dg-hub");

      const c4_1 = getL("dg-c4-n1");
      const c4_2 = getL("dg-c4-n2");

      const midX = (c1_1.x + c2_1.x) / 2;
      const midY = (c1_1.y + c1_2.y) / 2;

      setCoords({
        c1_1,
        c1_2,
        c2_1,
        c2_2,
        c2_3,
        c2_1_r,
        c2_2_r,
        c2_3_r,
        hub_l,
        hub_r,
        c4_1,
        c4_2,
        midX,
        midY,
      });
    };

    // Small delay to let fonts/layouts settle
    const timer = setTimeout(updateCoords, 250);
    window.addEventListener("resize", updateCoords);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateCoords);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f3ec] font-body text-[#1c1b18]">
      <style>{`
        @keyframes spin-clockwise { to { transform: rotate(360deg); } }
        @keyframes heroFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drawerSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bubbleIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes chatDotBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-3px); opacity: 1; } }
        @keyframes flowDash { to { stroke-dashoffset: -20; } }
      `}</style>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-[1000] mx-auto flex max-w-[1300px] items-center justify-between border-b border-[rgba(229,227,219,0.6)] bg-[rgba(244,243,236,0.92)] px-20 py-5 backdrop-blur-[10px] max-[900px]:px-6 max-[900px]:py-4">
        <a
          href="#"
          className="flex items-center gap-[9px] text-[17px] font-bold tracking-[-0.4px] text-[#1c1b18] no-underline"
        >
          <BentoLogo size={22} color="#1c1b18" />
          <span>PHub Dashboard</span>
        </a>
        <nav className="flex items-center gap-8 max-[900px]:hidden">
          <a
            href="#how-it-works"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            How It Works
          </a>
          <a
            href="#chatgpt"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            ChatGPT
          </a>
          <a
            href="#setup"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            Self-Host
          </a>
          <a
            href="#pricing"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            Pricing
          </a>
          <a
            href="https://github.com/fal3n-4ngel/PHub-Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            GitHub ↗
          </a>
        </nav>
        <div className="flex items-center gap-2.5">
          <button
            className="md:flex hidden cursor-pointer items-center gap-2 rounded-full border-none bg-[#1c1b18] px-[22px] py-2.5 text-[13px] font-semibold text-white transition-[transform,background-color] duration-200 hover:-translate-y-px hover:bg-[#31302b] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
            onClick={onLogin}
            disabled={!firebaseAuthReady}
          >
            <span>Get started</span>
            <span>→</span>
          </button>
          <button
            className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#e5e3db] bg-transparent text-[#1c1b18] max-[900px]:flex"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {mobileNavOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
        <nav
          className={`hidden ${mobileNavOpen ? "max-[900px]:flex" : ""} max-[900px]:animate-[drawerSlideDown_0.2s_ease-out_both] max-[900px]:fixed max-[900px]:top-[65px] max-[900px]:right-4 max-[900px]:left-4 max-[900px]:z-[999] max-[900px]:flex-col max-[900px]:rounded-2xl max-[900px]:border max-[900px]:border-[#e5e3db] max-[900px]:bg-white max-[900px]:p-2.5 max-[900px]:shadow-[0_16px_40px_-12px_rgba(28,27,24,0.18)]`}
        >
          <a
            href="#how-it-works"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            How It Works
          </a>
          <a
            href="#chatgpt"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            ChatGPT
          </a>
          <a
            href="#setup"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            Self-Host
          </a>
          <a
            href="#pricing"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            Pricing
          </a>
          <a
            href="https://github.com/fal3n-4ngel/PHub-Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            GitHub ↗
          </a>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-[1100px] px-6 pt-[90px] pb-[60px] text-center max-[480px]:px-4 max-[480px]:pt-[60px] max-[480px]:pb-10">
        <span
          className={`${HERO_BADGE} ${HERO_REVEAL} [animation-delay:0.02s]`}
        >
          <BentoLogo size={12} color="#6e6c64" />
          Self-hostable · Open source · Private
        </span>
        <h1 className={`${HERO_TITLE} ${HERO_REVEAL} [animation-delay:0.08s]`}>
          One dashboard.
          <br />
          <span className="font-normal italic" style={SERIF_ITALIC_STYLE}>
            Everything you track.
          </span>
        </h1>
        <p
          className={`mx-auto mb-10 max-w-[580px] text-base leading-[1.6] text-[#6e6c64] ${HERO_REVEAL} [animation-delay:0.14s]`}
        >
          Consolidate your media watchlists, track daily expenses with custom
          salary cycles, maintain a book library, and keep a scratchpad — all
          stored privately in your own database.
        </p>
        <div
          className={`flex flex-wrap justify-center gap-3 ${HERO_REVEAL} [animation-delay:0.2s]`}
        >
          <button
            className={HERO_CTA_PRIMARY}
            onClick={onLogin}
            disabled={!firebaseAuthReady}
          >
            Start for free
            <span>→</span>
          </button>
          <a
            href="https://github.com/fal3n-4ngel/PHub-Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border-[1.5px] border-[#d1cfc7] bg-transparent px-7 py-[13px] text-sm font-semibold text-[#1c1b18] no-underline transition-all duration-200 hover:border-[#1c1b18] hover:bg-[rgba(28,27,24,0.04)]"
          >
            View on GitHub
          </a>
        </div>
        <div
          className={`mt-7 flex flex-wrap justify-center gap-2 ${HERO_REVEAL} [animation-delay:0.26s]`}
        >
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            💸 Expense Ledger
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            🎬 Media Watchlist
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            📚 Book Library
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            ✏️ Quick Notes
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            🌸 AniList sync
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            🎯 Trakt sync
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            🎞️ Letterboxd import
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            🤖 Custom LLM Sync (Gemini/ChatGPT)
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#e5e3db] bg-white px-3 py-[5px] text-[11.5px] font-medium text-[#6e6c64]">
            🔒 AES-256 DB Encryption
          </span>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section
        id="how-it-works"
        className="mx-auto max-w-[1100px] px-6 pt-0 pb-[60px] text-center max-[480px]:px-4 max-[480px]:pb-10"
      >
        <div
          className="max-[768px]:px-4 max-[768px]:py-[30px] max-[480px]:px-5 max-[480px]:py-7"
          id="dg-container"
        >
          <div className="relative rounded-xl border border-[#e5e3db] bg-white p-10 shadow-[0_4px_16px_rgba(110,108,100,0.03)]">
            {/* ── DESKTOP VIEW ── */}
            <div className="block max-[768px]:hidden">
              {coords && (
                <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full max-[900px]:hidden">
                  {/* Column 1 → Merge Point */}
                  <path
                    d={`M ${coords.c1_1.x} ${coords.c1_1.y} C ${(coords.c1_1.x + coords.midX) / 2} ${coords.c1_1.y}, ${(coords.c1_1.x + coords.midX) / 2} ${coords.midY}, ${coords.midX} ${coords.midY}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={`M ${coords.c1_2.x} ${coords.c1_2.y} C ${(coords.c1_2.x + coords.midX) / 2} ${coords.c1_2.y}, ${(coords.c1_2.x + coords.midX) / 2} ${coords.midY}, ${coords.midX} ${coords.midY}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <circle
                    cx={coords.midX}
                    cy={coords.midY}
                    r="3"
                    fill="#c4c2ba"
                  />

                  {/* Merge Point → Column 2 Lefts */}
                  <path
                    d={`M ${coords.midX} ${coords.midY} C ${(coords.midX + coords.c2_1.x) / 2} ${coords.midY}, ${(coords.midX + coords.c2_1.x) / 2} ${coords.c2_1.y}, ${coords.c2_1.x} ${coords.c2_1.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={`M ${coords.midX} ${coords.midY} C ${(coords.midX + coords.c2_2.x) / 2} ${coords.midY}, ${(coords.midX + coords.c2_2.x) / 2} ${coords.c2_2.y}, ${coords.c2_2.x} ${coords.c2_2.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={`M ${coords.midX} ${coords.midY} C ${(coords.midX + coords.c2_3.x) / 2} ${coords.midY}, ${(coords.midX + coords.c2_3.x) / 2} ${coords.c2_3.y}, ${coords.c2_3.x} ${coords.c2_3.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />

                  {/* Column 2 Rights → Hub Left */}
                  <path
                    d={`M ${coords.c2_1_r.x} ${coords.c2_1_r.y} C ${(coords.c2_1_r.x + coords.hub_l.x) / 2} ${coords.c2_1_r.y}, ${(coords.c2_1_r.x + coords.hub_l.x) / 2} ${coords.hub_l.y}, ${coords.hub_l.x} ${coords.hub_l.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={`M ${coords.c2_2_r.x} ${coords.c2_2_r.y} C ${(coords.c2_2_r.x + coords.hub_l.x) / 2} ${coords.c2_2_r.y}, ${(coords.c2_2_r.x + coords.hub_l.x) / 2} ${coords.hub_l.y}, ${coords.hub_l.x} ${coords.hub_l.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={`M ${coords.c2_3_r.x} ${coords.c2_3_r.y} C ${(coords.c2_3_r.x + coords.hub_l.x) / 2} ${coords.c2_3_r.y}, ${(coords.c2_3_r.x + coords.hub_l.x) / 2} ${coords.hub_l.y}, ${coords.hub_l.x} ${coords.hub_l.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />

                  {/* Hub Right → Column 4 Lefts */}
                  <path
                    d={`M ${coords.hub_r.x} ${coords.hub_r.y} C ${(coords.hub_r.x + coords.c4_1.x) / 2} ${coords.hub_r.y}, ${(coords.hub_r.x + coords.c4_1.x) / 2} ${coords.c4_1.y}, ${coords.c4_1.x} ${coords.c4_1.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={`M ${coords.hub_r.x} ${coords.hub_r.y} C ${(coords.hub_r.x + coords.c4_2.x) / 2} ${coords.hub_r.y}, ${(coords.hub_r.x + coords.c4_2.x) / 2} ${coords.c4_2.y}, ${coords.c4_2.x} ${coords.c4_2.y}`}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                </svg>
              )}

              <div className="relative z-[2] flex h-[400px] items-center justify-between max-[900px]:h-auto max-[900px]:flex-col max-[900px]:gap-10">
                {/* Column 1: Incoming */}
                <div className="z-[2] flex w-[210px] min-w-0 flex-col justify-center gap-9 max-[900px]:w-full">
                  <span className={FEATURE_NUM}>INCOMING</span>

                  <div className={DIAGRAM_NODE} id="dg-c1-n1">
                    <div className={`${NODE_ICON} bg-[#ede9fe]`}>☁️</div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>External Sync</div>
                      <div className={NODE_DESC}>Trakt & AniList APIs</div>
                    </div>
                  </div>

                  <div className={DIAGRAM_NODE} id="dg-c1-n2">
                    <div className={`${NODE_ICON} bg-[#fef9c3]`}>✍️</div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>Local Entries</div>
                      <div className={NODE_DESC}>Expenses, logs & notes</div>
                    </div>
                  </div>
                </div>

                {/* Column 2: What Phub Handles */}
                <div className="z-[2] flex w-[230px] min-w-0 flex-col justify-center gap-[22px] max-[900px]:w-full">
                  <span className={FEATURE_NUM}>WHAT PHUB HANDLES</span>

                  <div className={DIAGRAM_NODE} id="dg-c2-n1">
                    <div className={`${NODE_ICON} bg-[#e39282]`}>📊</div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>Expense Analytics</div>
                      <div className={NODE_DESC}>
                        Salary cycles & categories
                      </div>
                    </div>
                  </div>

                  <div className={DIAGRAM_NODE} id="dg-c2-n2">
                    <div className={`${NODE_ICON} bg-[#dbeafe]`}>🎬</div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>Media Sync engine</div>
                      <div className={NODE_DESC}>Trakt OAuth updates</div>
                    </div>
                  </div>

                  <div className={DIAGRAM_NODE} id="dg-c2-n3">
                    <div className={`${NODE_ICON} bg-[#f0fdf4]`}>📚</div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>Reading library</div>
                      <div className={NODE_DESC}>OpenLibrary cataloging</div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Phub Logo Hub */}
                <div className="z-[2] flex w-[120px] min-w-0 flex-col items-center justify-center gap-9 max-[900px]:w-full">
                  <span className={FEATURE_NUM}>PHUB ENGINE</span>
                  <div
                    className="relative flex h-[84px] w-[84px] flex-col items-center justify-center gap-[3px] rounded-[20px] bg-[#1c1b18] text-white shadow-[0_8px_24px_rgba(28,27,24,0.16)]"
                    id="dg-hub"
                  >
                    <div className="absolute -inset-1.5 animate-[spin-clockwise_25s_linear_infinite] rounded-3xl border-[1.5px] border-dashed border-[rgba(28,27,24,0.2)]" />
                    <BentoLogo size={24} color="#ffffff" />
                    <span className="font-mono text-[9px] font-bold tracking-[0.8px] uppercase">
                      Hub
                    </span>
                  </div>
                </div>

                {/* Column 4: Canvas / Result */}
                <div className="z-[2] flex w-[210px] min-w-0 flex-col justify-center gap-9 max-[900px]:w-full">
                  <span className={FEATURE_NUM}>RESULT</span>

                  <div className={DIAGRAM_NODE} id="dg-c4-n1">
                    <div className={`${NODE_ICON} bg-[#d1b89a]`}>📱</div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>Dashboard Canvas</div>
                      <div className={NODE_DESC}>Interactive dashboard UI</div>
                    </div>
                  </div>

                  <div
                    className={`${DIAGRAM_NODE} border-[1.5px] border-[#3b82f6] shadow-[0_4px_12px_rgba(59,130,246,0.08)]`}
                    id="dg-c4-n2"
                  >
                    <div className={`${NODE_ICON} bg-[#3b82f6] text-white`}>
                      💬
                    </div>
                    <div className="min-w-0 text-left">
                      <div className={NODE_TITLE}>LLM Sync client</div>
                      <div className={NODE_DESC}>Gemini, ChatGPT, Claude</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── MOBILE VIEW (Clean stacked workflow) ── */}
            <div className="relative z-[2] hidden max-[768px]:flex max-[768px]:flex-col max-[768px]:items-center max-[768px]:gap-5">
              {/* Step 1: Incoming */}
              <div className="flex w-full flex-col items-center gap-2.5">
                <span className={FEATURE_NUM}>INCOMING</span>
                <div className="flex w-full gap-2.5 [&>*]:min-w-0 [&>*]:flex-1">
                  <div className={DIAGRAM_NODE}>
                    <div className="flex gap-1.5 text-[11px] font-bold text-[#1c1b18]">
                      ☁️ <span>APIs</span>
                    </div>
                  </div>
                  <div className={DIAGRAM_NODE}>
                    <div className="flex gap-1.5 text-[11px] font-bold text-[#1c1b18]">
                      ✍️ <span>Local</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-6 w-0.5 [background:repeating-linear-gradient(to_bottom,#c4c2ba,#c4c2ba_3px,transparent_3px,transparent_6px)]" />

              {/* Step 2: Processing */}
              <div className="flex w-full flex-col items-center gap-2.5">
                <span className={FEATURE_NUM}>WHAT PHUB HANDLES</span>
                <div className={DIAGRAM_NODE}>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#e39282] text-[11px]">
                    📊
                  </div>
                  <span className="text-[11px] font-bold text-[#1c1b18]">
                    Expense Analytics
                  </span>
                </div>
                <div className={DIAGRAM_NODE}>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#dbeafe] text-[11px]">
                    🎬
                  </div>
                  <span className="text-[11px] font-bold text-[#1c1b18]">
                    Media Sync engine
                  </span>
                </div>
                <div className={DIAGRAM_NODE}>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#f0fdf4] text-[11px]">
                    📚
                  </div>
                  <span className="text-[11px] font-bold text-[#1c1b18]">
                    Reading library
                  </span>
                </div>
              </div>

              <div className="h-6 w-0.5 [background:repeating-linear-gradient(to_bottom,#c4c2ba,#c4c2ba_3px,transparent_3px,transparent_6px)]" />

              {/* Step 3: Logo */}
              <div className="flex w-full flex-col items-center gap-2.5">
                <span className={FEATURE_NUM}>PHUB ENGINE</span>
                <div className="relative flex h-[84px] w-[84px] flex-col items-center justify-center gap-[3px] rounded-[20px] bg-[#1c1b18] text-white shadow-[0_8px_24px_rgba(28,27,24,0.16)]">
                  <BentoLogo size={22} color="#ffffff" />
                  <span className="font-mono text-[8px] font-bold tracking-[0.8px] uppercase">
                    Hub
                  </span>
                </div>
              </div>

              <div className="h-6 w-0.5 [background:repeating-linear-gradient(to_bottom,#c4c2ba,#c4c2ba_3px,transparent_3px,transparent_6px)]" />

              {/* Step 4: Result */}
              <div className="flex w-full flex-col items-center gap-2.5">
                <span className={FEATURE_NUM}>RESULT</span>
                <div className="flex w-full gap-2.5 [&>*]:min-w-0 [&>*]:flex-1">
                  <div className={DIAGRAM_NODE}>
                    <span className="text-[11px] font-bold text-[#1c1b18]">
                      📱 Dashboard UI
                    </span>
                  </div>
                  <div className={`${DIAGRAM_NODE} border border-[#3b82f6]`}>
                    <span className="text-[11px] font-bold text-[#1d4ed8]">
                      💬 Gemini / GPT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ChatGPT & LLM integration section ─── */}
      <section
        id="chatgpt"
        className="border-t border-b border-[#e5e3db] bg-[#eae8e0] px-6 py-[100px]"
      >
        <div className="mx-auto grid max-w-[1100px] grid-cols-[1.1fr_1fr] items-center gap-[60px] max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div>
            <span className={`${HERO_BADGE} mb-7 bg-[#f4f3ec]`}>
              🤖 OpenAPI compliant
            </span>
            <h2 className={`${HERO_TITLE} mb-5 text-left text-[40px]`}>
              Connect any LLM.
              <br />
              <span className="font-normal italic" style={SERIF_ITALIC_STYLE}>
                Gemini, ChatGPT, or Claude.
              </span>
            </h2>
            <p className={`${STEP_DESC} mb-8 max-w-[440px] text-sm`}>
              Every route in this API exposes a clean OpenAPI spec. Import the
              schema into Gemini Gems, ChatGPT Actions, or Claude Projects to
              log expenses, update your watchlist, or query analytics in plain
              English.
            </p>
            <ul className="mb-8 flex list-none flex-col gap-3.5 p-0">
              <li className="flex items-start gap-3 text-sm leading-[1.5] text-[#1c1b18]">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[11px] text-white">
                  ✓
                </span>
                Works with Gemini Gems, ChatGPT Custom GPTs, and Claude Projects
              </li>
              <li className="flex items-start gap-3 text-sm leading-[1.5] text-[#1c1b18]">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[11px] text-white">
                  ✓
                </span>
                Use LLMs on your phone or laptop to track everything on the go
              </li>
              <li className="flex items-start gap-3 text-sm leading-[1.5] text-[#1c1b18]">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[11px] text-white">
                  ✓
                </span>
                Natural language recognition — &ldquo;I spent 400 on
                transit&rdquo; maps instantly
              </li>
            </ul>
            <a href="/assistant" className={`${HERO_CTA_PRIMARY} inline-flex`}>
              See the setup guide
              <span>→</span>
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e5e3db] bg-white shadow-[0_20px_40px_-15px_rgba(110,108,100,0.14)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-[#e5e3db] bg-[#f4f3ec] px-4">
              <div className={`${BROWSER_DOT} bg-[#ff5f56]`} />
              <div className={`${BROWSER_DOT} bg-[#ffbd2e]`} />
              <div className={`${BROWSER_DOT} bg-[#27c93f]`} />
              <span className="flex-1 text-center font-mono text-[10.5px] font-semibold tracking-wider text-[#9c9a92] uppercase">
                ChatGPT · Phub
              </span>
            </div>
            <div className="flex h-[280px] items-end gap-3 bg-[#f4f3ec] p-5">
              <ChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Setup section ─── */}
      <section
        id="setup"
        className="border-t border-b border-[#e5e3db] bg-[#eae8e0] px-6 py-[100px]"
      >
        <div className="mx-auto grid max-w-[1100px] grid-cols-[1.1fr_1fr] items-center gap-[60px] max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div className="overflow-hidden rounded-xl border border-[#e5e3db] bg-white shadow-[0_20px_40px_-15px_rgba(110,108,100,0.14)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-[#e5e3db] bg-[#f4f3ec] px-4">
              <div className={`${BROWSER_DOT} bg-[#ff5f56]`} />
              <div className={`${BROWSER_DOT} bg-[#ffbd2e]`} />
              <div className={`${BROWSER_DOT} bg-[#27c93f]`} />
            </div>
            <div className="flex h-[280px] gap-3 bg-[#f4f3ec] p-5">
              <div className="flex w-[60px] flex-col gap-2 rounded-lg border border-[#e5e3db] bg-white p-2.5">
                <div className="h-3.5 rounded bg-[#1c1b18]" />
                <div className="mt-2.5 h-2 w-[80%] rounded bg-[#eae8e0]" />
                <div className="h-2 w-[65%] rounded bg-[#eae8e0]" />
                <div className="h-2 w-[70%] rounded bg-[#eae8e0]" />
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-[70px] rounded-lg border border-[#e5e3db] bg-white p-3">
                    <div className="mb-1.5 h-1.5 w-10 rounded-[3px] bg-[#eae8e0]" />
                    <div className="h-3.5 w-[70px] rounded-[3px] bg-[#1c1b18]" />
                  </div>
                  <div className="h-[70px] rounded-lg border border-[#e5e3db] bg-white p-3">
                    <div className="mb-1.5 h-1.5 w-[30px] rounded-[3px] bg-[#eae8e0]" />
                    <div className="h-3.5 w-[50px] rounded-[3px] bg-[#b3666b]" />
                  </div>
                  <div className="h-[70px] rounded-lg border border-[#e5e3db] bg-white p-3">
                    <div className="mb-1.5 h-1.5 w-10 rounded-[3px] bg-[#eae8e0]" />
                    <div className="h-3.5 w-[60px] rounded-[3px] bg-[#e39282]" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-end gap-1.5 rounded-lg border border-[#e5e3db] bg-white p-3">
                  <div className="mb-2 h-2 w-20 self-start rounded-[3px] bg-[#eae8e0]" />
                  <div className="flex h-20 items-end justify-around">
                    <div
                      className="w-3.5 rounded-t-sm bg-[#e39282]"
                      style={{ height: "40px" }}
                    />
                    <div
                      className="w-3.5 rounded-t-sm bg-[#1c1b18]"
                      style={{ height: "70px" }}
                    />
                    <div
                      className="w-3.5 rounded-t-sm bg-[#d1b89a]"
                      style={{ height: "55px" }}
                    />
                    <div
                      className="w-3.5 rounded-t-sm bg-[#e39282]"
                      style={{ height: "20px" }}
                    />
                    <div
                      className="w-3.5 rounded-t-sm bg-[#1c1b18]"
                      style={{ height: "85px" }}
                    />
                    <div
                      className="w-3.5 rounded-t-sm bg-[#e39282]"
                      style={{ height: "60px" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <span className={`${HERO_BADGE} mb-7 bg-[#f4f3ec]`}>
              Minimal Setup
            </span>
            <h2 className={`${HERO_TITLE} mb-10 text-left text-[40px]`}>
              If you can clone a repo,
              <br />
              <span className="font-normal italic" style={SERIF_ITALIC_STYLE}>
                you can self-host this.
              </span>
            </h2>
            <div className="mb-9 flex gap-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c1b18] text-[11px] font-bold text-white">
                1
              </span>
              <div>
                <h4 className="mb-1.5 text-[15px] font-bold">
                  Fork & deploy to Vercel
                </h4>
                <p className={STEP_DESC}>
                  Click the deploy button in the GitHub README. Vercel sets up
                  CI/CD automatically in under 2 minutes.
                </p>
              </div>
            </div>
            <div className="mb-9 flex gap-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c1b18] text-[11px] font-bold text-white">
                2
              </span>
              <div>
                <h4 className="mb-1.5 text-[15px] font-bold">
                  Create a Firebase project
                </h4>
                <p className={STEP_DESC}>
                  Add your Firebase config as Vercel env vars. Firestore and
                  Auth initialize on first login — no manual schema setup.
                </p>
              </div>
            </div>
            <div className="mb-9 flex gap-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c1b18] text-[11px] font-bold text-white">
                3
              </span>
              <div>
                <h4 className="mb-1.5 text-[15px] font-bold">
                  Connect your API keys
                </h4>
                <p className={STEP_DESC}>
                  Optionally add AniList, Trakt, and TMDb keys to unlock full
                  sync. Everything else works without them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Three-way pricing ─── */}
      <section
        id="pricing"
        className="mx-auto max-w-[1100px] px-6 py-[100px] text-center"
      >
        <span className={HERO_BADGE}>Three ways in</span>
        <h2 className={`${HERO_TITLE} mb-3 text-[44px]`}>
          Pick your setup.
          <br />
          <span className="font-normal italic" style={SERIF_ITALIC_STYLE}>
            All are welcome.
          </span>
        </h2>
        <p className="mx-auto mb-0 max-w-[580px] text-base leading-[1.6] text-[#6e6c64]">
          No feature gates. No paywalls on your own data. Use the hosted
          version, self-deploy for full privacy, or fork and make it yours.
        </p>

        <div className="mt-12 grid grid-cols-3 gap-5 text-left max-[900px]:mx-auto max-[900px]:max-w-[480px] max-[900px]:grid-cols-1">
          {/* ── Card 1: Cloud hosted ── */}
          <div className="relative flex flex-col rounded-2xl border border-[#e5e3db] bg-white p-8 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_rgba(110,108,100,0.12)] max-[480px]:p-6">
            <span className="mb-5 inline-block self-start rounded-full bg-[#eae8e0] px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-wider text-[#6e6c64] uppercase">
              Free · Now
            </span>
            <p className="mb-1.5 text-xl font-bold tracking-[-0.5px] text-[#1c1b18]">
              Cloud Hosted
            </p>
            <p className="mb-1 text-[38px] leading-none font-extrabold tracking-[-2px] text-[#1c1b18] max-[480px]:text-[30px]">
              ₹0{" "}
              <span className="text-[13px] font-normal tracking-normal text-[#9c9a92]">
                / now
              </span>
            </p>
            <p className="mt-4 flex-1 text-[13px] leading-[1.65] text-[#6e6c64]">
              Sign in instantly and use my shared Vercel + Firebase instance. No
              setup, no downloads. Free right now — if traffic grows I may add
              ads or a small fee to cover hosting.
            </p>
            <div className="my-6 h-px bg-[#e5e3db]" />
            <ul className="mb-7 flex list-none flex-col gap-2.5 p-0">
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Instant access, zero setup
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Google sign-in
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Always updated
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className="shrink-0 text-[13px] text-[#f59e0b]">○</span>{" "}
                Shared hosting instance
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className="shrink-0 text-[13px] text-[#f59e0b]">○</span>{" "}
                May add ads / fee later
              </li>
            </ul>
            {authError && (
              <div className="mb-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#dc2626]">
                {authError}
              </div>
            )}
            <button
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[#1c1b18] bg-transparent px-5 py-3 text-[13px] font-semibold text-[#1c1b18] no-underline transition-all duration-200 enabled:hover:bg-[#1c1b18] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onLogin}
              disabled={!firebaseAuthReady}
            >
              Sign in with Google →
            </button>
          </div>

          {/* ── Card 2: Self-hosted (featured) ── */}
          <div className="relative flex flex-col rounded-2xl border border-[#1c1b18] bg-white p-8 shadow-[0_6px_24px_-4px_rgba(28,27,24,0.14)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_rgba(110,108,100,0.12)] max-[900px]:order-[-1] max-[480px]:p-6">
            <span className="mb-5 inline-block self-start rounded-full bg-[#1c1b18] px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-wider text-white uppercase">
              Recommended · Free Forever
            </span>
            <p className="mb-1.5 text-xl font-bold tracking-[-0.5px] text-[#1c1b18]">
              Self-Hosted
            </p>
            <p className="mb-1 text-[38px] leading-none font-extrabold tracking-[-2px] text-[#1c1b18] max-[480px]:text-[30px]">
              ₹0{" "}
              <span className="text-[13px] font-normal tracking-normal text-[#9c9a92]">
                forever
              </span>
            </p>
            <p className="mt-4 flex-1 text-[13px] leading-[1.65] text-[#6e6c64]">
              Deploy your own instance on Vercel + Firebase in ~5 minutes. Your
              expenses, watchlist, and notes stay entirely in your private
              database — never shared, never monetised.
            </p>
            <div className="my-6 h-px bg-[#e5e3db]" />
            <ul className="mb-7 flex list-none flex-col gap-2.5 p-0">
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Your data, your servers
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Private Firebase database
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Zero ads, forever
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Free on Firebase Spark plan
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Full env control
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> AES-256 GCM DB Encryption
              </li>
            </ul>
            <a
              href="https://github.com/fal3n-4ngel/PHub-Dashboard#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[#1c1b18] bg-[#1c1b18] px-5 py-3 text-[13px] font-semibold text-white no-underline transition-all duration-200 enabled:hover:bg-[#31302b]"
            >
              View Setup Guide →
            </a>
          </div>

          {/* ── Card 3: Fork & build ── */}
          <div className="relative flex flex-col rounded-2xl border border-[#e5e3db] bg-white p-8 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_rgba(110,108,100,0.12)] max-[480px]:p-6">
            <span className="mb-5 inline-block self-start rounded-full bg-[#eae8e0] px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-wider text-[#6e6c64] uppercase">
              MIT License
            </span>
            <p className="mb-1.5 text-xl font-bold tracking-[-0.5px] text-[#1c1b18]">
              Fork & Build
            </p>
            <p className="mb-1 text-[26px] leading-none font-extrabold tracking-[-0.5px] text-[#1c1b18]">
              Open Source
            </p>
            <p className="mt-4 flex-1 text-[13px] leading-[1.65] text-[#6e6c64]">
              Clone the full repo, gut it, add your own modules, redesign it.
              Built on Next.js + Firebase — a solid base for any personal
              dashboard or productivity app.
            </p>
            <div className="my-6 h-px bg-[#e5e3db]" />
            <ul className="mb-7 flex list-none flex-col gap-2.5 p-0">
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Full codebase access
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> MIT licensed
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className={FI_YES}>✓</span> Next.js + Firebase stack
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className="shrink-0 text-[13px] text-[#9c9a92]">→</span>{" "}
                PRs & feedback welcome
              </li>
              <li className="flex items-start gap-2 text-[12.5px] leading-[1.4] text-[#1c1b18]">
                <span className="shrink-0 text-[13px] text-[#9c9a92]">→</span>{" "}
                ⭐ Star if it helped you
              </li>
            </ul>
            <a
              href="https://github.com/fal3n-4ngel/PHub-Dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[#1c1b18] bg-transparent px-5 py-3 text-[13px] font-semibold text-[#1c1b18] no-underline transition-all duration-200 enabled:hover:bg-[#1c1b18] enabled:hover:text-white"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#e5e3db] bg-white">
        <div className="mx-auto max-w-[1100px] px-20 pt-14 max-[900px]:px-6 max-[900px]:pt-12">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-[60px] border-b border-[#e5e3db] pb-11 max-[900px]:grid-cols-1 max-[900px]:gap-9 max-[900px]:pb-9">
            <div className="flex flex-col gap-3.5">
              <a
                href="#"
                className="flex items-center gap-[9px] text-base font-bold tracking-[-0.4px] text-[#1c1b18] no-underline"
              >
                <BentoLogo size={18} color="#1c1b18" />
                PHub Dashboard
              </a>
              <p className="max-w-[290px] text-[13px] leading-[1.65] text-[#6e6c64]">
                A private tracking dashboard for media watchlists, daily
                expenses, book reading, and notes. Built for self-hosters and
                privacy-first users.
              </p>
              <p className="text-xs text-[#9c9a92]">
                Built by{" "}
                <a
                  href={AUTHOR.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6e6c64] no-underline hover:text-[#1c1b18]"
                >
                  {AUTHOR.name}
                </a>{" "}
                ·{" "}
                <a
                  href={AUTHOR.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6e6c64] no-underline hover:text-[#1c1b18]"
                >
                  @{AUTHOR.githubHandle}
                </a>
              </p>
            </div>

            <div>
              <span className={FOOTER_COL_LABEL}>Product</span>
              <ul className="flex list-none flex-col gap-[11px] p-0">
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Expense Ledger
                  </span>
                </li>
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Media Watchlist
                  </span>
                </li>
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Book Library
                  </span>
                </li>
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Quick Notes
                  </span>
                </li>
                <li>
                  <a href="/assistant" className={FOOTER_LINK_ITEM}>
                    ChatGPT/Gemini Plugin
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className={FOOTER_COL_LABEL}>Resources</span>
              <ul className="flex list-none flex-col gap-[11px] p-0">
                <li>
                  <a
                    href="https://github.com/fal3n-4ngel/PHub-Dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    GitHub Repo ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/fal3n-4ngel/PHub-Dashboard#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    Self-Host Guide ↗
                  </a>
                </li>
                <li>
                  <a
                    href="/api/openapi.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    OpenAPI Spec ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/fal3n-4ngel/PHub-Dashboard/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    Report an Issue ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-b border-[#e5e3db] py-[26px] pt-7">
            <span className={`${FOOTER_COL_LABEL} mb-0`}>
              Wherever you&apos;re tracking from
            </span>
            <LiveClockStrip />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 py-[22px] max-[900px]:flex-col max-[900px]:items-start">
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10.5px] tracking-[0.6px] text-[#9c9a92] uppercase">
              <span>© {new Date().getFullYear()} PHUB</span>
              <span className="text-[#d1cfc7]">·</span>
              <span>MIT LICENSED</span>
              <span className="text-[#d1cfc7]">·</span>
              <a
                href="https://github.com/fal3n-4ngel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9c9a92] no-underline hover:text-[#1c1b18]"
              >
                @FAL3N-4NGEL
              </a>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.6px] text-[#9c9a92] uppercase">
              <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>

        {/* ─── Decorative bottom band ─── */}
        <div
          className="relative h-[150px] overflow-hidden border-t border-[#e5e3db] bg-[#fafaf8] max-[900px]:h-[100px] [background-image:radial-gradient(#e5e3db_1.5px,transparent_1.5px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,transparent,black_40px)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_40px)]"
          aria-hidden="true"
        >
          <div
            className="absolute right-0 left-0 h-px opacity-60 [background:repeating-linear-gradient(to_right,#c4c2ba_0,#c4c2ba_4px,transparent_4px,transparent_10px)]"
            style={{ top: "28%" }}
          />
          <div
            className="absolute right-0 left-0 h-px opacity-60 [background:repeating-linear-gradient(to_right,#c4c2ba_0,#c4c2ba_4px,transparent_4px,transparent_10px)]"
            style={{ top: "62%" }}
          />
          <div
            className="absolute h-[5px] w-[5px] rounded-full bg-[#b0aea6]"
            style={{ top: "28%", left: "14%" }}
          />
          <div
            className="absolute h-[5px] w-[5px] rounded-full bg-[#b0aea6]"
            style={{ top: "62%", left: "38%" }}
          />
          <div
            className="absolute h-[5px] w-[5px] rounded-full bg-[#b0aea6]"
            style={{ top: "28%", left: "72%" }}
          />
          <div className="absolute bottom-[-70px] left-[-30px] rotate-[12deg] opacity-[0.045]">
            <BentoLogo size={130} color="#1c1b18" />
          </div>
          <div className="absolute -right-10 -bottom-[50px] rotate-[-8deg] opacity-[0.06]">
            <BentoLogo size={260} color="#1c1b18" />
          </div>
        </div>
      </footer>
    </div>
  );
}

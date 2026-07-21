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
  { label: "Local", region: "Your device", zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: "IST", region: "India", zone: "Asia/Kolkata" },
  { label: "UTC", region: "Universal", zone: "UTC" },
];

function useTicker() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ─── ChatGPT demo thread: cycles through example exchanges on a loop ─── */
const GPT_EXAMPLES: { user: string; replyMain: string; replyDetail: string }[] = [
  { user: "spent ₹450 on lunch today", replyMain: "✅ Logged ₹450 to Food", replyDetail: "“Lunch today” · just now" },
  { user: "add dune part two to my watchlist", replyMain: "✅ Added to Plan to Watch", replyDetail: "Dune: Part Two · movie" },
  { user: "how much did I spend this week?", replyMain: "₹3,240 spent this week", replyDetail: "Mostly Food (₹1,850) & Transport (₹640)" },
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
    <div className="chat-thread">
      <div className="chat-bubble chat-user" key={`u-${exampleIndex}`}>
        {example.user}
      </div>
      {phase === "typing" && (
        <div className="chat-bubble chat-assistant chat-typing">
          <span className="chat-dot" /><span className="chat-dot" /><span className="chat-dot" />
        </div>
      )}
      {phase === "reply" && (
        <div className="chat-bubble chat-assistant" key={`a-${exampleIndex}`}>
          <div className="chat-reply-main">{example.replyMain}</div>
          <div className="chat-reply-detail">{example.replyDetail}</div>
        </div>
      )}
    </div>
  );
}

function LiveClockStrip() {
  const now = useTicker();
  return (
    <div className="footer-clocks">
      {CLOCK_ZONES.map((z) => (
        <div className="footer-clock" key={z.zone}>
          <span className="footer-clock-time">
            {now
              ? new Intl.DateTimeFormat("en-GB", { timeZone: z.zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now)
              : "--:--:--"}
          </span>
          <span className="footer-clock-city">{z.label}</span>
          <span className="footer-clock-region">{z.region}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── New logo: bento-grid SVG ─── */
function BentoLogo({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  const gap = size * 0.08;
  const cell = (size - gap * 3) / 2;
  const r = size * 0.12;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* top-left */}
      <rect x={gap} y={gap} width={cell} height={cell} rx={r} fill={color} />
      {/* top-right */}
      <rect x={gap * 2 + cell} y={gap} width={cell} height={cell} rx={r} fill={color} opacity="0.55" />
      {/* bottom-left */}
      <rect x={gap} y={gap * 2 + cell} width={cell} height={cell} rx={r} fill={color} opacity="0.55" />
      {/* bottom-right */}
      <rect x={gap * 2 + cell} y={gap * 2 + cell} width={cell} height={cell} rx={r} fill={color} opacity="0.85" />
    </svg>
  );
}

export default function LandingPage({ onLogin, authError, firebaseAuthReady }: LandingPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [coords, setCoords] = useState<any>(null);

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
          y: r.top + r.height / 2 - cRect.top
        };
      };

      const getL = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.left - cRect.left,
          y: r.top + r.height / 2 - cRect.top
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
        c1_1, c1_2, c2_1, c2_2, c2_3,
        c2_1_r, c2_2_r, c2_3_r, hub_l, hub_r,
        c4_1, c4_2,
        midX, midY
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
    <div className="landing-container">
      <style>{`
        .landing-container {
          background-color: #f4f3ec;
          color: #1c1b18;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          min-height: 100vh;
          padding: 0;
          margin: 0;
          overflow-x: hidden;
          position: relative;
        }

        /* ─── Header ─── */
        .landing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 80px;
          max-width: 1300px;
          margin: 0 auto;
          position: sticky;
          top: 0;
          background-color: rgba(244, 243, 236, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 1000;
          border-bottom: 1px solid rgba(229, 227, 219, 0.6);
        }

        .landing-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 700;
          font-size: 17px;
          letter-spacing: -0.4px;
          text-decoration: none;
          color: #1c1b18;
        }

        .landing-nav {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .landing-nav-link {
          font-size: 13px;
          font-weight: 500;
          color: #6e6c64;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .landing-nav-link:hover {
          color: #1c1b18;
        }

        .login-btn {
          background-color: #1c1b18;
          color: #ffffff;
          border-radius: 9999px;
          padding: 10px 22px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.2s, background-color 0.2s;
          font-family: inherit;
        }

        .login-btn:hover {
          background-color: #31302b;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: 1px solid #e5e3db;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #1c1b18;
        }

        .mobile-nav-drawer {
          display: none;
        }

        /* ─── Hero ─── */
        .hero-section {
          padding: 90px 24px 60px;
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }

        .hero-reveal {
          animation: heroFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #6e6c64;
          background-color: #eae8e0;
          padding: 6px 14px;
          border-radius: 9999px;
          margin-bottom: 28px;
          font-weight: 600;
          border: 1px solid #e5e3db;
        }

        .hero-title {
          font-size: 58px;
          font-weight: 700;
          line-height: 1.04;
          letter-spacing: -2.5px;
          margin-bottom: 16px;
          color: #1c1b18;
        }

        .serif-italic {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          font-weight: 400;
        }

        .hero-subtitle {
          font-size: 16px;
          color: #6e6c64;
          max-width: 580px;
          margin: 0 auto 40px;
          line-height: 1.6;
        }

        .hero-cta-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .hero-cta-primary {
          background-color: #1c1b18;
          color: #fff;
          border: none;
          border-radius: 9999px;
          padding: 13px 28px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hero-cta-primary:hover {
          background-color: #31302b;
          transform: translateY(-1px);
        }

        .hero-cta-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .hero-cta-secondary {
          background-color: transparent;
          color: #1c1b18;
          border: 1.5px solid #d1cfc7;
          border-radius: 9999px;
          padding: 13px 28px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hero-cta-secondary:hover {
          border-color: #1c1b18;
          background-color: rgba(28,27,24,0.04);
        }

        /* ─── Feature Pills ─── */
        .hero-pills {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 28px;
        }

        .hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: #6e6c64;
          background-color: #fff;
          border: 1px solid #e5e3db;
          border-radius: 9999px;
          padding: 5px 12px;
          font-weight: 500;
        }

        /* ─── How it works diagram ─── */
        .diagram-container {
  
        }

        .diagram-inner {
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 12px;
          padding: 40px;
          position: relative;
          box-shadow: 0 4px 16px rgba(110, 108, 100, 0.03);
        }

        .diagram-desktop {
          display: block;
        }

        .diagram-mobile {
          display: none;
        }

        .diagram-grid {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
          height: 400px;
        }

        .diagram-column {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 36px;
          width: 210px;
          min-width: 0;
          z-index: 2;
        }

        .diagram-column.column-middle {
          gap: 22px;
          width: 230px;
        }

        .diagram-column.column-logo {
          width: 120px;
          align-items: center;
        }

        .diagram-node {
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 10px;
          padding: 10px 14px;
          box-shadow: 0 4px 12px -2px rgba(110, 108, 100, 0.05);
          display: flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .diagram-node:hover {
          transform: translateY(-2px);
          border-color: #c4c2ba;
          box-shadow: 0 6px 18px -4px rgba(110, 108, 100, 0.12);
        }

        .node-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }

        .node-text {
          text-align: left;
          min-width: 0;
        }

        .node-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #1c1b18;
          margin-bottom: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .node-desc {
          font-size: 9.5px;
          color: #6e6c64;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .center-hub {
          width: 84px;
          height: 84px;
          background-color: #1c1b18;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 8px 24px rgba(28, 27, 24, 0.16);
          position: relative;
          gap: 3px;
        }

        .center-hub-ring {
          position: absolute;
          top: -6px; left: -6px; right: -6px; bottom: -6px;
          border: 1.5px dashed rgba(28,27,24,0.2);
          border-radius: 24px;
          animation: spin-clockwise 25s linear infinite;
        }

        .hub-label {
          font-family: monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .connections-svg {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        @keyframes flowDash {
          to {
            stroke-dashoffset: -20;
          }
        }

        .connections-svg path {
          stroke: #3b82f6;
          stroke-width: 1.5;
          stroke-dasharray: 5 5;
          animation: flowDash 1.2s linear infinite;
        }

        /* ─── Mobile Diagram styles ─── */
        @media (max-width: 768px) {
          .diagram-desktop {
            display: none;
          }

          .diagram-mobile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            position: relative;
            z-index: 2;
          }

          .diagram-container {
            padding: 30px 16px;
          }

          .mobile-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            gap: 10px;
          }

          .mobile-row {
            display: flex;
            gap: 10px;
            width: 100%;
          }

          .mobile-row > * {
            flex: 1;
            min-width: 0;
          }

          .mobile-flow-line {
            width: 2px;
            height: 24px;
            background: repeating-linear-gradient(to bottom, #c4c2ba, #c4c2ba 3px, transparent 3px, transparent 6px);
          }

          .mobile-node-title {
            font-size: 11px;
            font-weight: 700;
            color: #1c1b18;
          }
        }

        /* ─── Diagram labels ─── */
        .feature-num {
          font-family: monospace;
          font-size: 10px;
          color: #c4c2ba;
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        /* ─── Stats bar ─── */
        .stats-bar {
          background-color: #1c1b18;
          padding: 40px 80px;
          display: flex;
          justify-content: center;
          gap: 80px;
          flex-wrap: wrap;
        }

        .stat-item {
          text-align: center;
          color: #ffffff;
        }

        .stat-num {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -1.5px;
          display: block;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          margin-top: 4px;
          font-family: monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* ─── Setup section ─── */
        .setup-section {
          background-color: #eae8e0;
          padding: 100px 24px;
          border-top: 1px solid #e5e3db;
          border-bottom: 1px solid #e5e3db;
        }

        .setup-container {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .setup-step {
          display: flex;
          gap: 20px;
          margin-bottom: 36px;
        }

        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #1c1b18;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .step-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .step-desc {
          font-size: 13px;
          color: #6e6c64;
          line-height: 1.55;
        }

        .browser-mockup {
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 12px;
          box-shadow: 0 20px 40px -15px rgba(110, 108, 100, 0.14);
          overflow: hidden;
        }

        .browser-header {
          height: 36px;
          background-color: #f4f3ec;
          border-bottom: 1px solid #e5e3db;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 6px;
        }

        .browser-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .browser-title {
          flex: 1;
          text-align: center;
          font-family: monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9c9a92;
          font-weight: 600;
        }

        /* ─── GPT integration section ─── */
        .gpt-check-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 32px;
        }

        .gpt-check-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 14px;
          color: #1c1b18;
          line-height: 1.5;
        }

        .gpt-check-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #10b981;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .chat-thread {
          display: flex;
          flex-direction: column;
          gap: 10px;
          justify-content: flex-end;
          width: 100%;
          height: 100%;
        }

        .chat-bubble {
          max-width: 82%;
          padding: 11px 15px;
          border-radius: 15px;
          font-size: 12.5px;
          line-height: 1.5;
          animation: bubbleIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .chat-user {
          align-self: flex-end;
          background-color: #1c1b18;
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }

        .chat-assistant {
          align-self: flex-start;
          background-color: #f0fdf4;
          color: #14532d;
          border: 1px solid #bbf7d0;
          border-bottom-left-radius: 4px;
        }

        .chat-reply-main {
          font-weight: 700;
        }

        .chat-reply-detail {
          font-size: 11px;
          color: #15803d;
          margin-top: 3px;
          opacity: 0.85;
        }

        .chat-typing {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 13px 15px;
          background-color: #ffffff;
          border: 1px solid #e5e3db;
        }

        .chat-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #9c9a92;
          animation: chatDotBounce 1s infinite ease-in-out both;
        }

        .chat-dot:nth-child(2) { animation-delay: 0.15s; }
        .chat-dot:nth-child(3) { animation-delay: 0.3s; }

        .browser-body {
          padding: 20px;
          background-color: #f4f3ec;
          display: flex;
          gap: 12px;
          height: 280px;
        }

        .mock-sidebar {
          width: 60px;
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mock-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mock-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .mock-card {
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 8px;
          padding: 12px;
          height: 70px;
        }

        .mock-chart {
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 8px;
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 6px;
        }

        .mock-bar-container {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 80px;
        }

        .mock-bar {
          width: 14px;
          background-color: #e39282;
          border-radius: 2px 2px 0 0;
        }

        /* ─── Three-way pricing ─── */
        .pricing-section {
          padding: 100px 24px;
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }

        .pricing-three-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 48px;
          text-align: left;
        }

        .plan-card {
          background-color: #ffffff;
          border: 1px solid #e5e3db;
          border-radius: 16px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          position: relative;
        }

        .plan-card:hover {
          box-shadow: 0 8px 28px -4px rgba(110, 108, 100, 0.12);
          transform: translateY(-2px);
        }

        .plan-card.featured {
          border-color: #1c1b18;
          box-shadow: 0 6px 24px -4px rgba(28, 27, 24, 0.14);
        }

        .plan-badge {
          display: inline-block;
          font-family: monospace;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6e6c64;
          background-color: #eae8e0;
          padding: 4px 10px;
          border-radius: 9999px;
          font-weight: 600;
          margin-bottom: 20px;
          align-self: flex-start;
        }

        .plan-card.featured .plan-badge {
          background-color: #1c1b18;
          color: #ffffff;
        }

        .plan-name {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
          color: #1c1b18;
        }

        .plan-price {
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -2px;
          color: #1c1b18;
          line-height: 1;
          margin-bottom: 4px;
        }

        .plan-price-note {
          font-size: 13px;
          color: #9c9a92;
          font-weight: 400;
          letter-spacing: 0;
        }

        .plan-desc {
          font-size: 13px;
          color: #6e6c64;
          line-height: 1.65;
          margin: 16px 0 0;
          flex: 1;
        }

        .plan-divider {
          height: 1px;
          background-color: #e5e3db;
          margin: 24px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-bottom: 28px;
        }

        .plan-features li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12.5px;
          color: #1c1b18;
          line-height: 1.4;
        }

        .fi-yes  { color: #22c55e; font-size: 13px; flex-shrink: 0; }
        .fi-warn { color: #f59e0b; font-size: 13px; flex-shrink: 0; }
        .fi-note { color: #9c9a92; font-size: 13px; flex-shrink: 0; }

        .plan-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 20px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1.5px solid #1c1b18;
          background-color: transparent;
          color: #1c1b18;
          text-decoration: none;
          font-family: inherit;
          width: 100%;
        }

        .plan-cta:hover:not(:disabled) {
          background-color: #1c1b18;
          color: #ffffff;
        }

        .plan-cta.plan-primary {
          background-color: #1c1b18;
          color: #ffffff;
        }

        .plan-cta.plan-primary:hover:not(:disabled) {
          background-color: #31302b;
        }

        .plan-cta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ─── Footer ─── */
        .footer-wrap {
          background-color: #ffffff;
          border-top: 1px solid #e5e3db;
        }

        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 56px 80px 0;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr;
          gap: 60px;
          padding-bottom: 44px;
          border-bottom: 1px solid #e5e3db;
        }

        /* ─── Live clock strip ─── */
        .footer-clocks-row {
          padding: 28px 0 26px;
          border-bottom: 1px solid #e5e3db;
        }

        .footer-clocks {
          display: flex;
          gap: 0;
          margin-top: 4px;
        }

        .footer-clock {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0 28px;
          border-left: 1px solid #e5e3db;
        }

        .footer-clock:first-child {
          padding-left: 0;
          border-left: none;
        }

        .footer-clock-time {
          font-family: monospace;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #1c1b18;
          font-variant-numeric: tabular-nums;
        }

        .footer-clock-city {
          font-size: 12px;
          font-weight: 600;
          color: #6e6c64;
        }

        .footer-clock-region {
          font-family: monospace;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #b0aea6;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: -0.4px;
          color: #1c1b18;
          text-decoration: none;
        }

        .footer-desc {
          font-size: 13px;
          color: #6e6c64;
          line-height: 1.65;
          max-width: 290px;
        }

        .footer-byline {
          font-size: 12px;
          color: #9c9a92;
        }

        .footer-byline a {
          color: #6e6c64;
          text-decoration: none;
        }

        .footer-byline a:hover {
          color: #1c1b18;
        }

        .footer-col-label {
          font-family: monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9c9a92;
          font-weight: 600;
          margin-bottom: 16px;
          display: block;
        }

        .footer-link-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .footer-link-item {
          font-size: 13px;
          color: #6e6c64;
          text-decoration: none;
          transition: color 0.15s;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .footer-link-item:hover {
          color: #1c1b18;
        }

        .footer-bar {
          padding: 22px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .footer-bar-text {
          font-family: monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #9c9a92;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .footer-bar-text a {
          color: #9c9a92;
          text-decoration: none;
        }

        .footer-bar-text a:hover {
          color: #1c1b18;
        }

        .footer-sep { color: #d1cfc7; }

        .footer-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #9c9a92;
        }

        .footer-green-dot {
          width: 6px;
          height: 6px;
          background-color: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
        }

        /* ─── Decorative bottom band ─── */
        .footer-illustration {
          position: relative;
          height: 150px;
          overflow: hidden;
          background-color: #fafaf8;
          border-top: 1px solid #e5e3db;
          background-image: radial-gradient(#e5e3db 1.5px, transparent 1.5px);
          background-size: 18px 18px;
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 40px);
          mask-image: linear-gradient(to bottom, transparent, black 40px);
        }

        .footer-illustration-mark {
          position: absolute;
          right: -40px;
          bottom: -50px;
          opacity: 0.06;
          transform: rotate(-8deg);
        }

        .footer-illustration-mark.secondary {
          right: auto;
          left: -30px;
          bottom: -70px;
          opacity: 0.045;
          transform: rotate(12deg);
        }

        .footer-signal-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: repeating-linear-gradient(to right, #c4c2ba 0, #c4c2ba 4px, transparent 4px, transparent 10px);
          opacity: 0.6;
        }

        .footer-signal-dot {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #b0aea6;
        }

        /* ─── Animations ─── */
        @keyframes spin-clockwise {
          to { transform: rotate(360deg); }
        }

        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes drawerSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes chatDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }

        /* ─── Responsive ─── */
        @media (max-width: 900px) {
          .landing-header {
            padding: 16px 24px;
          }

          .landing-nav {
            display: none;
          }

          .mobile-menu-btn {
            display: flex;
          }

          .mobile-nav-drawer.open {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 65px;
            left: 16px;
            right: 16px;
            background-color: #ffffff;
            border: 1px solid #e5e3db;
            border-radius: 14px;
            box-shadow: 0 16px 40px -12px rgba(28, 27, 24, 0.18);
            padding: 10px;
            z-index: 999;
            animation: drawerSlideDown 0.2s ease-out both;
          }

          .mobile-nav-drawer .landing-nav-link,
          .mobile-nav-drawer .login-btn {
            width: 100%;
            padding: 13px 14px;
            border-radius: 9px;
            font-size: 14px;
          }

          .mobile-nav-drawer .landing-nav-link:hover {
            background-color: #f4f3ec;
          }

          .mobile-nav-drawer .login-btn {
            justify-content: center;
            margin-top: 4px;
          }

          .hero-title {
            font-size: 40px;
            letter-spacing: -1.8px;
          }

          .diagram-grid {
            flex-direction: column;
            gap: 40px;
          }

          .diagram-column {
            width: 100%;
          }

          .connections-svg {
            display: none;
          }

          .setup-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .stats-bar {
            padding: 40px 24px;
            gap: 40px;
          }

          .pricing-three-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
            margin-left: auto;
            margin-right: auto;
          }

          .plan-card.featured {
            order: -1;
          }

          .footer-inner {
            padding: 48px 24px 0;
          }

          .footer-grid {
            grid-template-columns: 1fr;
            gap: 36px;
            padding-bottom: 36px;
          }

          .footer-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .footer-clocks {
            flex-wrap: wrap;
            row-gap: 16px;
          }

          .footer-clock {
            padding: 0 20px 0 0;
            flex: 1 1 40%;
          }

          .footer-clock:nth-child(2) {
            border-left: 1px solid #e5e3db;
            padding-left: 20px;
          }

          .footer-illustration {
            height: 100px;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 32px;
            letter-spacing: -1.5px;
          }

          .hero-section {
            padding: 60px 16px 40px;
          }

          .plan-card {
            padding: 24px;
          }

          .plan-price {
            font-size: 30px;
          }

          .diagram-container {
            padding: 28px 20px;
          }
        }
      `}</style>

      {/* ─── Header ─── */}
      <header className="landing-header">
        <a href="#" className="landing-logo">
          <BentoLogo size={22} color="#1c1b18" />
          <span>Phub Dashboard</span>
        </a>
        <nav className="landing-nav">
          <a href="#how-it-works" className="landing-nav-link">How It Works</a>
          <a href="#chatgpt" className="landing-nav-link">ChatGPT</a>
          <a href="#setup" className="landing-nav-link">Self-Host</a>
          <a href="#pricing" className="landing-nav-link">Pricing</a>
          <a href="https://github.com/fal3n-4ngel/PHub-Dashboard" target="_blank" rel="noopener noreferrer" className="landing-nav-link">GitHub ↗</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="login-btn" onClick={onLogin} disabled={!firebaseAuthReady}>
            <span>Get started</span>
            <span style={{ fontSize: "14px" }}>→</span>
          </button>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileNavOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
        <nav className={`mobile-nav-drawer ${mobileNavOpen ? "open" : ""}`}>
          <a href="#how-it-works" className="landing-nav-link" onClick={() => setMobileNavOpen(false)}>How It Works</a>
          <a href="#chatgpt" className="landing-nav-link" onClick={() => setMobileNavOpen(false)}>ChatGPT</a>
          <a href="#setup" className="landing-nav-link" onClick={() => setMobileNavOpen(false)}>Self-Host</a>
          <a href="#pricing" className="landing-nav-link" onClick={() => setMobileNavOpen(false)}>Pricing</a>
          <a href="https://github.com/fal3n-4ngel/PHub-Dashboard" target="_blank" rel="noopener noreferrer" className="landing-nav-link" onClick={() => setMobileNavOpen(false)}>GitHub ↗</a>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="hero-section">
        <span className="hero-badge hero-reveal" style={{ animationDelay: "0.02s" }}>
          <BentoLogo size={12} color="#6e6c64" />
          Self-hostable · Open source · Private
        </span>
        <h1 className="hero-title hero-reveal" style={{ animationDelay: "0.08s" }}>
          One dashboard.<br />
          <span className="serif-italic">Everything you track.</span>
        </h1>
        <p className="hero-subtitle hero-reveal" style={{ animationDelay: "0.14s" }}>
          Consolidate your media watchlists, track daily expenses with custom salary cycles, maintain a book library, and keep a scratchpad — all stored privately in your own database.
        </p>
        <div className="hero-cta-row hero-reveal" style={{ animationDelay: "0.2s" }}>
          <button className="hero-cta-primary" onClick={onLogin} disabled={!firebaseAuthReady}>
            Start for free
            <span>→</span>
          </button>
          <a href="https://github.com/fal3n-4ngel/PHub-Dashboard" target="_blank" rel="noopener noreferrer" className="hero-cta-secondary">
            View on GitHub
          </a>
        </div>
        <div className="hero-pills hero-reveal" style={{ animationDelay: "0.26s" }}>
          <span className="hero-pill">💸 Expense Ledger</span>
          <span className="hero-pill">🎬 Media Watchlist</span>
          <span className="hero-pill">📚 Book Library</span>
          <span className="hero-pill">✏️ Quick Notes</span>
          <span className="hero-pill">🌸 AniList sync</span>
          <span className="hero-pill">🎯 Trakt sync</span>
          <span className="hero-pill">🎞️ Letterboxd import</span>
          <span className="hero-pill">🤖 Custom LLM Sync (Gemini/ChatGPT)</span>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="hero-section" style={{ paddingTop: 0 }}>
        <div className="diagram-container" id="dg-container">
          <div className="diagram-inner">
          
          {/* ── DESKTOP VIEW ── */}
          <div className="diagram-desktop">
            {coords && (
              <svg className="connections-svg">
                {/* Column 1 → Merge Point */}
                <path d={`M ${coords.c1_1.x} ${coords.c1_1.y} C ${(coords.c1_1.x + coords.midX)/2} ${coords.c1_1.y}, ${(coords.c1_1.x + coords.midX)/2} ${coords.midY}, ${coords.midX} ${coords.midY}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <path d={`M ${coords.c1_2.x} ${coords.c1_2.y} C ${(coords.c1_2.x + coords.midX)/2} ${coords.c1_2.y}, ${(coords.c1_2.x + coords.midX)/2} ${coords.midY}, ${coords.midX} ${coords.midY}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <circle cx={coords.midX} cy={coords.midY} r="3" fill="#c4c2ba" />

                {/* Merge Point → Column 2 Lefts */}
                <path d={`M ${coords.midX} ${coords.midY} C ${(coords.midX + coords.c2_1.x)/2} ${coords.midY}, ${(coords.midX + coords.c2_1.x)/2} ${coords.c2_1.y}, ${coords.c2_1.x} ${coords.c2_1.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <path d={`M ${coords.midX} ${coords.midY} C ${(coords.midX + coords.c2_2.x)/2} ${coords.midY}, ${(coords.midX + coords.c2_2.x)/2} ${coords.c2_2.y}, ${coords.c2_2.x} ${coords.c2_2.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <path d={`M ${coords.midX} ${coords.midY} C ${(coords.midX + coords.c2_3.x)/2} ${coords.midY}, ${(coords.midX + coords.c2_3.x)/2} ${coords.c2_3.y}, ${coords.c2_3.x} ${coords.c2_3.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />

                {/* Column 2 Rights → Hub Left */}
                <path d={`M ${coords.c2_1_r.x} ${coords.c2_1_r.y} C ${(coords.c2_1_r.x + coords.hub_l.x)/2} ${coords.c2_1_r.y}, ${(coords.c2_1_r.x + coords.hub_l.x)/2} ${coords.hub_l.y}, ${coords.hub_l.x} ${coords.hub_l.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <path d={`M ${coords.c2_2_r.x} ${coords.c2_2_r.y} C ${(coords.c2_2_r.x + coords.hub_l.x)/2} ${coords.c2_2_r.y}, ${(coords.c2_2_r.x + coords.hub_l.x)/2} ${coords.hub_l.y}, ${coords.hub_l.x} ${coords.hub_l.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <path d={`M ${coords.c2_3_r.x} ${coords.c2_3_r.y} C ${(coords.c2_3_r.x + coords.hub_l.x)/2} ${coords.c2_3_r.y}, ${(coords.c2_3_r.x + coords.hub_l.x)/2} ${coords.hub_l.y}, ${coords.hub_l.x} ${coords.hub_l.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />

                {/* Hub Right → Column 4 Lefts */}
                <path d={`M ${coords.hub_r.x} ${coords.hub_r.y} C ${(coords.hub_r.x + coords.c4_1.x)/2} ${coords.hub_r.y}, ${(coords.hub_r.x + coords.c4_1.x)/2} ${coords.c4_1.y}, ${coords.c4_1.x} ${coords.c4_1.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
                <path d={`M ${coords.hub_r.x} ${coords.hub_r.y} C ${(coords.hub_r.x + coords.c4_2.x)/2} ${coords.hub_r.y}, ${(coords.hub_r.x + coords.c4_2.x)/2} ${coords.c4_2.y}, ${coords.c4_2.x} ${coords.c4_2.y}`} stroke="#d1cfc7" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
              </svg>
            )}

            <div className="diagram-grid">
              {/* Column 1: Incoming */}
              <div className="diagram-column">
                <span className="feature-num">INCOMING</span>
                
                <div className="diagram-node" id="dg-c1-n1">
                  <div className="node-icon" style={{ backgroundColor: "#ede9fe" }}>☁️</div>
                  <div className="node-text">
                    <div className="node-title">External Sync</div>
                    <div className="node-desc">Trakt & AniList APIs</div>
                  </div>
                </div>

                <div className="diagram-node" id="dg-c1-n2">
                  <div className="node-icon" style={{ backgroundColor: "#fef9c3" }}>✍️</div>
                  <div className="node-text">
                    <div className="node-title">Local Entries</div>
                    <div className="node-desc">Expenses, logs & notes</div>
                  </div>
                </div>
              </div>

              {/* Column 2: What Phub Handles */}
              <div className="diagram-column column-middle">
                <span className="feature-num">WHAT PHUB HANDLES</span>

                <div className="diagram-node" id="dg-c2-n1">
                  <div className="node-icon" style={{ backgroundColor: "#e39282" }}>📊</div>
                  <div className="node-text">
                    <div className="node-title">Expense Analytics</div>
                    <div className="node-desc">Salary cycles & categories</div>
                  </div>
                </div>

                <div className="diagram-node" id="dg-c2-n2">
                  <div className="node-icon" style={{ backgroundColor: "#dbeafe" }}>🎬</div>
                  <div className="node-text">
                    <div className="node-title">Media Sync engine</div>
                    <div className="node-desc">Trakt OAuth updates</div>
                  </div>
                </div>

                <div className="diagram-node" id="dg-c2-n3">
                  <div className="node-icon" style={{ backgroundColor: "#f0fdf4" }}>📚</div>
                  <div className="node-text">
                    <div className="node-title">Reading library</div>
                    <div className="node-desc">OpenLibrary cataloging</div>
                  </div>
                </div>
              </div>

              {/* Column 3: Phub Logo Hub */}
              <div className="diagram-column column-logo">
                <span className="feature-num">PHUB ENGINE</span>
                <div className="center-hub" id="dg-hub">
                  <div className="center-hub-ring" />
                  <BentoLogo size={24} color="#ffffff" />
                  <span className="hub-label">Hub</span>
                </div>
              </div>

              {/* Column 4: Canvas / Result */}
              <div className="diagram-column">
                <span className="feature-num">RESULT</span>

                <div className="diagram-node" id="dg-c4-n1">
                  <div className="node-icon" style={{ backgroundColor: "#d1b89a" }}>📱</div>
                  <div className="node-text">
                    <div className="node-title">Dashboard Canvas</div>
                    <div className="node-desc">Interactive dashboard UI</div>
                  </div>
                </div>

                <div className="diagram-node" id="dg-c4-n2" style={{ border: "1.5px solid #3b82f6", boxShadow: "0 4px 12px rgba(59,130,246,0.08)" }}>
                  <div className="node-icon" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>💬</div>
                  <div className="node-text">
                    <div className="node-title">LLM Sync client</div>
                    <div className="node-desc">Gemini, ChatGPT, Claude</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── MOBILE VIEW (Clean stacked workflow) ── */}
          <div className="diagram-mobile">
            {/* Step 1: Incoming */}
            <div className="mobile-group">
              <span className="feature-num">INCOMING</span>
              <div className="mobile-row">
                <div className="diagram-node">
                  <div className="node-title" style={{ fontSize: "11px", display: "flex", gap: "6px" }}>☁️ <span>APIs</span></div>
                </div>
                <div className="diagram-node">
                  <div className="node-title" style={{ fontSize: "11px", display: "flex", gap: "6px" }}>✍️ <span>Local</span></div>
                </div>
              </div>
            </div>

            <div className="mobile-flow-line" />

            {/* Step 2: Processing */}
            <div className="mobile-group">
              <span className="feature-num">WHAT PHUB HANDLES</span>
              <div className="diagram-node">
                <div className="node-icon" style={{ backgroundColor: "#e39282", width: "20px", height: "20px", fontSize: "11px" }}>📊</div>
                <span className="mobile-node-title">Expense Analytics</span>
              </div>
              <div className="diagram-node">
                <div className="node-icon" style={{ backgroundColor: "#dbeafe", width: "20px", height: "20px", fontSize: "11px" }}>🎬</div>
                <span className="mobile-node-title">Media Sync engine</span>
              </div>
              <div className="diagram-node">
                <div className="node-icon" style={{ backgroundColor: "#f0fdf4", width: "20px", height: "20px", fontSize: "11px" }}>📚</div>
                <span className="mobile-node-title">Reading library</span>
              </div>
            </div>

            <div className="mobile-flow-line" />

            {/* Step 3: Logo */}
            <div className="mobile-group">
              <span className="feature-num">PHUB ENGINE</span>
              <div className="center-hub">
                <BentoLogo size={22} color="#ffffff" />
                <span className="hub-label" style={{ fontSize: "8px" }}>Hub</span>
              </div>
            </div>

            <div className="mobile-flow-line" />

            {/* Step 4: Result */}
            <div className="mobile-group">
              <span className="feature-num">RESULT</span>
              <div className="mobile-row">
                <div className="diagram-node">
                  <span className="mobile-node-title">📱 Dashboard UI</span>
                </div>
                <div className="diagram-node" style={{ border: "1px solid #3b82f6" }}>
                  <span className="mobile-node-title" style={{ color: "#1d4ed8" }}>💬 Gemini / GPT</span>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      </section>

      {/* ─── ChatGPT & LLM integration section ─── */}
      <section id="chatgpt" className="setup-section">
        <div className="setup-container">
          <div>
            <span className="hero-badge" style={{ backgroundColor: "#f4f3ec", marginBottom: "28px" }}>🤖 OpenAPI compliant</span>
            <h2 className="hero-title" style={{ fontSize: "40px", textAlign: "left", marginBottom: "20px" }}>
              Connect any LLM.<br />
              <span className="serif-italic">Gemini, ChatGPT, or Claude.</span>
            </h2>
            <p className="step-desc" style={{ fontSize: "14px", marginBottom: "32px", maxWidth: "440px" }}>
              Every route in this API exposes a clean OpenAPI spec. Import the schema into Gemini Gems, ChatGPT Actions, or Claude Projects to log expenses, update your watchlist, or query analytics in plain English.
            </p>
            <ul className="gpt-check-list">
              <li className="gpt-check-item">
                <span className="gpt-check-icon">✓</span>
                Works with Gemini Gems, ChatGPT Custom GPTs, and Claude Projects
              </li>
              <li className="gpt-check-item">
                <span className="gpt-check-icon">✓</span>
                Use LLMs on your phone or laptop to track everything on the go
              </li>
              <li className="gpt-check-item">
                <span className="gpt-check-icon">✓</span>
                Natural language recognition — "I spent 400 on transit" maps instantly
              </li>
            </ul>
            <a href="/gpt" className="hero-cta-primary" style={{ display: "inline-flex" }}>
              See the setup guide
              <span>→</span>
            </a>
          </div>

          <div className="browser-mockup">
            <div className="browser-header">
              <div className="browser-dot" style={{ backgroundColor: "#ff5f56" }} />
              <div className="browser-dot" style={{ backgroundColor: "#ffbd2e" }} />
              <div className="browser-dot" style={{ backgroundColor: "#27c93f" }} />
              <span className="browser-title">ChatGPT · Phub</span>
            </div>
            <div className="browser-body" style={{ alignItems: "flex-end" }}>
              <ChatDemo />
            </div>
          </div>
        </div>
      </section>



      {/* ─── Setup section ─── */}
      <section id="setup" className="setup-section">
        <div className="setup-container">
                    <div className="browser-mockup">
            <div className="browser-header">
              <div className="browser-dot" style={{ backgroundColor: "#ff5f56" }} />
              <div className="browser-dot" style={{ backgroundColor: "#ffbd2e" }} />
              <div className="browser-dot" style={{ backgroundColor: "#27c93f" }} />
            </div>
            <div className="browser-body">
              <div className="mock-sidebar">
                <div style={{ height: "14px", backgroundColor: "#1c1b18", borderRadius: "4px" }} />
                <div style={{ height: "8px", width: "80%", backgroundColor: "#eae8e0", borderRadius: "4px", marginTop: "10px" }} />
                <div style={{ height: "8px", width: "65%", backgroundColor: "#eae8e0", borderRadius: "4px" }} />
                <div style={{ height: "8px", width: "70%", backgroundColor: "#eae8e0", borderRadius: "4px" }} />
              </div>
              <div className="mock-main">
                <div className="mock-grid">
                  <div className="mock-card">
                    <div style={{ height: "6px", width: "40px", backgroundColor: "#eae8e0", marginBottom: "6px", borderRadius: "3px" }} />
                    <div style={{ height: "14px", width: "70px", backgroundColor: "#1c1b18", borderRadius: "3px" }} />
                  </div>
                  <div className="mock-card">
                    <div style={{ height: "6px", width: "30px", backgroundColor: "#eae8e0", marginBottom: "6px", borderRadius: "3px" }} />
                    <div style={{ height: "14px", width: "50px", backgroundColor: "#b3666b", borderRadius: "3px" }} />
                  </div>
                  <div className="mock-card">
                    <div style={{ height: "6px", width: "40px", backgroundColor: "#eae8e0", marginBottom: "6px", borderRadius: "3px" }} />
                    <div style={{ height: "14px", width: "60px", backgroundColor: "#e39282", borderRadius: "3px" }} />
                  </div>
                </div>
                <div className="mock-chart">
                  <div style={{ height: "8px", width: "80px", backgroundColor: "#eae8e0", alignSelf: "flex-start", marginBottom: "8px", borderRadius: "3px" }} />
                  <div className="mock-bar-container">
                    <div className="mock-bar" style={{ height: "40px" }} />
                    <div className="mock-bar" style={{ height: "70px", backgroundColor: "#1c1b18" }} />
                    <div className="mock-bar" style={{ height: "55px", backgroundColor: "#d1b89a" }} />
                    <div className="mock-bar" style={{ height: "20px" }} />
                    <div className="mock-bar" style={{ height: "85px", backgroundColor: "#1c1b18" }} />
                    <div className="mock-bar" style={{ height: "60px" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <span className="hero-badge" style={{ backgroundColor: "#f4f3ec", marginBottom: "28px" }}>Minimal Setup</span>
            <h2 className="hero-title" style={{ fontSize: "40px", textAlign: "left", marginBottom: "40px" }}>
              If you can clone a repo,<br />
              <span className="serif-italic">you can self-host this.</span>
            </h2>
            <div className="setup-step">
              <span className="step-number">1</span>
              <div>
                <h4 className="step-title">Fork & deploy to Vercel</h4>
                <p className="step-desc">Click the deploy button in the GitHub README. Vercel sets up CI/CD automatically in under 2 minutes.</p>
              </div>
            </div>
            <div className="setup-step">
              <span className="step-number">2</span>
              <div>
                <h4 className="step-title">Create a Firebase project</h4>
                <p className="step-desc">Add your Firebase config as Vercel env vars. Firestore and Auth initialize on first login — no manual schema setup.</p>
              </div>
            </div>
            <div className="setup-step">
              <span className="step-number">3</span>
              <div>
                <h4 className="step-title">Connect your API keys</h4>
                <p className="step-desc">Optionally add AniList, Trakt, and TMDb keys to unlock full sync. Everything else works without them.</p>
              </div>
            </div>
          </div>


        </div>
      </section>

      {/* ─── Three-way pricing ─── */}
      <section id="pricing" className="pricing-section">
        <span className="hero-badge">Three ways in</span>
        <h2 className="hero-title" style={{ fontSize: "44px", marginBottom: "12px" }}>
          Pick your setup.<br />
          <span className="serif-italic">All are welcome.</span>
        </h2>
        <p className="hero-subtitle" style={{ marginBottom: 0 }}>
          No feature gates. No paywalls on your own data. Use the hosted version, self-deploy for full privacy, or fork and make it yours.
        </p>

        <div className="pricing-three-grid">
          {/* ── Card 1: Cloud hosted ── */}
          <div className="plan-card">
            <span className="plan-badge">Free · Now</span>
            <p className="plan-name">Cloud Hosted</p>
            <p className="plan-price">₹0 <span className="plan-price-note">/ now</span></p>
            <p className="plan-desc">
              Sign in instantly and use my shared Vercel + Firebase instance. No setup, no downloads. Free right now — if traffic grows I may add ads or a small fee to cover hosting.
            </p>
            <div className="plan-divider" />
            <ul className="plan-features">
              <li><span className="fi-yes">✓</span> Instant access, zero setup</li>
              <li><span className="fi-yes">✓</span> Google sign-in</li>
              <li><span className="fi-yes">✓</span> Always updated</li>
              <li><span className="fi-warn">○</span> Shared hosting instance</li>
              <li><span className="fi-warn">○</span> May add ads / fee later</li>
            </ul>
            {authError && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#dc2626", marginBottom: "12px" }}>
                {authError}
              </div>
            )}
            <button className="plan-cta" onClick={onLogin} disabled={!firebaseAuthReady}>
              Sign in with Google →
            </button>
          </div>

          {/* ── Card 2: Self-hosted (featured) ── */}
          <div className="plan-card featured">
            <span className="plan-badge">Recommended · Free Forever</span>
            <p className="plan-name">Self-Hosted</p>
            <p className="plan-price">₹0 <span className="plan-price-note">forever</span></p>
            <p className="plan-desc">
              Deploy your own instance on Vercel + Firebase in ~5 minutes. Your expenses, watchlist, and notes stay entirely in your private database — never shared, never monetised.
            </p>
            <div className="plan-divider" />
            <ul className="plan-features">
              <li><span className="fi-yes">✓</span> Your data, your servers</li>
              <li><span className="fi-yes">✓</span> Private Firebase database</li>
              <li><span className="fi-yes">✓</span> Zero ads, forever</li>
              <li><span className="fi-yes">✓</span> Free on Firebase Spark plan</li>
              <li><span className="fi-yes">✓</span> Full env control</li>
            </ul>
            <a href="https://github.com/fal3n-4ngel/PHub-Dashboard#readme" target="_blank" rel="noopener noreferrer" className="plan-cta plan-primary">
              View Setup Guide →
            </a>
          </div>

          {/* ── Card 3: Fork & build ── */}
          <div className="plan-card">
            <span className="plan-badge">MIT License</span>
            <p className="plan-name">Fork & Build</p>
            <p className="plan-price" style={{ fontSize: "26px", letterSpacing: "-0.5px" }}>Open Source</p>
            <p className="plan-desc">
              Clone the full repo, gut it, add your own modules, redesign it. Built on Next.js + Firebase — a solid base for any personal dashboard or productivity app.
            </p>
            <div className="plan-divider" />
            <ul className="plan-features">
              <li><span className="fi-yes">✓</span> Full codebase access</li>
              <li><span className="fi-yes">✓</span> MIT licensed</li>
              <li><span className="fi-yes">✓</span> Next.js + Firebase stack</li>
              <li><span className="fi-note">→</span> PRs & feedback welcome</li>
              <li><span className="fi-note">→</span> ⭐ Star if it helped you</li>
            </ul>
            <a href="https://github.com/fal3n-4ngel/PHub-Dashboard" target="_blank" rel="noopener noreferrer" className="plan-cta">
              View on GitHub →
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer-wrap">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="footer-logo">
                <BentoLogo size={18} color="#1c1b18" />
                Phub Dashboard
              </a>
              <p className="footer-desc">
                A private tracking dashboard for media watchlists, daily expenses, book reading, and notes. Built for self-hosters and privacy-first users.
              </p>
              <p className="footer-byline">
                Built by <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer">{AUTHOR.name}</a>
                {" "}· <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer">@{AUTHOR.githubHandle}</a>
              </p>
            </div>

            <div>
              <span className="footer-col-label">Product</span>
              <ul className="footer-link-list">
                <li><span className="footer-link-item" onClick={onLogin}>Expense Ledger</span></li>
                <li><span className="footer-link-item" onClick={onLogin}>Media Watchlist</span></li>
                <li><span className="footer-link-item" onClick={onLogin}>Book Library</span></li>
                <li><span className="footer-link-item" onClick={onLogin}>Quick Notes</span></li>
                <li><a href="/gpt" className="footer-link-item">ChatGPT Plugin</a></li>
              </ul>
            </div>

            <div>
              <span className="footer-col-label">Resources</span>
              <ul className="footer-link-list">
                <li>
                  <a href="https://github.com/fal3n-4ngel/PHub-Dashboard" target="_blank" rel="noopener noreferrer" className="footer-link-item">
                    GitHub Repo ↗
                  </a>
                </li>
                <li>
                  <a href="https://github.com/fal3n-4ngel/PHub-Dashboard#readme" target="_blank" rel="noopener noreferrer" className="footer-link-item">
                    Self-Host Guide ↗
                  </a>
                </li>
                <li>
                  <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="footer-link-item">
                    OpenAPI Spec ↗
                  </a>
                </li>
                <li>
                  <a href="https://github.com/fal3n-4ngel/PHub-Dashboard/issues" target="_blank" rel="noopener noreferrer" className="footer-link-item">
                    Report an Issue ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-clocks-row">
            <span className="footer-col-label" style={{ marginBottom: "0" }}>Wherever you're tracking from</span>
            <LiveClockStrip />
          </div>

          <div className="footer-bar">
            <div className="footer-bar-text">
              <span>© {new Date().getFullYear()} PHUB</span>
              <span className="footer-sep">·</span>
              <span>MIT LICENSED</span>
              <span className="footer-sep">·</span>
              <a href="https://github.com/fal3n-4ngel" target="_blank" rel="noopener noreferrer">@FAL3N-4NGEL</a>
            </div>
            <div className="footer-status">
              <div className="footer-green-dot" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>

        {/* ─── Decorative bottom band ─── */}
        <div className="footer-illustration" aria-hidden="true">
          <div className="footer-signal-line" style={{ top: "28%" }} />
          <div className="footer-signal-line" style={{ top: "62%" }} />
          <div className="footer-signal-dot" style={{ top: "28%", left: "14%" }} />
          <div className="footer-signal-dot" style={{ top: "62%", left: "38%" }} />
          <div className="footer-signal-dot" style={{ top: "28%", left: "72%" }} />
          <div className="footer-illustration-mark secondary">
            <BentoLogo size={130} color="#1c1b18" />
          </div>
          <div className="footer-illustration-mark">
            <BentoLogo size={260} color="#1c1b18" />
          </div>
        </div>
      </footer>
    </div>
  );
}

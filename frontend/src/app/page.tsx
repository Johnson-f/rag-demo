"use client";

import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0a0c10",
  surface: "#0f1117",
  surfaceHover: "#141720",
  border: "#1e2330",
  borderLight: "#262d3d",
  accent: "#f5a623",
  accentDim: "#c07d10",
  accentGlow: "rgba(245,166,35,0.12)",
  green: "#00d68f",
  greenDim: "rgba(0,214,143,0.12)",
  red: "#ff4c6a",
  redDim: "rgba(255,76,106,0.1)",
  blue: "#4d9fff",
  blueDim: "rgba(77,159,255,0.1)",
  purple: "#9d7fee",
  text: "#e2e8f0",
  textMuted: "#8892a4",
  textDim: "#4a5568",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: ${COLORS.bg}; color: ${COLORS.text}; font-family: 'DM Sans', sans-serif; overflow: hidden; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${COLORS.surface}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${COLORS.borderLight}; }

  .syne { font-family: 'Syne', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    from { background-position: -200% 0; }
    to { background-position: 200% 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes flow {
    0% { stroke-dashoffset: 1000; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes count-up {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-in { animation: slide-in 0.35s ease forwards; }
  .spinner { animation: spin 1s linear infinite; }
  .live-dot { animation: pulse-dot 1.5s ease infinite; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 14px; border-radius: 8px;
    cursor: pointer; transition: all 0.15s;
    color: ${COLORS.textMuted}; font-size: 13.5px;
    font-weight: 400; border: 1px solid transparent;
  }
  .nav-item:hover { background: ${COLORS.surfaceHover}; color: ${COLORS.text}; }
  .nav-item.active {
    background: ${COLORS.accentGlow}; color: ${COLORS.accent};
    border-color: rgba(245,166,35,0.2);
  }

  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 8px; border: none;
    cursor: pointer; font-size: 13px; font-weight: 500;
    font-family: 'DM Sans', sans-serif; transition: all 0.15s;
  }
  .btn-primary {
    background: ${COLORS.accent}; color: #0a0c10;
  }
  .btn-primary:hover { background: #f9b84a; transform: translateY(-1px); }
  .btn-ghost {
    background: transparent; color: ${COLORS.textMuted};
    border: 1px solid ${COLORS.border};
  }
  .btn-ghost:hover { background: ${COLORS.surfaceHover}; color: ${COLORS.text}; border-color: ${COLORS.borderLight}; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  .card {
    background: ${COLORS.surface}; border: 1px solid ${COLORS.border};
    border-radius: 12px; transition: all 0.2s;
  }
  .card:hover { border-color: ${COLORS.borderLight}; }

  .tag {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 100px;
    font-size: 11px; font-weight: 500;
    font-family: 'DM Mono', monospace; letter-spacing: 0.02em;
  }
  .tag-green { background: ${COLORS.greenDim}; color: ${COLORS.green}; }
  .tag-amber { background: ${COLORS.accentGlow}; color: ${COLORS.accent}; }
  .tag-blue { background: ${COLORS.blueDim}; color: ${COLORS.blue}; }
  .tag-red { background: ${COLORS.redDim}; color: ${COLORS.red}; }
  .tag-purple { background: rgba(157,127,238,0.12); color: ${COLORS.purple}; }

  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    display: inline-block;
  }

  .progress-bar {
    height: 3px; border-radius: 2px;
    background: ${COLORS.border};
    overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, ${COLORS.accent}, #f9b84a);
    transition: width 0.6s ease;
  }

  .input {
    background: ${COLORS.bg}; border: 1px solid ${COLORS.border};
    border-radius: 8px; color: ${COLORS.text};
    font-family: 'DM Sans', sans-serif; font-size: 13.5px;
    padding: 10px 14px; width: 100%; outline: none;
    transition: border-color 0.15s;
  }
  .input:focus { border-color: ${COLORS.accent}; }
  .input::placeholder { color: ${COLORS.textDim}; }

  .textarea {
    background: ${COLORS.bg}; border: 1px solid ${COLORS.border};
    border-radius: 8px; color: ${COLORS.text};
    font-family: 'DM Mono', monospace; font-size: 12.5px;
    padding: 12px 14px; width: 100%; outline: none;
    transition: border-color 0.15s; resize: none; line-height: 1.7;
  }
  .textarea:focus { border-color: ${COLORS.accent}; }
  .textarea::placeholder { color: ${COLORS.textDim}; }

  .tooltip {
    position: absolute; bottom: calc(100% + 8px); left: 50%;
    transform: translateX(-50%);
    background: #1e2330; border: 1px solid ${COLORS.borderLight};
    color: ${COLORS.text}; font-size: 11.5px;
    padding: 5px 10px; border-radius: 6px; white-space: nowrap;
    pointer-events: none; z-index: 100;
  }

  .node {
    background: ${COLORS.surface}; border: 1px solid ${COLORS.border};
    border-radius: 10px; padding: 12px 16px;
    position: relative; cursor: pointer;
    transition: all 0.2s; min-width: 160px;
  }
  .node:hover { border-color: ${COLORS.accent}; box-shadow: 0 0 20px ${COLORS.accentGlow}; }
  .node.active { border-color: ${COLORS.accent}; box-shadow: 0 0 20px ${COLORS.accentGlow}; }

  .connector-line {
    stroke: ${COLORS.borderLight}; stroke-width: 2;
    fill: none; stroke-dasharray: 6 4;
    animation: flow 8s linear infinite;
  }
  .connector-active {
    stroke: ${COLORS.accent}; opacity: 0.5;
  }
`;

// ─── Icons ─────────────────────────────────────────────────────────────────

const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    cpu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/></svg>,
    grid: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    brain: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M9.5 2a2.5 2.5 0 0 1 5 0c1-.2 3 .4 3 2.5 0 .7-.2 1.3-.5 1.8A3 3 0 0 1 19 9c0 1-.4 2-1 2.6a3 3 0 0 1-.5 4.4c-.3 2.5-2.5 4-4.5 4s-4.2-1.5-4.5-4A3 3 0 0 1 8 11.6 3 3 0 0 1 7 9c0-1.2.6-2.2 1.5-2.7-.3-.5-.5-1.1-.5-1.8C8 2.4 10 2 10 2z"/></svg>,
    play: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pause: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    arrow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    book: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    market: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    database: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    layers: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    sparkle: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
    terminal: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    workflow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="16" y="16" width="5" height="5"/><path d="M5.5 8v3c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V8"/><line x1="18.5" y1="13" x2="18.5" y2="16"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  };
  return icons[name] || null;
};

// ─── Data ──────────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: 1, name: "Daily Universe Scanner", status: "running",
    category: "scanner", icon: "filter", color: COLORS.green,
    desc: "Scans 12,000+ stocks against full CANSLIM/Trend Template criteria. Outputs 30–50 ranked candidates.",
    schedule: "6:30 AM daily", lastRun: "2m ago", nextRun: "23h 58m",
    runsToday: 1, successRate: 98.2, stocks: 41, tags: ["auto-execute"],
    activity: [72, 65, 78, 80, 41, 55, 62, 77, 84, 41],
  },
  {
    id: 2, name: "Pre-Market Briefing", status: "running",
    category: "summary", icon: "market", color: COLORS.blue,
    desc: "Generates a morning digest: futures, watchlist gaps, sector rotation, earnings, and overnight news.",
    schedule: "6:00 AM daily", lastRun: "1h ago", nextRun: "22h 45m",
    runsToday: 1, successRate: 100, stocks: null, tags: ["auto-execute"],
    activity: [88, 91, 85, 93, 88, 100, 95, 88, 91, 100],
  },
  {
    id: 3, name: "Focus List Curator", status: "paused",
    category: "scanner", icon: "sparkle", color: COLORS.accent,
    desc: "Narrows scanner output to 5–10 actionable names by scoring proximity to breakout and base quality.",
    schedule: "9:25 AM daily", lastRun: "Yesterday", nextRun: "Paused",
    runsToday: 0, successRate: 94.1, stocks: 7, tags: ["needs-approval"],
    activity: [5, 7, 6, 8, 9, 7, 5, 0, 0, 0],
  },
  {
    id: 4, name: "Market Direction (M)", status: "running",
    category: "analysis", icon: "chart", color: COLORS.purple,
    desc: "Tracks distribution days, follow-through days, and breadth to output daily market status and exposure level.",
    schedule: "4:15 PM daily", lastRun: "3h ago", nextRun: "13h 20m",
    runsToday: 1, successRate: 100, stocks: null, tags: ["auto-execute"],
    activity: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  },
  {
    id: 5, name: "Post-Market Journal", status: "idle",
    category: "journal", icon: "book", color: COLORS.textMuted,
    desc: "Auto-syncs daily trades, captures charts, tags setup type, and calculates R-multiple performance.",
    schedule: "4:15 PM weekdays", lastRun: "Yesterday", nextRun: "13h 22m",
    runsToday: 0, successRate: 97.7, stocks: null, tags: ["needs-approval"],
    activity: [1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
  },
];

const TEMPLATES = [
  {
    id: "t1", name: "Daily Universe Scanner", category: "Scanner", icon: "filter",
    color: COLORS.green, uses: 1842,
    desc: "Full CANSLIM criteria scan: EPS>25%, price above rising SMAs, RS>70, within 25% of 52w high.",
    tags: ["Auto-execute", "Free"],
    steps: ["Fetch universe", "Apply EPS filters", "Check Trend Template", "Score & rank", "Notify"],
  },
  {
    id: "t2", name: "Pre-Market Briefing", category: "Summary", icon: "market",
    color: COLORS.blue, uses: 1621,
    desc: "Morning digest with futures direction, watchlist gaps, sector rotation, and earnings calendar.",
    tags: ["Auto-execute", "Free"],
    steps: ["Fetch overnight data", "Scan watchlist gaps", "Sector analysis", "Compile briefing", "Deliver"],
  },
  {
    id: "t3", name: "Focus List Curator", category: "Scanner", icon: "sparkle",
    color: COLORS.accent, uses: 983,
    desc: "Takes scanner results and narrows to 5-10 actionable names scored on breakout proximity and base quality.",
    tags: ["Needs approval", "Pro"],
    steps: ["Load scan results", "Score setups", "Rank candidates", "Generate reasoning", "Review & approve"],
  },
  {
    id: "t4", name: "Market Direction (M)", category: "Analysis", icon: "chart",
    color: COLORS.purple, uses: 1204,
    desc: "Tracks distribution days, follow-through days, and breadth to define market status and exposure level.",
    tags: ["Auto-execute", "Free"],
    steps: ["Fetch index data", "Count distribution", "Check breadth", "Classify status", "Set exposure level"],
  },
  {
    id: "t5", name: "Post-Market Journal", category: "Journal", icon: "book",
    color: "#60a5fa", uses: 744,
    desc: "Auto-syncs broker trades, tags setup types, calculates R-multiple, and generates performance analytics.",
    tags: ["Needs approval", "Pro"],
    steps: ["Sync broker trades", "Fetch chart screenshots", "Tag setups", "Calculate R-multiple", "Save journal"],
  },
  {
    id: "t6", name: "Base Pattern Detector", category: "Analysis", icon: "eye",
    color: "#f472b6", uses: 612,
    desc: "Monitors watchlist for cup-with-handle, VCP, flat base, and double bottom pattern formations.",
    tags: ["Needs approval", "Premium"],
    steps: ["Load watchlist", "Run pattern ML", "Score completion", "Project pivots", "Alert & confirm"],
  },
];

const MEMORY_ITEMS = [
  { key: "Trading Style", value: "Breakout buyer, Stage 2 stocks only", confidence: 94, source: "92 trades analyzed" },
  { key: "Risk Per Trade", value: "0.8–1.2% portfolio heat", confidence: 87, source: "Position history" },
  { key: "Preferred Sectors", value: "Technology (42%), Healthcare (28%)", confidence: 91, source: "Win-rate by sector" },
  { key: "Optimal Holding", value: "2–4 weeks (avg 18 days)", confidence: 82, source: "Closed trades" },
  { key: "RS Threshold", value: "Buys above 85 (not standard 70)", confidence: 78, source: "Observed behavior" },
  { key: "EPS Preference", value: ">40% growth (standard is 25%)", confidence: 73, source: "Screener history" },
  { key: "Weak Day", value: "Win rate drops 38% on Fridays", confidence: 65, source: "Trade journal" },
  { key: "Market Condition", value: "Waits for FTD before full exposure", confidence: 88, source: "Cash timing" },
];

const ACTIVITY_LOG = [
  { time: "06:30", agent: "Daily Universe Scanner", action: "Completed scan", detail: "41 stocks matched criteria", type: "success" },
  { time: "06:00", agent: "Pre-Market Briefing", action: "Delivered briefing", detail: "7 watchlist stocks gapping up", type: "success" },
  { time: "05:59", agent: "Pre-Market Briefing", action: "Fetching data", detail: "Pulling overnight futures & news", type: "info" },
  { time: "Yesterday 16:18", agent: "Post-Market Journal", action: "Awaiting approval", detail: "3 trades synced, review required", type: "pending" },
  { time: "Yesterday 16:15", agent: "Market Direction (M)", action: "Status updated", detail: "Confirmed Uptrend → 100% exposure", type: "success" },
  { time: "Yesterday 14:02", agent: "Focus List Curator", action: "Paused by user", detail: "User paused until next week", type: "warning" },
];

// ─── Micro-components ──────────────────────────────────────────────────────

const SparkLine = ({ data, color = COLORS.accent }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
      <circle cx={parseFloat(pts.split(" ").at(-1).split(",")[0])} cy={parseFloat(pts.split(" ").at(-1).split(",")[1])} r="2.5" fill={color} />
    </svg>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    running: { color: COLORS.green, label: "Running" },
    paused: { color: COLORS.accent, label: "Paused" },
    idle: { color: COLORS.textDim, label: "Idle" },
    error: { color: COLORS.red, label: "Error" },
  };
  const { color, label } = map[status] || map.idle;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span className="status-dot live-dot" style={{ background: color }} />
      <span style={{ color, fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{label}</span>
    </span>
  );
};

// ─── Views ─────────────────────────────────────────────────────────────────

const AgentCard = ({ agent, onClick }) => (
  <div
    onClick={() => onClick(agent)}
    className="card"
    style={{ padding: "18px 20px", cursor: "pointer", animation: "slide-in 0.3s ease forwards" }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: `${agent.color}18`,
          border: `1px solid ${agent.color}35`, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon name={agent.icon} size={15} color={agent.color} />
        </div>
        <div>
          <div className="syne" style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{agent.name}</div>
          <StatusBadge status={agent.status} />
        </div>
      </div>
      <SparkLine data={agent.activity} color={agent.status === "running" ? agent.color : COLORS.textDim} />
    </div>
    <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 14 }}>{agent.desc}</p>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {agent.tags.map(t => (
          <span key={t} className={`tag ${t === "auto-execute" ? "tag-green" : t === "needs-approval" ? "tag-amber" : "tag-blue"}`}>
            {t}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: COLORS.textMuted, fontFamily: "'DM Mono', monospace" }}>
        <span>Last: <span style={{ color: COLORS.text }}>{agent.lastRun}</span></span>
        <span style={{ color: COLORS.accent }}>{agent.successRate}% ✓</span>
      </div>
    </div>
  </div>
);

const AgentsView = ({ onNewAgent, onSelectAgent }) => (
  <div style={{ padding: "24px 28px" }} className="animate-in">
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
      <div>
        <h1 className="syne" style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>My Agents</h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>
          <span style={{ color: COLORS.green, fontWeight: 500 }}>3 running</span> · 1 paused · 1 idle
        </p>
      </div>
      <button className="btn btn-primary" onClick={onNewAgent}>
        <Icon name="plus" size={14} color="#0a0c10" />
        New Agent
      </button>
    </div>

    {/* Stats strip */}
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28
    }}>
      {[
        { label: "Agent Runs Today", value: "3", sub: "+0 pending", color: COLORS.text },
        { label: "Stocks Identified", value: "41", sub: "From universe scan", color: COLORS.green },
        { label: "Avg Success Rate", value: "98.0%", sub: "Last 30 days", color: COLORS.accent },
        { label: "Approvals Needed", value: "1", sub: "Post-market journal", color: COLORS.blue },
      ].map(s => (
        <div key={s.label} className="card" style={{ padding: "14px 18px" }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: s.color, marginBottom: 2 }}>{s.value}</div>
          <div style={{ fontSize: 11.5, color: COLORS.textMuted }}>{s.label}</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>{s.sub}</div>
        </div>
      ))}
    </div>

    {/* Agent list */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {AGENTS.map(a => <AgentCard key={a.id} agent={a} onClick={onSelectAgent} />)}
    </div>
  </div>
);

// ─── Agent Detail ───────────────────────────────────────────────────────────

const AgentDetail = ({ agent, onBack }) => {
  const [tab, setTab] = useState("overview");
  return (
    <div style={{ padding: "24px 28px" }} className="animate-in">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: "6px 10px" }}>
          <Icon name="arrow" size={13} color={COLORS.textMuted} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: `${agent.color}18`,
          border: `1px solid ${agent.color}35`, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon name={agent.icon} size={17} color={agent.color} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 className="syne" style={{ fontSize: 18, fontWeight: 700 }}>{agent.name}</h2>
          <StatusBadge status={agent.status} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="refresh" size={13} /> Run Now</button>
          {agent.status === "running"
            ? <button className="btn btn-ghost btn-sm"><Icon name="pause" size={13} /> Pause</button>
            : <button className="btn btn-primary btn-sm"><Icon name="play" size={13} /> Resume</button>
          }
          <button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 0 }}>
        {["overview", "runs", "config"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "8px 16px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            color: tab === t ? COLORS.accent : COLORS.textMuted,
            borderBottom: `2px solid ${tab === t ? COLORS.accent : "transparent"}`,
            marginBottom: -1, transition: "all 0.15s",
            textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Schedule</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Icon name="clock" size={14} color={COLORS.accent} />
                <span className="mono" style={{ fontSize: 13, color: COLORS.text }}>{agent.schedule}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>Next run in <span style={{ color: COLORS.accent }}>{agent.nextRun}</span></div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Success Rate (30d)</div>
              <div className="mono" style={{ fontSize: 32, fontWeight: 400, color: COLORS.green, marginBottom: 8 }}>{agent.successRate}%</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${agent.successRate}%` }} /></div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Autonomy Mode</div>
              {agent.tags.map(t => (
                <span key={t} className={`tag ${t === "auto-execute" ? "tag-green" : "tag-amber"}`} style={{ marginRight: 6 }}>
                  {t === "auto-execute" ? "🤖 Auto-Execute" : "👤 Needs Approval"}
                </span>
              ))}
              <p style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 10, lineHeight: 1.6 }}>
                {agent.tags.includes("auto-execute") ? "This agent runs and delivers results without requiring your approval." : "This agent presents recommendations for your review before acting."}
              </p>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Activity Log</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {ACTIVITY_LOG.filter(l => l.agent === agent.name).concat(ACTIVITY_LOG.slice(0, 3)).slice(0, 6).map((l, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "10px 0",
                  borderBottom: `1px solid ${COLORS.border}`, alignItems: "flex-start"
                }}>
                  <span className="mono" style={{ fontSize: 10, color: COLORS.textDim, minWidth: 70, marginTop: 2 }}>{l.time}</span>
                  <span className="status-dot" style={{
                    background: l.type === "success" ? COLORS.green : l.type === "pending" ? COLORS.accent : l.type === "warning" ? "#ff9d4a" : COLORS.blue,
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 500 }}>{l.action}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>{l.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "runs" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Run History</div>
          {[
            { date: "Today 06:30", duration: "1m 42s", result: "41 stocks", status: "success" },
            { date: "Yesterday 06:30", duration: "1m 38s", result: "36 stocks", status: "success" },
            { date: "Feb 17 06:30", duration: "2m 01s", result: "29 stocks", status: "success" },
            { date: "Feb 16 06:30", duration: "1m 55s", result: "Error: data feed", status: "error" },
            { date: "Feb 15 06:30", duration: "1m 44s", result: "52 stocks", status: "success" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${COLORS.border}`, gap: 14 }}>
              <span className="status-dot" style={{ background: r.status === "success" ? COLORS.green : COLORS.red, flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 12, color: COLORS.textMuted, minWidth: 140 }}>{r.date}</span>
              <span style={{ fontSize: 12, color: COLORS.text, flex: 1 }}>{r.result}</span>
              <span className="mono" style={{ fontSize: 11, color: COLORS.textDim }}>{r.duration}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agent Prompt</div>
            <div className="textarea" style={{ display: "block", minHeight: 100, fontSize: 12, lineHeight: 1.7, color: COLORS.textMuted }}>
              Scan the full US stock universe. Filter for stocks where: quarterly EPS growth exceeds 25%, annual earnings are accelerating, price is above the 50, 150, and 200-day SMAs, the RS Rating is above 70, and the stock is within 25% of its 52-week high. Score results by composite score and return the top 50 ranked candidates...
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Personalization Overrides</div>
            {[
              { label: "EPS Growth Threshold", value: "40%", note: "Learned from behavior (default: 25%)" },
              { label: "RS Rating Minimum", value: "85", note: "Learned from behavior (default: 70)" },
              { label: "Exclude", value: "Energy, Utilities", note: "Set by user preference" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: COLORS.text }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>{f.note}</div>
                </div>
                <span className="mono" style={{ fontSize: 13, color: COLORS.accent }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Template Library ───────────────────────────────────────────────────────

const TemplateCard = ({ tpl, onUse }) => (
  <div className="card" style={{ padding: 18, animation: "slide-in 0.3s ease forwards" }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: `${tpl.color}18`,
        border: `1px solid ${tpl.color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <Icon name={tpl.icon} size={15} color={tpl.color} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="syne" style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{tpl.name}</div>
        <div style={{ display: "flex", gap: 5 }}>
          <span className="tag tag-blue">{tpl.category}</span>
          {tpl.tags.map(t => <span key={t} className={`tag ${t === "Free" ? "tag-green" : t === "Pro" ? "tag-amber" : "tag-purple"}`}>{t}</span>)}
        </div>
      </div>
    </div>
    <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{tpl.desc}</p>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="mono" style={{ fontSize: 11, color: COLORS.textDim }}>{tpl.uses.toLocaleString()} uses</span>
      <button className="btn btn-ghost btn-sm" onClick={() => onUse(tpl)}>Use Template →</button>
    </div>
  </div>
);

const TemplateView = ({ onUse }) => (
  <div style={{ padding: "24px 28px" }} className="animate-in">
    <div style={{ marginBottom: 28 }}>
      <h1 className="syne" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Template Library</h1>
      <p style={{ fontSize: 13, color: COLORS.textMuted }}>Pre-built CANSLIM agent templates. Deploy in seconds.</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {TEMPLATES.map(t => <TemplateCard key={t.id} tpl={t} onUse={onUse} />)}
    </div>
  </div>
);

// ─── Create Agent ───────────────────────────────────────────────────────────

const STEPS = ["Describe", "Configure", "Schedule", "Review"];

const CreateAgentView = ({ selectedTemplate, onBack }) => {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState(selectedTemplate
    ? `Create an agent based on the "${selectedTemplate.name}" template that ${selectedTemplate.desc.toLowerCase()}`
    : "");
  const [agentName, setAgentName] = useState(selectedTemplate?.name || "");
  const [generating, setGenerating] = useState(false);
  const [autonomy, setAutonomy] = useState("approve");
  const [schedule, setSchedule] = useState("6:30 AM weekdays");

  const EXAMPLE_PROMPTS = [
    "Scan for CANSLIM stocks with EPS >40% that are within 10% of their 52-week high and have RS above 85",
    "Send me a pre-market briefing at 6:15 AM with my watchlist gaps and key sector moves",
    "Generate a weekly portfolio review every Sunday evening with stage analysis for all positions",
  ];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setStep(1); }, 2000);
  };

  return (
    <div style={{ padding: "24px 28px" }} className="animate-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="x" size={13} /></button>
        <h1 className="syne" style={{ fontSize: 20, fontWeight: 700 }}>
          {selectedTemplate ? `Deploy: ${selectedTemplate.name}` : "Create New Agent"}
        </h1>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div onClick={() => i < step && setStep(i)} style={{
              display: "flex", alignItems: "center", gap: 8, cursor: i < step ? "pointer" : "default"
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: i < step ? COLORS.green : i === step ? COLORS.accent : COLORS.border,
                fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                color: i <= step ? "#0a0c10" : COLORS.textDim, transition: "all 0.25s",
              }}>
                {i < step ? <Icon name="check" size={12} color="#0a0c10" /> : i + 1}
              </div>
              <span style={{ fontSize: 12.5, color: i === step ? COLORS.text : COLORS.textMuted, fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 40, height: 1, background: i < step ? COLORS.green : COLORS.border, margin: "0 12px", transition: "all 0.3s" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div style={{ maxWidth: 680 }} className="animate-in">
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agent Name</label>
          </div>
          <input className="input" style={{ marginBottom: 20 }} placeholder="e.g. Morning CANSLIM Scanner" value={agentName} onChange={e => setAgentName(e.target.value)} />

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Describe what this agent should do</label>
          </div>
          <textarea
            className="textarea"
            rows={5}
            placeholder="e.g. Every morning before market open, scan all US stocks for CANSLIM criteria and send me a briefing with the top 20 candidates ranked by composite score..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginBottom: 10 }}>Try an example:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <div key={i} onClick={() => setPrompt(ex)} style={{
                  padding: "10px 14px", border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, cursor: "pointer", fontSize: 12.5, color: COLORS.textMuted,
                  transition: "all 0.15s", background: COLORS.surface,
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}>
                  "{ex}"
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={!prompt.trim() || !agentName.trim() || generating}
            onClick={handleGenerate}
            style={{ opacity: (!prompt.trim() || !agentName.trim()) ? 0.4 : 1 }}
          >
            {generating ? (
              <><svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity="0.3"/><path d="M21 12a9 9 0 0 1-9 9"/></svg> Generating…</>
            ) : (
              <><Icon name="sparkle" size={14} color="#0a0c10" /> Generate Agent</>
            )}
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={{ maxWidth: 700 }} className="animate-in">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.green, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={13} color={COLORS.green} /> Agent workflow generated
            </div>
            <p style={{ fontSize: 13, color: COLORS.textMuted }}>Review the generated workflow below. Drag nodes to reorder or click to edit any step.</p>
          </div>

          {/* Simplified visual workflow */}
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
              {(selectedTemplate?.steps || ["Trigger", "Fetch Data", "Apply Filters", "Score & Rank", "Deliver"]).map((s, i, arr) => (
                <div key={s} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div className="node" style={{ textAlign: "center" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: COLORS.accentGlow,
                      border: `1px solid ${COLORS.accent}35`, display: "flex", alignItems: "center",
                      justifyContent: "center", margin: "0 auto 8px"
                    }}>
                      <span className="mono" style={{ fontSize: 10, color: COLORS.accent }}>{i + 1}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: COLORS.text, fontWeight: 500, whiteSpace: "nowrap" }}>{s}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <div style={{ width: 24, height: 1, background: COLORS.borderLight }} />
                      <Icon name="arrow" size={10} color={COLORS.borderLight} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Autonomy mode */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Autonomy Mode</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { value: "approve", label: "Needs Approval", desc: "Review before any action", icon: "user" },
                { value: "notify", label: "Notify & Run", desc: "Acts then notifies you", icon: "bell" },
                { value: "auto", label: "Fully Autonomous", desc: "Runs without interruption", icon: "cpu" },
              ].map(m => (
                <div key={m.value} onClick={() => setAutonomy(m.value)} style={{
                  padding: "14px 16px", border: `1px solid ${autonomy === m.value ? COLORS.accent : COLORS.border}`,
                  borderRadius: 10, cursor: "pointer", background: autonomy === m.value ? COLORS.accentGlow : "transparent",
                  transition: "all 0.15s",
                }}>
                  <Icon name={m.icon} size={15} color={autonomy === m.value ? COLORS.accent : COLORS.textMuted} />
                  <div style={{ fontSize: 12.5, color: autonomy === m.value ? COLORS.accent : COLORS.text, fontWeight: 600, margin: "8px 0 3px" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setStep(2)}><Icon name="arrow" size={14} color="#0a0c10" /> Continue</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ maxWidth: 560 }} className="animate-in">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Schedule</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["6:00 AM daily", "6:30 AM weekdays", "9:25 AM weekdays", "4:15 PM weekdays", "8:00 PM daily", "Custom…"].map(s => (
                <div key={s} onClick={() => setSchedule(s)} style={{
                  padding: "12px 16px", border: `1px solid ${schedule === s ? COLORS.accent : COLORS.border}`,
                  borderRadius: 9, cursor: "pointer", fontSize: 13,
                  color: schedule === s ? COLORS.accent : COLORS.textMuted,
                  background: schedule === s ? COLORS.accentGlow : "transparent",
                  transition: "all 0.15s", fontFamily: "'DM Mono', monospace",
                }}>{s}</div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Trigger Events</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["RS Rating new high on watchlist stock", "Price breakout on 2x+ average volume", "Distribution day count reaches 5"].map(t => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: `1px solid ${COLORS.border}`,
                    background: COLORS.accentGlow, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="check" size={10} color={COLORS.accent} />
                  </div>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setStep(3)}><Icon name="arrow" size={14} color="#0a0c10" /> Continue</button>
        </div>
      )}

      {step === 3 && (
        <div style={{ maxWidth: 600 }} className="animate-in">
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: COLORS.accentGlow, border: `1px solid ${COLORS.accent}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="sparkle" size={18} color={COLORS.accent} />
              </div>
              <div>
                <div className="syne" style={{ fontSize: 16, fontWeight: 700 }}>{agentName}</div>
                <span className="tag tag-amber" style={{ marginTop: 3 }}>Ready to deploy</span>
              </div>
            </div>
            {[
              { label: "Schedule", value: schedule },
              { label: "Autonomy", value: { approve: "Needs Approval", notify: "Notify & Run", auto: "Fully Autonomous" }[autonomy] },
              { label: "Workflow Steps", value: `${selectedTemplate?.steps?.length || 5} steps` },
              { label: "Personalization", value: "Memory enabled — adapts to your trading style" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
                <span style={{ color: COLORS.textMuted }}>{r.label}</span>
                <span style={{ color: COLORS.text, fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 14 }}
            onClick={onBack}>
            <Icon name="play" size={14} color="#0a0c10" /> Deploy Agent
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Memory View ─────────────────────────────────────────────────────────────

const MemoryView = () => (
  <div style={{ padding: "24px 28px" }} className="animate-in">
    <div style={{ marginBottom: 28 }}>
      <h1 className="syne" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Personal Intelligence</h1>
      <p style={{ fontSize: 13, color: COLORS.textMuted }}>What Deepvue has learned about your trading style from 92 trades across 8 months.</p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Memory items */}
      <div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Learned Preferences</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MEMORY_ITEMS.map((m, i) => (
            <div key={i} className="card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{m.key}</span>
                <span className="mono" style={{ fontSize: 11, color: COLORS.textDim }}>{m.confidence}% confidence</span>
              </div>
              <div style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 500, marginBottom: 8 }}>{m.value}</div>
              <div className="progress-bar" style={{ height: 2 }}>
                <div className="progress-fill" style={{ width: `${m.confidence}%` }} />
              </div>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6 }}>Source: {m.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Performance by Sector</div>
          {[
            { sector: "Technology", wr: 68, avg: "+2.4R" },
            { sector: "Healthcare", wr: 61, avg: "+1.9R" },
            { sector: "Consumer Disc.", wr: 54, avg: "+1.4R" },
            { sector: "Industrials", wr: 44, avg: "+0.6R" },
            { sector: "Financials", wr: 39, avg: "-0.2R" },
          ].map(s => (
            <div key={s.sector} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{s.sector}</span>
                <span className="mono" style={{ fontSize: 12, color: s.avg.startsWith("+") ? COLORS.green : COLORS.red }}>{s.avg}</span>
              </div>
              <div className="progress-bar">
                <div style={{ height: "100%", borderRadius: 2, background: s.wr > 55 ? COLORS.green : s.wr > 45 ? COLORS.accent : COLORS.red, width: `${s.wr}%`, transition: "width 0.6s" }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Memory Layers</div>
          {[
            { name: "Working Memory", desc: "Current session context", icon: "zap", color: COLORS.green, items: "Active" },
            { name: "Episodic Memory", desc: "Past trades & events", icon: "clock", color: COLORS.blue, items: "92 entries" },
            { name: "Semantic Memory", desc: "Learned preferences", icon: "brain", color: COLORS.accent, items: "8 facts" },
            { name: "Procedural Memory", desc: "Refined workflows", icon: "layers", color: COLORS.purple, items: "4 patterns" },
          ].map(l => (
            <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${l.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={l.icon} size={13} color={l.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{l.desc}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: l.color }}>{l.items}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 18, background: `${COLORS.accentGlow}`, border: `1px solid rgba(245,166,35,0.25)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="sparkle" size={14} color={COLORS.accent} />
            <span style={{ fontSize: 12.5, color: COLORS.accent, fontWeight: 600 }}>Agent Improvement</span>
          </div>
          <p style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.65 }}>
            Your agents' recommendation acceptance rate has improved from <strong style={{ color: COLORS.text }}>58%</strong> to <strong style={{ color: COLORS.green }}>74%</strong> over the past 3 months as the system learned your preferences.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("agents");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleUseTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setCreating(true);
    setView("agents");
  };

  const handleBack = () => {
    setSelectedAgent(null);
    setCreating(false);
    setSelectedTemplate(null);
  };

  const NAV = [
    { id: "agents", icon: "cpu", label: "My Agents" },
    { id: "templates", icon: "grid", label: "Templates" },
    { id: "memory", icon: "brain", label: "Personal Intelligence" },
    { id: "activity", icon: "zap", label: "Activity" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", height: "100vh", background: COLORS.bg, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{
          width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="cpu" size={15} color="#0a0c10" />
              </div>
              <div>
                <div className="syne" style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>Deepvue</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: -1 }}>Agent Builder</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: "12px 10px", flex: 1 }}>
            {NAV.map(n => (
              <div key={n.id} className={`nav-item ${view === n.id && !creating && !selectedAgent ? "active" : ""}`}
                onClick={() => { setView(n.id); setCreating(false); setSelectedAgent(null); }}>
                <Icon name={n.icon} size={15} />
                {n.label}
              </div>
            ))}
          </nav>

          {/* Market status */}
          <div style={{ padding: "14px 18px", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Market Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span className="status-dot live-dot" style={{ background: COLORS.green }} />
              <span style={{ fontSize: 12, color: COLORS.green, fontWeight: 500 }}>Market Open</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>{time} ET</div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Market Direction</div>
              <span className="tag tag-green" style={{ fontSize: 10 }}>✓ Confirmed Uptrend</span>
            </div>
          </div>

          {/* User */}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0a0c10"
            }}>JD</div>
            <div>
              <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>Jake D.</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted }}>Pro Plan</div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {creating || selectedTemplate ? (
            <CreateAgentView selectedTemplate={selectedTemplate} onBack={handleBack} />
          ) : selectedAgent ? (
            <AgentDetail agent={selectedAgent} onBack={handleBack} />
          ) : view === "agents" ? (
            <AgentsView onNewAgent={() => setCreating(true)} onSelectAgent={setSelectedAgent} />
          ) : view === "templates" ? (
            <TemplateView onUse={handleUseTemplate} />
          ) : view === "memory" ? (
            <MemoryView />
          ) : (
            // Activity log view
            <div style={{ padding: "24px 28px" }} className="animate-in">
              <h1 className="syne" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Activity</h1>
              <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 28 }}>Live feed of all agent actions across your workspace.</p>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {ACTIVITY_LOG.map((l, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                    borderBottom: i < ACTIVITY_LOG.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  }}>
                    <span className="mono" style={{ fontSize: 11, color: COLORS.textDim, minWidth: 120 }}>{l.time}</span>
                    <span className="status-dot" style={{
                      background: l.type === "success" ? COLORS.green : l.type === "pending" ? COLORS.accent : l.type === "warning" ? "#ff9d4a" : COLORS.blue,
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: 12.5, color: COLORS.textMuted, minWidth: 180 }}>{l.agent}</span>
                    <span style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>{l.action}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{l.detail}</span>
                    {l.type === "pending" && (
                      <button className="btn btn-primary btn-sm">Review →</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

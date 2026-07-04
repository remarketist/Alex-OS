import type { ReactNode } from "react";

export const DOMAIN_COLORS: Record<string, string> = {
  jobs: "#22d3ee",
  client: "#a78bfa",
  project: "#fbbf24",
  body: "#34d399",
  smoking: "#fb7185",
  journal: "#60a5fa",
  admin: "#94a3b8",
  emotional: "#f472b6",
  backlog: "#64748b",
};

export const DOMAIN_LABELS: Record<string, string> = {
  jobs: "Jobs",
  client: "Client Work",
  project: "Personal Project",
  body: "Body",
  smoking: "Smoking",
  journal: "Journal",
  admin: "Admin",
  emotional: "Reflection",
  backlog: "Backlog",
};

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass ${hover ? "glass-hover" : ""} p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function DomainBadge({ domain }: { domain: string }) {
  const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS.backlog;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color, background: `${color}1a`, border: `1px solid ${color}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {DOMAIN_LABELS[domain] || domain}
    </span>
  );
}

export function LevelBadge({ level, size = "md" }: { level: string; size?: "md" | "lg" }) {
  const colors: Record<string, { c: string; label: string }> = {
    gold: { c: "#f5c451", label: "Gold" },
    silver: { c: "#c0c8d8", label: "Silver" },
    bronze: { c: "#cd9a62", label: "Bronze" },
    below: { c: "#64748b", label: "Below Bronze" },
  };
  const { c, label } = colors[level] || colors.below;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${
        size === "lg" ? "px-3.5 py-1.5 text-xs" : "px-2.5 py-0.5 text-[10px]"
      }`}
      style={{ color: c, background: `${c}1a`, border: `1px solid ${c}40` }}
    >
      {level !== "below" && "◆"} {label}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color = "#22d3ee",
  className = "",
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: pct > 0 ? `0 0 8px ${color}66` : "none",
        }}
      />
    </div>
  );
}

export function ScoreRing({
  score,
  size = 120,
  level = "below",
}: {
  score: number;
  size?: number;
  level?: string;
}) {
  const stroke = size >= 100 ? 9 : 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const levelColor: Record<string, string> = {
    gold: "#f5c451",
    silver: "#c0c8d8",
    bronze: "#cd9a62",
    below: "#22d3ee",
  };
  const color = levelColor[level] || "#22d3ee";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold leading-none" style={{ fontSize: size / 3.6 }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-faint">/100</span>
      </div>
    </div>
  );
}

export function Sparkline({
  data,
  width = 140,
  height = 36,
  color = "#22d3ee",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}55)` }}
      />
      <circle
        cx={pts[pts.length - 1].split(",")[0]}
        cy={pts[pts.length - 1].split(",")[1]}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-mute">{sub}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-1 py-10 text-center">
      <div className="text-sm font-semibold text-mute">{title}</div>
      {hint && <div className="text-xs text-faint">{hint}</div>}
    </div>
  );
}

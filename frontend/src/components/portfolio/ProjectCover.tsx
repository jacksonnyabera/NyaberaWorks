import type { ProjectMotif } from "@/content/projects";
import { cn } from "@/lib/cn";

/**
 * A drawn cover for each project. These are illustrations, not screenshots,
 * so nothing here claims to show a real interface. To show a real screenshot,
 * add an `image` to the project later.
 */
function Motif({ motif }: { motif: ProjectMotif }) {
  const stroke = "#0a6f6a";
  const soft = "#17323f";
  switch (motif) {
    case "listings":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${70 + i * 175} ${90 + (i % 2) * 30})`}>
              <rect width="150" height="190" rx="8" fill={soft} stroke={stroke} strokeWidth="2" />
              <rect x="14" y="14" width="122" height="78" rx="4" fill="#0d2530" stroke={stroke} />
              <path d="M30 80V54l45-26 45 26v26z" fill="none" stroke="#a9c2c8" strokeWidth="3" strokeLinejoin="round" />
              <rect x="14" y="110" width="90" height="8" rx="4" fill="#4a6370" />
              <rect x="14" y="130" width="60" height="8" rx="4" fill="#2b4a58" />
            </g>
          ))}
        </g>
      );
    case "board":
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(60 ${60 + i * 62})`}>
              <rect width="520" height="48" rx="6" fill={soft} stroke={stroke} strokeWidth="1.5" />
              <circle cx="26" cy="24" r="10" fill={stroke} />
              <rect x="50" y="14" width={190 - i * 20} height="8" rx="4" fill="#a9c2c8" />
              <rect x="50" y="29" width="120" height="6" rx="3" fill="#4a6370" />
              <rect x="430" y="14" width="68" height="20" rx="10" fill="none" stroke={stroke} />
            </g>
          ))}
        </g>
      );
    case "ledger":
      return (
        <g>
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={70 + c * 172}
                y={60 + r * 50}
                width="156"
                height="38"
                rx="5"
                fill={soft}
                stroke={r === 1 && c === 2 ? "#e4572e" : stroke}
                strokeWidth={r === 1 && c === 2 ? 2.5 : 1.2}
              />
            )),
          )}
          <path d="M70 330h480" stroke={stroke} strokeWidth="2" strokeDasharray="3 7" />
        </g>
      );
    case "signal":
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 210h110l22-70 40 130 30-60h40l28-40 30 80 24-40h220" stroke={stroke} strokeWidth="4" />
          <path d="M120 320a140 140 0 0 1 380 0" stroke="#4a6370" strokeWidth="14" />
          <path d="M120 320a140 140 0 0 1 150-135" stroke="#e4572e" strokeWidth="14" />
        </g>
      );
    case "pipeline":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={60 + i * 200} y="150" width="130" height="100" rx="8" fill={soft} stroke={stroke} strokeWidth="2" />
              <rect x={80 + i * 200} y="175" width="90" height="8" rx="4" fill="#a9c2c8" />
              <rect x={80 + i * 200} y="195" width="60" height="8" rx="4" fill="#4a6370" />
              {i < 2 ? <path d={`M${192 + i * 200} 200h66`} stroke={stroke} strokeWidth="3" markerEnd="url(#arrow)" /> : null}
            </g>
          ))}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0l10 5-10 5z" fill={stroke} />
            </marker>
          </defs>
        </g>
      );
    case "platform":
    default:
      return (
        <g fill="none" stroke={stroke} strokeWidth="2">
          <rect x="90" y="70" width="440" height="260" rx="10" fill={soft} />
          <path d="M90 110h440" />
          <circle cx="116" cy="90" r="5" fill={stroke} />
          <circle cx="136" cy="90" r="5" fill="#4a6370" stroke="none" />
          <rect x="116" y="140" width="130" height="170" rx="6" />
          <rect x="266" y="140" width="244" height="70" rx="6" />
          <rect x="266" y="230" width="116" height="80" rx="6" />
          <rect x="394" y="230" width="116" height="80" rx="6" />
        </g>
      );
  }
}

export function ProjectCover({ motif, className }: { motif: ProjectMotif; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-card bg-ink", className)} aria-hidden="true">
      <svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <Motif motif={motif} />
      </svg>
    </div>
  );
}

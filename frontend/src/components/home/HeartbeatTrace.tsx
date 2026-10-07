/**
 * The hero's signature element: a heartbeat trace that draws itself once,
 * with the four areas of work labelled on its beats.
 * Pure SVG + CSS, no JavaScript, and it sits still for reduced-motion users.
 */

const beats = [
  { x: 144, label: "Software" },
  { x: 444, label: "Automation" },
  { x: 744, label: "Data" },
  { x: 1044, label: "Biomedical" },
];
const BASE = 130;
const WIDTH = 1200;

function path(): string {
  let d = `M0 ${BASE}`;
  for (const { x } of beats) {
    d +=
      ` H${x - 95}` +
      ` C${x - 85} 112 ${x - 65} 112 ${x - 55} ${BASE}` +
      ` H${x - 30} L${x - 20} 142 L${x} 28 L${x + 14} 160 L${x + 24} ${BASE}` +
      ` H${x + 50} C${x + 70} 98 ${x + 100} 98 ${x + 120} ${BASE}`;
  }
  return `${d} H${WIDTH}`;
}

const DRAW_SECONDS = 2.6;
const START_DELAY = 0.2;
const at = (x: number) => (START_DELAY + (DRAW_SECONDS * x) / WIDTH).toFixed(2);

export function HeartbeatTrace() {
  return (
    <div className="relative" role="img" aria-label="A heartbeat trace labelled Software, Automation, Data and Biomedical">
      <svg viewBox={`0 0 ${WIDTH} 190`} preserveAspectRatio="none" className="h-28 w-full sm:h-40" aria-hidden="true">
        <line x1="0" x2={WIDTH} y1={BASE} y2={BASE} stroke="#c7d5d2" strokeWidth="1" strokeDasharray="2 6" />
        <path
          d={path()}
          pathLength="1"
          className="trace-line"
          fill="none"
          stroke="#0a6f6a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {beats.map(({ x }) => (
          <circle
            key={x}
            cx={x}
            cy={28}
            r="6"
            fill="#e4572e"
            className="trace-label"
            style={{ animationDelay: `${at(x)}s`, transformBox: "fill-box" }}
          />
        ))}
      </svg>
      <ul className="pointer-events-none relative -mt-1 h-8" aria-hidden="true">
        {beats.map(({ x, label }) => (
          <li
            key={label}
            className="trace-label absolute -translate-x-1/2 font-display text-sm font-semibold text-ink sm:text-lg"
            style={{ left: `${(x / WIDTH) * 100}%`, animationDelay: `${at(x)}s` }}
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

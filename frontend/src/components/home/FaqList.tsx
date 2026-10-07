import { faqs } from "@/content/general";

/** Accordion built on native <details>, so it works without JavaScript. */
export function FaqList({ limit }: { limit?: number }) {
  const items = limit ? faqs.slice(0, limit) : faqs;
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex items-center justify-between gap-6 py-4 text-lg font-semibold">
            <span>{item.q}</span>
            <svg
              viewBox="0 0 24 24"
              className="chevron h-5 w-5 shrink-0 text-teal transition-transform"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <p className="max-w-prose pb-5 text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

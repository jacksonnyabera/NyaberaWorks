import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

type Tone = "paper" | "panel" | "ink";

const tones: Record<Tone, string> = {
  paper: "bg-paper text-ink",
  panel: "bg-panel text-ink",
  ink: "bg-ink text-paper on-ink",
};

export function Section({
  id,
  tone = "paper",
  className,
  children,
  labelledBy,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-16 sm:py-24", tones[tone], className)}>
      <Container>{children}</Container>
    </section>
  );
}

/** Heading block used at the top of most sections. */
export function SectionHeading({
  id,
  title,
  intro,
  tone = "paper",
  className,
}: {
  id?: string;
  title: string;
  intro?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 id={id} className="text-3xl sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {intro ? (
        <p className={cn("mt-4 text-lg", tone === "ink" ? "text-mist" : "text-muted")}>{intro}</p>
      ) : null}
    </div>
  );
}

/** Heading for inner pages (h1). */
export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-line bg-paper">
      <div className="ecg-paper absolute inset-0" aria-hidden="true" />
      <Container className="relative py-14 sm:py-20">
        <h1 className="max-w-3xl text-4xl sm:text-5xl md:text-6xl">{title}</h1>
        {intro ? <p className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">{intro}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </Container>
    </header>
  );
}

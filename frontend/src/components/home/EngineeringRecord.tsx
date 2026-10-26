import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Section";

// Every line is true of this repository today: see .github/workflows/ci.yml and docs/15-as-built-status.md.
const checks = [
  { title: "Style and formatting", body: "Ruff for Python, ESLint for TypeScript. A failing check shows up on the push." },
  { title: "Type checking", body: "TypeScript checks the front end; Pydantic validates every request the API accepts." },
  { title: "Automated tests", body: "API tests run against a real PostgreSQL database, including the migrations. Interface tests cover the forms and sign-in." },
  { title: "Production build", body: "The site and the Docker images are built from scratch on every push, so a broken build is caught early." },
];

const safeguards = [
  "Passwords hashed with Argon2id, never stored or logged in plain text",
  "Sign-in attempts limited per account and per visitor",
  "Single-use, time-limited password reset links",
  "Optional two-factor sign-in for the admin account",
  "Database changes made through versioned migrations",
];

function Tick({ className = "text-teal" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="m6 10.2 2.6 2.6L14 7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EngineeringRecord() {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
      <div>
        <SectionHeading
          id="craft-title"
          title="Checked before it ships"
          intro="This site and its client platform are built the way I build for clients: every change goes through the same automated checks, and the safeguards are part of the code, not an afterthought."
        />
        <ul className="mt-8 space-y-3">
          {safeguards.map((s) => (
            <li key={s} className="flex gap-3 text-ink-soft">
              <Tick />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <div className="mt-9">
          <ButtonLink href="/about" variant="secondary">
            About how I work
          </ButtonLink>
        </div>
      </div>

      <div className="on-ink rounded-2xl bg-ink p-6 text-paper shadow-xl sm:p-8" role="group" aria-labelledby="checks-title">
        <h3 id="checks-title" className="flex items-center gap-2.5 text-lg text-paper">
          <span className="h-2.5 w-2.5 rounded-full bg-pulse" aria-hidden="true" />
          Checks that run on every push
        </h3>
        <ol className="mt-6 divide-y divide-white/15">
          {checks.map((c) => (
            <li key={c.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <Tick className="text-teal-tint" />
              <div>
                <p className="font-display text-lg font-semibold text-paper">{c.title}</p>
                <p className="mt-1 text-mist">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

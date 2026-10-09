import Link from "next/link";

import { getServices } from "@/lib/catalog";
import { site } from "@/lib/site";

import { Logo } from "./Logo";

const company = [
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Work" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/quote", label: "Request a quote" },
  { href: "/book", label: "Book a service" },
];

export async function Footer() {
  const services = await getServices();
  const year = new Date().getFullYear();
  const linkClass = "text-mist transition-colors hover:text-white";
  return (
    <footer className="on-ink bg-ink text-paper">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo inverse />
            <p className="mt-4 max-w-xs text-mist">{site.tagline}.</p>
            <p className="mt-2 text-mist">{site.location}.</p>
          </div>

          <nav aria-label="Services">
            <h2 className="text-base font-semibold text-paper">Services</h2>
            <ul className="mt-4 space-y-2.5">
              {services.slice(0, 6).map((s) => (
                <li key={s.slug}>
                  <Link className={linkClass} href={`/services/${s.slug}`}>
                    {s.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="font-medium text-white underline underline-offset-4" href="/services">
                  All services
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="text-base font-semibold text-paper">Company</h2>
            <ul className="mt-4 space-y-2.5">
              {company.map((c) => (
                <li key={c.href}>
                  <Link className={linkClass} href={c.href}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-base font-semibold text-paper">Get in touch</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a className={linkClass} href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </li>
              <li>
                <a className={linkClass} href={site.phoneHref}>
                  {site.phoneDisplay}
                </a>
              </li>
              <li>
                <a className={linkClass} href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
              <li>
                <a className={linkClass} href={site.github} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {site.name}. All rights reserved.
          </p>
          <ul className="flex gap-6">
            <li>
              <Link className={linkClass} href="/privacy">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link className={linkClass} href="/terms">
                Terms of service
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

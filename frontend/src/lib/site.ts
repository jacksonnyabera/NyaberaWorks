/**
 * Single source of truth for NyaberaWorks brand and public business details.
 */
export const site = {
  name: "NyaberaWorks",
  tagline: "Build. Solve. Deliver.",
  description:
    "NyaberaWorks designs and builds practical digital products for growing businesses: websites, custom web applications, data platforms, workflow automation and dependable software integrations.",
  owner: "Jackson Nyabera",
  location: "Kenya",
  // Production domain comes from the environment so nothing is hardcoded.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  email: "maobe928@gmail.com",
  phoneDisplay: "+254 798 304 161",
  phoneE164: "+254798304161",
  phoneHref: "tel:+254798304161",
  // wa.me wants the number in international format with digits only.
  whatsappNumber: "254798304161",
  whatsappGreeting: "Hello NyaberaWorks, I would like to discuss a project.",
  whatsappHref: "https://wa.me/254798304161",
  whatsappChatHref: `https://wa.me/254798304161?text=${encodeURIComponent("Hello NyaberaWorks, I would like to discuss a project.")}`,
  github: "https://github.com/jacksonnyabera",
  locale: "en_KE",
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export const mainNav = [
  { href: "/services", label: "Solutions" },
  { href: "/portfolio", label: "Our work" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

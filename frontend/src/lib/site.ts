/**
 * Single place for business details used across the site (header, footer,
 * contact page, SEO, structured data). Edit values here, nowhere else.
 */

export const site = {
  name: "NyaberaWorks",
  tagline: "Technology, Automation & Biomedical Engineering Solutions",
  description:
    "NyaberaWorks is the independent practice of Jackson Nyabera: websites, web applications, Python backends and automation, data solutions, and biomedical engineering technical support.",
  owner: "Jackson Nyabera",
  location: "Nairobi, Kenya",
  // Production domain comes from the environment so nothing is hardcoded.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  email: "maobe928@gmail.com",
  phoneDisplay: "+254 798 304 161",
  phoneE164: "+254798304161",
  phoneHref: "tel:+254798304161",
  // wa.me wants the number in international format with digits only.
  whatsappNumber: "254798304161",
  whatsappGreeting: "Hello NyaberaWorks, I would like to talk about a project.",
  whatsappHref: "https://wa.me/254798304161",
  whatsappChatHref: `https://wa.me/254798304161?text=${encodeURIComponent("Hello NyaberaWorks, I would like to talk about a project.")}`,
  github: "https://github.com/jacksonnyabera",
  locale: "en_KE",
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export const mainNav = [
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

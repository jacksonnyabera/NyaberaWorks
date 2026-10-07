/**
 * Portfolio content. Only facts that are known are stated here. Add
 * screenshots later by setting `image` (a file in /public) - until then each
 * project shows a drawn cover instead of a fake screenshot.
 */

export type ProjectStatus = "Live" | "In development" | "Built" | "Prototype" | "Learning project";
export type ProjectMotif = "listings" | "platform" | "board" | "ledger" | "signal" | "pipeline";

export type Project = {
  slug: string;
  title: string;
  category: "Web platform" | "Biomedical" | "Backend & data" | "Automation";
  status: ProjectStatus;
  summary: string;
  problem: string;
  solution: string;
  features: string[];
  technologies: string[];
  result: string;
  liveUrl?: string;
  featured?: boolean;
  motif: ProjectMotif;
  caveat?: string;
};

export const projects: Project[] = [
  {
    slug: "nyumbadirect",
    title: "NyumbaDirect",
    category: "Web platform",
    status: "Live",
    summary:
      "A house-hunting platform that connects house hunters directly with landlords and property managers.",
    problem:
      "Finding a house often means going through traditional agents, which adds cost, delay and middlemen between the person who needs a home and the person who owns one.",
    solution:
      "NyumbaDirect lets house hunters find places and reach landlords and property managers directly, reducing dependence on traditional agents.",
    features: [
      "Listings published by landlords and property managers",
      "Direct contact between house hunters and property owners",
      "Built for the Kenyan rental market",
    ],
    technologies: [],
    result: "Live and publicly available at nyumbadirect.co.ke.",
    liveUrl: "https://nyumbadirect.co.ke",
    featured: true,
    motif: "listings",
  },
  {
    slug: "remotehub-kenya",
    title: "RemoteHub Kenya",
    category: "Web platform",
    status: "Built",
    summary: "A full-stack job board for Kenyans looking for remote work, with M-Pesa payments and an admin dashboard.",
    problem:
      "Remote job listings are scattered across the internet and rarely built around how Kenyans search, apply and pay.",
    solution:
      "A job board with accounts, an admin dashboard, a blog and M-Pesa STK Push integration through Safaricom Daraja, written to load quickly on mobile connections.",
    features: [
      "JWT-based sign-in and password reset",
      "M-Pesa STK Push integration (Safaricom Daraja)",
      "Admin dashboard and blog",
      "Cached pages (ISR), compression and debounced search for speed",
      "A go-live guide covering VPS deployment, HTTPS and Kenya Data Protection Act considerations",
    ],
    technologies: ["Next.js 14", "Node.js", "Express", "PostgreSQL", "JWT", "M-Pesa Daraja"],
    result: "Complete full-stack build with a written deployment guide.",
    featured: true,
    motif: "board",
  },
  {
    slug: "hospital-equipment-management",
    title: "Hospital Equipment Management System",
    category: "Biomedical",
    status: "Prototype",
    summary: "A web app that tracks hospital machines, maintenance schedules and repairs in one place.",
    problem:
      "Biomedical equipment is often tracked on paper or in separate spreadsheets, so overdue maintenance and repair history are easy to miss.",
    solution:
      "A single application with a machine inventory, configurable maintenance schedules with automatic due dates, repair logging, and a dashboard that surfaces what needs attention first.",
    features: [
      "Machine cards with serial numbers, category, ward and installation date",
      "Maintenance frequencies with automatic next-due dates and overdue / due-soon flags",
      "Repair log with technician, cost and open or resolved status",
      "Dashboard with attention list, machines by ward and recent activity",
      "Editable wards and equipment categories",
    ],
    technologies: ["React"],
    result: "Working prototype using sample data.",
    featured: true,
    motif: "ledger",
    caveat:
      "Prototype with sample data. A production deployment needs a proper backend and authentication, which are the planned next steps.",
  },
  {
    slug: "nyaberaworks-platform",
    title: "NyaberaWorks",
    category: "Web platform",
    status: "In development",
    summary: "This website and its client platform: services, quotes, bookings and an admin console.",
    problem:
      "A service business needs more than a brochure: visitors should be able to compare services, ask for quotes and book time, and the owner needs to manage it all.",
    solution:
      "A Next.js front end over a FastAPI backend and PostgreSQL database, with enquiry, quote and booking management and an admin console.",
    features: [
      "Public service and portfolio pages built for search",
      "Quote and booking requests stored securely",
      "Client accounts and an admin dashboard",
      "Payments prepared behind a provider-independent design",
    ],
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "FastAPI", "PostgreSQL"],
    result: "Under active development. You are looking at it.",
    featured: false,
    motif: "platform",
  },
  {
    slug: "glycos-clinical-prediction",
    title: "Glycos",
    category: "Backend & data",
    status: "Learning project",
    summary: "An end-to-end clinical prediction system with a REST API, command-line tool and risk gauge.",
    problem:
      "Machine-learning models are hard to evaluate when they live only in a notebook with no way to send them new input.",
    solution:
      "A complete pipeline: a scikit-learn model served through a Flask REST API, a CLI for batch use, and an SVG risk gauge that shows results visually.",
    features: ["Flask REST API", "Command-line interface", "SVG risk gauge", "scikit-learn model"],
    technologies: ["Python", "Flask", "scikit-learn"],
    result: "Complete portfolio project demonstrating a model delivered end to end.",
    motif: "signal",
    caveat: "Educational project. It is not a medical device and must not be used for diagnosis.",
  },
  {
    slug: "python-document-automation",
    title: "Python Document Generation",
    category: "Automation",
    status: "Built",
    summary: "Long-form PDF documents generated with Python and ReportLab, including an Arabic translation.",
    problem:
      "Producing polished, consistently formatted multi-page documents by hand is slow and hard to repeat.",
    solution:
      "A Python script that assembles structured content into formatted PDFs with ReportLab, including right-to-left Arabic text.",
    features: [
      "Two long-form PDF documents produced for a freelance writing project",
      "Consistent layout and typography across pages",
      "Arabic translation support",
    ],
    technologies: ["Python", "ReportLab"],
    result: "Delivered as a completed freelance project.",
    motif: "pipeline",
  },
  {
    slug: "whatsapp-automation-bot",
    title: "WhatsApp Automation Bot",
    category: "Automation",
    status: "Built",
    summary: "A Node.js bot that automates WhatsApp messaging tasks.",
    problem: "Repetitive messaging and replies take time that could be spent on real conversations.",
    solution: "A bot built with whatsapp-web.js that handles routine messaging automatically.",
    features: ["Automated replies and messages", "Runs as a Node.js service"],
    technologies: ["Node.js", "whatsapp-web.js"],
    result: "Working automation project.",
    motif: "pipeline",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

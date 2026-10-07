export const faqs: { q: string; a: string }[] = [
  {
    q: "How does a quote work?",
    a: "Send a quote request with a description of what you need. I review it, ask questions if something is unclear, and reply with a written scope, timeline and price. There is no charge for the quote.",
  },
  {
    q: "How long will my project take?",
    a: "It depends on scope. Each service page shows a typical range. Your quote will give a timeline for your specific project, and any change in scope is agreed before work continues.",
  },
  {
    q: "How do I pay?",
    a: "Payment terms are set in your quote. Online payment through M-Pesa, bank or card and cryptocurrency is being added to this platform. Until it is live, I will confirm a payment method with you directly.",
  },
  {
    q: "Who owns the code and content?",
    a: "Ownership and licensing are agreed in writing in your quote before work starts, so there is no confusion later.",
  },
  {
    q: "Do you work with clients outside Nairobi?",
    a: "Yes. Projects are run remotely using email, calls and shared documents, and I am based in Nairobi, Kenya.",
  },
  {
    q: "Can you work on a site or app someone else built?",
    a: "Often, yes. Send details with your request and I will tell you honestly whether I can help and what a first review would involve.",
  },
  {
    q: "What does biomedical engineering support include?",
    a: "Software tools and documentation for equipment records, maintenance schedules and reporting. It does not replace inspection, calibration or sign-off by licensed engineers where regulations require it.",
  },
  {
    q: "What happens after launch?",
    a: "You receive handover notes and a short support period agreed in the quote. Ongoing changes and monitoring are available as website maintenance.",
  },
];

export const processSteps = [
  {
    title: "Discuss",
    body: "You tell me the problem. I ask questions until I understand who uses the thing, what it must do, and what success looks like.",
  },
  {
    title: "Scope and quote",
    body: "You get a written scope, timeline and price. Nothing starts until you agree to it.",
  },
  {
    title: "Build and review",
    body: "I build in stages and show working progress, so you can correct course early instead of at the end.",
  },
  {
    title: "Launch and support",
    body: "I deploy it, hand over documentation, and stay available for fixes during the agreed support period.",
  },
];

export const reasons = [
  {
    title: "You deal with the person building it",
    body: "No account managers and no hand-offs. The person who scopes your project is the person who writes the code.",
  },
  {
    title: "Plain language, honest estimates",
    body: "You get clear explanations, written scopes, and an honest answer when something is a poor idea or outside what I do.",
  },
  {
    title: "Built to be maintained",
    body: "Tests, documentation and sensible structure, so the work is still understandable in a year, by me or by someone else.",
  },
  {
    title: "Security taken seriously",
    body: "Hashed passwords, server-side validation, secrets kept out of code, and payments verified on the server.",
  },
  {
    title: "Software plus biomedical know-how",
    body: "Studying biomedical engineering while building software means healthcare-related projects start with the right questions.",
  },
];

export const skillGroups = [
  { title: "Backend and data", items: ["Python", "FastAPI", "Flask", "Node.js and Express", "PostgreSQL", "pandas", "scikit-learn"] },
  { title: "Front end", items: ["Next.js", "React", "TypeScript", "Tailwind CSS"] },
  { title: "Integrations and delivery", items: ["REST APIs", "M-Pesa Daraja", "JWT authentication", "Git and GitHub", "Linux VPS deployment"] },
  { title: "Documents and automation", items: ["ReportLab PDF generation", "Spreadsheet automation", "WhatsApp automation", "Technical writing"] },
];

export const budgetOptions = [
  "Under KES 20,000",
  "KES 20,000 to 50,000",
  "KES 50,000 to 150,000",
  "KES 150,000 to 500,000",
  "Over KES 500,000",
  "Not sure yet",
] as const;

export const timeSlots = [
  "Morning (9:00 to 12:00 EAT)",
  "Afternoon (12:00 to 15:00 EAT)",
  "Late afternoon (15:00 to 18:00 EAT)",
] as const;

export const faqs: { q: string; a: string }[] = [
  {
    q: "How does a quote work?",
    a: "Send a quote request with a description of what you need. We review it, ask questions if anything is unclear, and reply with a written scope, timeline and price. There is no charge for the quote.",
  },
  {
    q: "How long will my project take?",
    a: "It depends on scope. Each service page shows a typical range. Your quote will give a timeline for your specific project, and any change in scope is agreed before work continues.",
  },
  {
    q: "How do I pay?",
    a: "Payment terms are set out in your quote. Online payment options are being developed for the platform. Until a payment option is confirmed as live, the available payment method will be agreed directly with you.",
  },
  {
    q: "Who owns the code and content?",
    a: "Ownership and licensing are agreed in writing in your quote before work starts, so there is no confusion later.",
  },
  {
    q: "Do you work with clients outside Kenya?",
    a: "Yes. Projects can be delivered remotely using email, calls and shared documents. NyaberaWorks is based in Kenya and works with clients internationally.",
  },
  {
    q: "Can you work on a site or app someone else built?",
    a: "Often, yes. Share the details with your request and we will assess whether we can help and what an initial review would involve.",
  },
  {
    q: "What does biomedical engineering support include?",
    a: "Where relevant, we can build software tools and documentation for equipment records, maintenance schedules and reporting. This does not replace inspection, calibration or sign-off by licensed engineers where regulations require it.",
  },
  {
    q: "What happens after launch?",
    a: "You receive handover notes and a support period agreed in the quote. Ongoing changes, maintenance and monitoring can also be scoped.",
  },
];

export const processSteps = [
  {
    title: "Understand",
    body: "We learn about the people, process and business problem behind the request, and define what a useful outcome looks like.",
  },
  {
    title: "Scope and plan",
    body: "You receive a written scope, timeline and price. Work begins only after the plan is agreed.",
  },
  {
    title: "Build and review",
    body: "We deliver in clear stages and share working progress, so feedback can shape the result early.",
  },
  {
    title: "Launch and support",
    body: "We deploy the solution, provide handover documentation and agree the right support for what comes next.",
  },
];

export const reasons = [
  {
    title: "Built around real business needs",
    body: "We start with the people who will use the solution, the work they need to do and the outcome the business needs.",
  },
  {
    title: "Clear communication",
    body: "Plain-language explanations, written scopes and honest estimates keep decisions straightforward.",
  },
  {
    title: "Designed to be maintained",
    body: "Sensible architecture, testing and documentation help keep the work understandable and useful over time.",
  },
  {
    title: "Security considered from the start",
    body: "Validation, careful handling of credentials and server-side controls are part of responsible software delivery.",
  },
  {
    title: "Practical engineering",
    body: "We choose tools and approaches for reliability, maintainability and fit — not simply because they are fashionable.",
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

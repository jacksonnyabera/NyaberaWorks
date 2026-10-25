"use client";

import { usePathname } from "next/navigation";

import { site } from "@/lib/site";

// Pages where a sales shortcut would get in the way of signing in or working.
const hiddenOn = ["/admin", "/login", "/register", "/account"];

/** Floating contact shortcut. Starts a chat only; quotes and records stay in the portal. */
export function WhatsAppButton() {
  const pathname = usePathname();
  if (hiddenOn.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  return (
    <a
      href={site.whatsappChatHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#0b6b4f] px-4 text-white shadow-lg transition-colors hover:bg-[#095840] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal/50 print:hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5Z" />
        <path d="M9 9.5c.3 2 2 3.8 4.2 4.6l1.4-1.3-1.9-1-.9.7a4.3 4.3 0 0 1-1.6-1.6l.7-.9-1-1.9L9 9.5Z" fill="currentColor" stroke="none" />
      </svg>
      <span className="hidden text-[0.95rem] font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}

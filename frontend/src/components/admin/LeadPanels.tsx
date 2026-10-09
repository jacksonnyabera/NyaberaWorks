"use client";

import { LeadList, type LeadConfig } from "@/components/admin/LeadList";
import { formatDate } from "@/lib/admin-lists";
import type { BookingRow, ContactMessageRow, QuoteRequestRow } from "@/lib/admin-api";

// Keep the status lists in sync with backend/app/modules/leads/models.py.
const messages: LeadConfig<ContactMessageRow> = {
  kind: "contact-messages",
  noun: "message",
  statuses: ["new", "read", "replied", "archived", "spam"],
  details: (r) => [["Message", r.message]],
};

const quotes: LeadConfig<QuoteRequestRow> = {
  kind: "quote-requests",
  noun: "quote request",
  statuses: ["new", "reviewing", "quoted", "accepted", "declined", "archived"],
  details: (r) => [
    ["Budget", r.budget],
    ...(r.deadline ? ([["Deadline", formatDate(r.deadline)]] as [string, string][]) : []),
    ["Project description", r.description],
  ],
};

const bookings: LeadConfig<BookingRow> = {
  kind: "bookings",
  noun: "booking",
  statuses: ["requested", "confirmed", "rescheduled", "completed", "cancelled"],
  details: (r) => [
    ["Preferred date", formatDate(r.preferredDate)],
    ["Preferred time", r.preferredTime],
    ["Requirements", r.requirements],
  ],
};

export const MessageList = () => <LeadList config={messages} />;
export const QuoteList = () => <LeadList config={quotes} />;
export const BookingList = () => <LeadList config={bookings} />;

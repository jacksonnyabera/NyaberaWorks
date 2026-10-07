import { describe, expect, it } from "vitest";

import { bookingSchema, contactSchema, quoteSchema } from "@/lib/schemas";

const contact = {
  name: "Amina Otieno",
  email: "amina@example.com",
  phone: "",
  service: "website-maintenance",
  message: "I need help keeping my site updated.",
  website: "",
};

describe("contactSchema", () => {
  it("accepts a valid message with no phone", () => {
    expect(contactSchema.safeParse(contact).success).toBe(true);
  });
  it("rejects a bad email and a short message", () => {
    const result = contactSchema.safeParse({ ...contact, email: "nope", message: "hi" });
    expect(result.success).toBe(false);
  });
  it("rejects the hidden spam field when filled", () => {
    expect(contactSchema.safeParse({ ...contact, website: "http://spam.example" }).success).toBe(false);
  });
});

describe("quoteSchema", () => {
  const quote = {
    ...contact,
    budget: "Not sure yet",
    deadline: "",
    description: "A booking website for my small guesthouse.",
  };
  it("accepts a valid quote with no deadline", () => {
    expect(quoteSchema.safeParse(quote).success).toBe(true);
  });
  it("rejects a deadline in the past", () => {
    expect(quoteSchema.safeParse({ ...quote, deadline: "2001-01-01" }).success).toBe(false);
  });
  it("rejects an unknown budget", () => {
    expect(quoteSchema.safeParse({ ...quote, budget: "a lot" }).success).toBe(false);
  });
});

describe("bookingSchema", () => {
  const booking = {
    name: "Amina Otieno",
    email: "amina@example.com",
    phone: "0712 345 678",
    service: "python-automation",
    preferredDate: "2999-01-01",
    preferredTime: "Morning (9:00 to 12:00 EAT)",
    requirements: "Automate our weekly sales report.",
    website: "",
  };
  it("accepts a valid booking", () => {
    expect(bookingSchema.safeParse(booking).success).toBe(true);
  });
  it("requires a phone number", () => {
    expect(bookingSchema.safeParse({ ...booking, phone: "" }).success).toBe(false);
  });
});

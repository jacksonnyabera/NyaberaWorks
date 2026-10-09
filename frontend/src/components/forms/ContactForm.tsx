"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { endpoints } from "@/lib/api";
import type { ServiceChoice } from "@/lib/catalog";
import { contactSchema, type ContactValues } from "@/lib/schemas";

import { HoneypotField, SelectField, TextAreaField, TextField } from "./fields";
import { PrivacyNote, ServerError, SubmitSuccess } from "./FormParts";
import { ServiceOptions, validServiceSlug } from "./ServiceOptions";
import { useLeadSubmit } from "./useLeadSubmit";

export function ContactForm({ services }: { services: ServiceChoice[] }) {
  const params = useSearchParams();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: validServiceSlug(params.get("service"), services),
      message: "",
      website: "",
    },
  });
  const lead = useLeadSubmit<ContactValues>(endpoints.contact, setError);

  if (lead.isSuccess) {
    return (
      <SubmitSuccess
        title="Message sent"
        reference={lead.reference}
        resetLabel="Send another message"
        onReset={() => {
          lead.reset();
          reset();
        }}
      >
        <p>Thank you. I will reply to the email address you gave, usually within one to two working days.</p>
      </SubmitSuccess>
    );
  }

  return (
    <form onSubmit={handleSubmit(lead.submit)} noValidate className="relative space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="contact-name" label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField id="contact-email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="contact-phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          optional
          error={errors.phone?.message}
          {...register("phone")}
        />
        <SelectField id="contact-service" label="Service" error={errors.service?.message} {...register("service")}>
          <ServiceOptions services={services} />
        </SelectField>
      </div>
      <TextAreaField
        id="contact-message"
        label="How can I help?"
        error={errors.message?.message}
        {...register("message")}
      />
      <HoneypotField {...register("website")} />
      {lead.failure ? <ServerError failure={lead.failure} /> : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={lead.isPending}>
          {lead.isPending ? "Sending..." : "Send message"}
        </Button>
        <PrivacyNote />
      </div>
    </form>
  );
}

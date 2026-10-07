"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { budgetOptions } from "@/content/general";
import { endpoints } from "@/lib/api";
import { quoteSchema, type QuoteValues } from "@/lib/schemas";

import { HoneypotField, SelectField, TextAreaField, TextField } from "./fields";
import { PrivacyNote, ServerError, SubmitSuccess } from "./FormParts";
import { ServiceOptions, validServiceSlug } from "./ServiceOptions";
import { useLeadSubmit } from "./useLeadSubmit";

export function QuoteForm() {
  const params = useSearchParams();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<QuoteValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: validServiceSlug(params.get("service")),
      budget: undefined,
      deadline: "",
      description: "",
      website: "",
    },
  });
  const lead = useLeadSubmit<QuoteValues>(endpoints.quote, setError);

  if (lead.isSuccess) {
    return (
      <SubmitSuccess
        title="Quote request received"
        reference={lead.reference}
        resetLabel="Request another quote"
        onReset={() => {
          lead.reset();
          reset();
        }}
      >
        <p>Thank you. I will review your request and reply with questions or a written quote, usually within two working days.</p>
        <p>There is no charge for a quote.</p>
      </SubmitSuccess>
    );
  }

  return (
    <form onSubmit={handleSubmit(lead.submit)} noValidate className="relative space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="quote-name" label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField id="quote-email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="quote-phone" label="Phone" type="tel" autoComplete="tel" optional error={errors.phone?.message} {...register("phone")} />
        <SelectField id="quote-service" label="Service" error={errors.service?.message} {...register("service")}>
          <ServiceOptions />
        </SelectField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField id="quote-budget" label="Budget" error={errors.budget?.message} {...register("budget")}>
          <option value="">Choose a range</option>
          {budgetOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </SelectField>
        <TextField
          id="quote-deadline"
          label="Deadline"
          type="date"
          optional
          hint="Leave empty if you are flexible."
          error={errors.deadline?.message}
          {...register("deadline")}
        />
      </div>
      <TextAreaField
        id="quote-description"
        label="Project description"
        hint="What do you need, who will use it, and what does success look like?"
        className="min-h-48"
        error={errors.description?.message}
        {...register("description")}
      />
      <HoneypotField {...register("website")} />
      {lead.failure ? <ServerError failure={lead.failure} /> : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={lead.isPending}>
          {lead.isPending ? "Sending..." : "Request a quote"}
        </Button>
        <PrivacyNote />
      </div>
    </form>
  );
}

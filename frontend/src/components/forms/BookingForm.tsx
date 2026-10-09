"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { timeSlots } from "@/content/general";
import { endpoints } from "@/lib/api";
import type { ServiceChoice } from "@/lib/catalog";
import { bookingSchema, type BookingValues } from "@/lib/schemas";

import { HoneypotField, SelectField, TextAreaField, TextField } from "./fields";
import { PrivacyNote, ServerError, SubmitSuccess } from "./FormParts";
import { ServiceOptions, validServiceSlug } from "./ServiceOptions";
import { useLeadSubmit } from "./useLeadSubmit";

export function BookingForm({ services }: { services: ServiceChoice[] }) {
  const params = useSearchParams();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: validServiceSlug(params.get("service"), services),
      preferredDate: "",
      preferredTime: undefined,
      requirements: "",
      website: "",
    },
  });
  const lead = useLeadSubmit<BookingValues>(endpoints.booking, setError);

  if (lead.isSuccess) {
    return (
      <SubmitSuccess
        title="Booking request received"
        reference={lead.reference}
        resetLabel="Book another time"
        onReset={() => {
          lead.reset();
          reset();
        }}
      >
        <p>Thank you. This is a request, not a confirmed slot yet. I will confirm the time by email or phone, usually within one working day.</p>
      </SubmitSuccess>
    );
  }

  return (
    <form onSubmit={handleSubmit(lead.submit)} noValidate className="relative space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="booking-name" label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField id="booking-email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="booking-phone" label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
        <SelectField id="booking-service" label="Service" error={errors.service?.message} {...register("service")}>
          <ServiceOptions services={services} />
        </SelectField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="booking-date"
          label="Preferred date"
          type="date"
          error={errors.preferredDate?.message}
          {...register("preferredDate")}
        />
        <SelectField
          id="booking-time"
          label="Preferred time"
          hint="East Africa Time (EAT)."
          error={errors.preferredTime?.message}
          {...register("preferredTime")}
        >
          <option value="">Choose a time</option>
          {timeSlots.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField
        id="booking-requirements"
        label="Requirements"
        hint="What would you like to cover in the session?"
        error={errors.requirements?.message}
        {...register("requirements")}
      />
      <HoneypotField {...register("website")} />
      {lead.failure ? <ServerError failure={lead.failure} /> : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={lead.isPending}>
          {lead.isPending ? "Sending..." : "Request this time"}
        </Button>
        <PrivacyNote />
      </div>
    </form>
  );
}

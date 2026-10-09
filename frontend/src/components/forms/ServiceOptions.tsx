import type { ServiceChoice } from "@/lib/catalog";

export function ServiceOptions({ services }: { services: ServiceChoice[] }) {
  return (
    <>
      <option value="">Choose a service</option>
      {services.map((s) => (
        <option key={s.slug} value={s.slug}>
          {s.title}
        </option>
      ))}
      <option value="other">Something else / not sure yet</option>
    </>
  );
}

export function validServiceSlug(value: string | null, services: ServiceChoice[]): string {
  if (!value) return "";
  return value === "other" || services.some((s) => s.slug === value) ? value : "";
}

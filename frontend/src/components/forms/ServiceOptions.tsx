import { services } from "@/content/services";

export function ServiceOptions() {
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

export function validServiceSlug(value: string | null): string {
  if (!value) return "";
  return value === "other" || services.some((s) => s.slug === value) ? value : "";
}

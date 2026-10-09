"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import { linesToList, listToLines } from "@/lib/admin-lists";
import {
  listCatalog,
  projectCategories,
  projectMotifs,
  projectStatuses,
  saveCatalogItem,
  type CatalogKind,
} from "@/lib/admin-api";
import { toApiFailure } from "@/lib/api";

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "lines" | "number" | "select" | "checkbox";
  options?: readonly string[];
  hint?: string;
  optional?: boolean;
  max?: number;
};

type Item = { id: string; slug: string; title: string; isActive: boolean; sortOrder: number } & Record<string, unknown>;
type Values = Record<string, string | boolean>;

type CatalogConfig = {
  kind: CatalogKind;
  noun: string;
  fields: FieldDef[];
  blank: Values;
  subtitle: (item: Item) => string;
};

const common = {
  isActive: { name: "isActive", label: "Show on the website", type: "checkbox" } as FieldDef,
  sortOrder: {
    name: "sortOrder",
    label: "Display order",
    type: "number",
    hint: "Smaller numbers come first.",
  } as FieldDef,
};

export const serviceConfig: CatalogConfig = {
  kind: "services",
  noun: "service",
  subtitle: (i) => {
    const price = i.startingPriceKes as number | null;
    return price == null ? "Priced per project" : `From KES ${price.toLocaleString("en-KE")}`;
  },
  fields: [
    { name: "title", label: "Title", type: "text", max: 120 },
    { name: "summary", label: "One-line summary", type: "text", max: 300 },
    { name: "description", label: "What this is", type: "textarea" },
    { name: "problem", label: "The problem it solves", type: "textarea" },
    { name: "deliverables", label: "What you get", type: "lines", hint: "One item per line." },
    { name: "technologies", label: "Technologies", type: "lines", hint: "One per line.", optional: true },
    { name: "timeline", label: "Typical timeline", type: "text", max: 300 },
    {
      name: "startingPriceKes",
      label: "Starting price (KES)",
      type: "number",
      optional: true,
      hint: "Leave empty to show “Priced per project”. Only enter a price you are happy to publish.",
    },
    { name: "bestFor", label: "Best for", type: "text", max: 300 },
    { name: "note", label: "Note shown on the page", type: "textarea", optional: true },
    common.sortOrder,
    common.isActive,
  ],
  blank: {
    slug: "", title: "", summary: "", description: "", problem: "", deliverables: "", technologies: "",
    timeline: "", startingPriceKes: "", bestFor: "", note: "", sortOrder: "100", isActive: true,
  },
};

export const projectConfig: CatalogConfig = {
  kind: "projects",
  noun: "project",
  subtitle: (i) => `${String(i.status)} · ${String(i.category)}`,
  fields: [
    { name: "title", label: "Title", type: "text", max: 120 },
    { name: "category", label: "Category", type: "select", options: projectCategories },
    { name: "status", label: "Status", type: "select", options: projectStatuses, hint: "State the real status. Visitors see it." },
    { name: "summary", label: "One-line summary", type: "text", max: 400 },
    { name: "problem", label: "The problem", type: "textarea" },
    { name: "solution", label: "The solution", type: "textarea" },
    { name: "features", label: "Features", type: "lines", hint: "One per line." },
    { name: "technologies", label: "Technologies", type: "lines", hint: "One per line.", optional: true },
    { name: "result", label: "Result", type: "textarea", hint: "Only what is true and can be checked." },
    { name: "liveUrl", label: "Live address", type: "text", optional: true, hint: "Starts with https://" },
    { name: "caveat", label: "Honest note", type: "textarea", optional: true, hint: "For example: prototype with sample data." },
    { name: "motif", label: "Cover drawing", type: "select", options: projectMotifs },
    { name: "featured", label: "Feature on the home page", type: "checkbox" },
    common.sortOrder,
    common.isActive,
  ],
  blank: {
    slug: "", title: "", category: "Web platform", status: "Built", summary: "", problem: "", solution: "",
    features: "", technologies: "", result: "", liveUrl: "", caveat: "", motif: "platform",
    featured: false, sortOrder: "100", isActive: true,
  },
};

function toValues(config: CatalogConfig, item: Item | null): Values {
  if (!item) return { ...config.blank };
  const values: Values = { slug: item.slug };
  for (const field of config.fields) {
    const raw = item[field.name];
    if (field.type === "checkbox") values[field.name] = Boolean(raw);
    else if (field.type === "lines") values[field.name] = listToLines((raw as string[]) ?? []);
    else values[field.name] = raw == null ? "" : String(raw);
  }
  return values;
}

function toBody(config: CatalogConfig, values: Values): Record<string, unknown> {
  const body: Record<string, unknown> = { slug: values.slug };
  for (const field of config.fields) {
    const value = values[field.name];
    if (field.type === "checkbox") body[field.name] = value;
    else if (field.type === "lines") body[field.name] = linesToList(String(value));
    else if (field.type === "number") body[field.name] = String(value).trim() === "" ? "" : Number(value);
    else body[field.name] = String(value);
  }
  return body;
}

function Editor({
  config,
  item,
  onDone,
}: {
  config: CatalogConfig;
  item: Item | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => toValues(config, item));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => saveCatalogItem(config.kind, toBody(config, values), item?.slug ?? null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", config.kind] });
      onDone();
    },
    onError: (error) => {
      const failure = toApiFailure(error);
      const mapped: Record<string, string> = {};
      for (const [field, message] of Object.entries(failure.fieldErrors)) {
        mapped[field.split(".")[0]] = message; // "deliverables.0" -> "deliverables"
      }
      setFieldErrors(mapped);
      setFormError(
        Object.keys(mapped).length > 0 ? "Some details need fixing. Check the highlighted fields." : failure.message,
      );
    },
  });

  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));
  const id = (name: string) => `catalog-${name}`;

  function submit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    save.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-card border border-line bg-white p-5 sm:p-7" noValidate>
      <h2 className="text-2xl">{item ? `Edit ${item.title}` : `New ${config.noun}`}</h2>
      {formError ? <Alert tone="error" title={formError} /> : null}
      <TextField
        id={id("slug")}
        label="Web address name"
        hint={
          item
            ? "This cannot change after creation because it is part of the page address."
            : "Lower-case letters, numbers and hyphens, for example my-new-service. Cannot be changed later."
        }
        value={String(values.slug)}
        onChange={(e) => set("slug", e.target.value)}
        disabled={item !== null}
        error={fieldErrors.slug}
        maxLength={80}
      />
      {config.fields.map((field) => {
        const value = values[field.name];
        const error = fieldErrors[field.name];
        if (field.type === "checkbox") {
          return (
            <label key={field.name} className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-teal"
                checked={Boolean(value)}
                onChange={(e) => set(field.name, e.target.checked)}
              />
              {field.label}
            </label>
          );
        }
        if (field.type === "select") {
          return (
            <SelectField
              key={field.name}
              id={id(field.name)}
              label={field.label}
              hint={field.hint}
              error={error}
              value={String(value)}
              onChange={(e) => set(field.name, e.target.value)}
            >
              {field.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </SelectField>
          );
        }
        if (field.type === "textarea" || field.type === "lines") {
          return (
            <TextAreaField
              key={field.name}
              id={id(field.name)}
              label={field.label}
              hint={field.hint}
              error={error}
              optional={field.optional}
              className={field.type === "lines" ? "min-h-40" : "min-h-28"}
              value={String(value)}
              onChange={(e) => set(field.name, e.target.value)}
            />
          );
        }
        return (
          <TextField
            key={field.name}
            id={id(field.name)}
            label={field.label}
            hint={field.hint}
            error={error}
            optional={field.optional}
            type={field.type === "number" ? "number" : "text"}
            min={field.type === "number" ? 0 : undefined}
            maxLength={field.max}
            value={String(value)}
            onChange={(e) => set(field.name, e.target.value)}
          />
        );
      })}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : item ? "Save changes" : `Create ${config.noun}`}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CatalogManager({ config }: { config: CatalogConfig }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const query = useQuery({
    queryKey: ["admin", config.kind],
    queryFn: () => listCatalog<Item>(config.kind),
  });

  if (editing) {
    return (
      <Editor
        config={config}
        item={editing === "new" ? null : editing}
        onDone={() => setEditing(null)}
        key={editing === "new" ? "new" : editing.id}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">
          Changes appear on the public site within about a minute. Hidden items stay here but disappear from the website.
        </p>
        <Button onClick={() => setEditing("new")}>Add a {config.noun}</Button>
      </div>
      {query.isError ? <Alert tone="error" title={toApiFailure(query.error).message} /> : null}
      {query.isPending ? <Skeleton className="h-20 w-full" /> : null}
      {query.data && query.data.length === 0 ? (
        <EmptyState
          title={`No ${config.noun}s yet`}
          body={`If this is a new installation, run the seed command to load the starter ${config.noun}s, or add one now.`}
        />
      ) : null}
      {query.data && query.data.length > 0 ? (
        <ul className="space-y-3">
          {query.data.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-white p-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted">
                  /{item.slug} · {config.subtitle(item)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${item.isActive ? "bg-teal-tint text-teal-deep" : "bg-panel text-ink-soft"}`}
              >
                {item.isActive ? "Visible" : "Hidden"}
              </span>
              <Button variant="secondary" onClick={() => setEditing(item)}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const ServiceManager = () => <CatalogManager config={serviceConfig} />;
export const ProjectManager = () => <CatalogManager config={projectConfig} />;

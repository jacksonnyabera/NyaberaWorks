"use client";

import { Suspense, type ReactNode } from "react";

import { Providers } from "@/components/providers";

import { FormSkeleton } from "./FormParts";

/**
 * Wraps a lead form with the data-fetching provider and a loading skeleton.
 * Only the pages that contain forms load this JavaScript.
 */
export function FormBoundary({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Suspense fallback={<FormSkeleton />}>{children}</Suspense>
    </Providers>
  );
}

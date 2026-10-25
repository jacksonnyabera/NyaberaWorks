"use client";

import { Suspense, type ReactNode } from "react";

import { FormSkeleton } from "./FormParts";

/**
 * Wraps a lead form with a loading skeleton.
 * Only the pages that contain forms load this JavaScript.
 */
export function FormBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FormSkeleton />}>{children}</Suspense>
  );
}

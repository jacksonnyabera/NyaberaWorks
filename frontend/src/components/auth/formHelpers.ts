import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { toApiFailure, type ApiFailure } from "@/lib/api";

/** Convert a thrown error into a message for the form, and mark any fields the server named. */
export function failureToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  known: readonly string[],
): ApiFailure {
  const failure = toApiFailure(error);
  for (const [field, message] of Object.entries(failure.fieldErrors)) {
    if (known.includes(field)) setError(field as Path<T>, { type: "server", message });
  }
  return failure;
}

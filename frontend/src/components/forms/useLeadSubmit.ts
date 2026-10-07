"use client";

import { useMutation } from "@tanstack/react-query";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { useState } from "react";

import { api, toApiFailure, type ApiFailure } from "@/lib/api";

type SubmitResult = { reference?: string };

/**
 * Shared submit logic for the contact, quote and booking forms.
 * Sends the values to FastAPI, then maps any server-side field errors
 * back onto the form so people see them next to the right input.
 */
export function useLeadSubmit<T extends FieldValues>(endpoint: string, setError: UseFormSetError<T>) {
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  const mutation = useMutation<SubmitResult, unknown, T>({
    mutationFn: async (values) => {
      const { data } = await api.post(endpoint, values);
      const reference =
        typeof data?.reference === "string" ? data.reference : data?.id != null ? String(data.id) : undefined;
      return { reference };
    },
    onMutate: () => setFailure(null),
    onError: (error) => {
      const parsed = toApiFailure(error);
      setFailure(parsed);
      for (const [field, message] of Object.entries(parsed.fieldErrors)) {
        setError(field as Path<T>, { type: "server", message });
      }
    },
  });

  return {
    submit: (values: T) => mutation.mutate(values),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reference: mutation.data?.reference,
    failure,
    reset: () => {
      mutation.reset();
      setFailure(null);
    },
  };
}

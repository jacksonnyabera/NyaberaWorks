"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { ReplyBox, ThreadView } from "@/components/conversations/Thread";
import { TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/states";
import { toApiFailure } from "@/lib/api";
import {
  getAdminThread,
  sendAdminMessage,
  sendQuotation,
  withdrawQuotation,
  type LeadDetail,
  type Quotation,
  type RequestKind,
} from "@/lib/conversations-api";

function todayPlus(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(d); // YYYY-MM-DD
}

function QuotationForm({ onSend }: { onSend: (v: { amountKes: number; details: string; validUntil: string }) => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [validUntil, setValidUntil] = useState(todayPlus(14));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= 100 && details.trim().length >= 10 && validUntil !== "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSend({ amountKes: value, details: details.trim(), validUntil });
      setAmount("");
      setDetails("");
    } catch (failure) {
      setError(toApiFailure(failure).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-card border border-line p-4">
      <h4 className="font-semibold">Send a quotation</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="q-amount"
          label="Amount (KES)"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <TextField
          id="q-valid"
          label="Valid until"
          type="date"
          value={validUntil}
          min={todayPlus(0)}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </div>
      <TextAreaField
        id="q-details"
        label="What the price covers"
        hint="Scope, deliverables and timeline. The client sees this exactly as written."
        className="min-h-28"
        maxLength={6000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      {error ? <Alert tone="error" title={error} /> : null}
      <Button type="submit" disabled={!valid || busy}>
        {busy ? "Sending…" : "Send quotation"}
      </Button>
    </form>
  );
}

export function AdminConversation({ kind, id }: { kind: RequestKind; id: string }) {
  const queryClient = useQueryClient();
  const key = ["admin", "thread", kind, id];
  const query = useQuery({ queryKey: key, queryFn: () => getAdminThread(kind, id), staleTime: 0 });
  const [error, setError] = useState<string | null>(null);

  function apply(detail: LeadDetail) {
    queryClient.setQueryData(key, detail);
    void queryClient.invalidateQueries({ queryKey: ["admin"], predicate: (q) => q.queryKey[1] !== "thread" });
  }

  const withdraw = useMutation({
    mutationFn: withdrawQuotation,
    onMutate: () => setError(null),
    onSuccess: apply,
    onError: (e) => setError(toApiFailure(e).message),
  });

  if (query.isPending) return <Skeleton className="h-32 w-full" />;
  if (query.isError) return <Alert tone="error" title={toApiFailure(query.error).message} />;
  const detail = query.data;
  const actions = (q: Quotation) =>
    q.status === "sent" ? (
      <Button variant="secondary" disabled={withdraw.isPending} onClick={() => withdraw.mutate(q.id)}>
        Withdraw
      </Button>
    ) : null;

  return (
    <div className="mt-8 space-y-4 border-t border-line pt-6">
      <h3 className="text-lg font-semibold">Conversation</h3>
      {!detail.canReply ? (
        <Alert tone="info" title="This visitor was not signed in">
          The app cannot deliver replies to them. Use their email or phone above, and invite them to create an
          account so their next request can be followed here.
        </Alert>
      ) : null}
      {error ? <Alert tone="error" title={error} /> : null}
      <ThreadView detail={detail} viewer="ADMIN" quotationActions={actions} />
      {detail.canReply ? (
        <>
          <ReplyBox id={`admin-reply-${id}`} onSend={async (body) => apply(await sendAdminMessage(kind, id, body))} />
          {kind === "quote" ? (
            <QuotationForm onSend={async (input) => apply(await sendQuotation(id, input))} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

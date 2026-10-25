"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ReplyBox, ThreadView } from "@/components/conversations/Thread";
import { Button } from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/states";
import { toApiFailure } from "@/lib/api";
import {
  answerQuotation,
  getMyRequest,
  sendMyMessage,
  type LeadDetail,
  type Quotation,
  type RequestKind,
} from "@/lib/conversations-api";

export function ClientConversation({ kind, id }: { kind: RequestKind; id: string }) {
  const queryClient = useQueryClient();
  const key = ["me", "request", kind, id];
  const query = useQuery({ queryKey: key, queryFn: () => getMyRequest(kind, id), staleTime: 0, refetchInterval: 30_000 });
  const [answerError, setAnswerError] = useState<string | null>(null);

  function refreshLists(detail: LeadDetail) {
    queryClient.setQueryData(key, detail);
    void queryClient.invalidateQueries({ queryKey: ["me", "requests"] });
    void queryClient.invalidateQueries({ queryKey: ["me", "unread"] });
  }

  const answer = useMutation({
    mutationFn: (v: { id: string; decision: "accept" | "decline" }) => answerQuotation(v.id, v.decision),
    onMutate: () => setAnswerError(null),
    onSuccess: refreshLists,
    onError: (e) => setAnswerError(toApiFailure(e).message),
  });

  if (query.isPending) return <Skeleton className="h-64 w-full" />;
  if (query.isError) {
    return (
      <Alert tone="error" title="We could not open this request">
        {toApiFailure(query.error).message}
      </Alert>
    );
  }
  const detail = query.data;
  const actions = (q: Quotation) =>
    q.status === "sent" && !q.expired ? (
      <>
        <Button disabled={answer.isPending} onClick={() => answer.mutate({ id: q.id, decision: "accept" })}>
          Accept quotation
        </Button>
        <Button
          variant="secondary"
          disabled={answer.isPending}
          onClick={() => answer.mutate({ id: q.id, decision: "decline" })}
        >
          Decline
        </Button>
      </>
    ) : q.status === "sent" ? (
      <p className="text-sm text-muted">This quotation has expired. Ask for an updated one below.</p>
    ) : null;

  return (
    <div className="space-y-6">
      <p>
        <Link href="/account" className="text-teal underline-offset-4 hover:underline">
          ← All requests
        </Link>
      </p>
      <p className="text-sm text-muted">
        Reference <span className="font-mono">{detail.reference}</span> · Status{" "}
        <span className="capitalize">{detail.status}</span>
      </p>
      {answerError ? <Alert tone="error" title={answerError} /> : null}
      <ThreadView detail={detail} viewer="CLIENT" quotationActions={actions} />
      <ReplyBox id="client-reply" onSend={async (body) => refreshLists(await sendMyMessage(kind, id, body))} />
    </div>
  );
}

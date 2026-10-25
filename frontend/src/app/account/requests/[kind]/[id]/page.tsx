import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RequestContent } from "./RequestContent";
import { isRequestKind } from "@/lib/conversations-api";

export const metadata: Metadata = {
  title: "Your request",
  robots: { index: false, follow: false },
};

export default async function RequestPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isRequestKind(kind)) notFound();
  return <RequestContent kind={kind} id={id} />;
}

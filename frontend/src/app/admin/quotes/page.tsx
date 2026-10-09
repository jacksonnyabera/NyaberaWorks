import type { Metadata } from "next";

import { AdminHeading } from "@/components/admin/AdminShell";
import { QuoteList } from "@/components/admin/LeadPanels";

export const metadata: Metadata = { title: "Quote requests" };

export default function Page() {
  return (
    <>
      <AdminHeading title="Quote requests" intro="Requests from the quote form. Open one to see the details, set its status and add notes." />
      <QuoteList />
    </>
  );
}

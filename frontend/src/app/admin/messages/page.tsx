import type { Metadata } from "next";

import { AdminHeading } from "@/components/admin/AdminShell";
import { MessageList } from "@/components/admin/LeadPanels";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return (
    <>
      <AdminHeading title="Messages" intro="Messages sent from the contact form." />
      <MessageList />
    </>
  );
}

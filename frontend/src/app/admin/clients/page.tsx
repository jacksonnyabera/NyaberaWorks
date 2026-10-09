import type { Metadata } from "next";

import { AdminHeading } from "@/components/admin/AdminShell";
import { ClientList } from "@/components/admin/ClientList";

export const metadata: Metadata = { title: "Clients" };

export default function Page() {
  return (
    <>
      <AdminHeading title="Clients" intro="People who created an account. Deactivating a client signs them out and blocks sign-in." />
      <ClientList />
    </>
  );
}

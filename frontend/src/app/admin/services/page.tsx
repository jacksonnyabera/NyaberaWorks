import type { Metadata } from "next";

import { AdminHeading } from "@/components/admin/AdminShell";
import { ServiceManager } from "@/components/admin/CatalogManager";

export const metadata: Metadata = { title: "Services" };

export default function Page() {
  return (
    <>
      <AdminHeading title="Services" intro="The services shown on the website and offered in the forms." />
      <ServiceManager />
    </>
  );
}

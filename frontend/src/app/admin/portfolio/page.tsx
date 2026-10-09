import type { Metadata } from "next";

import { AdminHeading } from "@/components/admin/AdminShell";
import { ProjectManager } from "@/components/admin/CatalogManager";

export const metadata: Metadata = { title: "Portfolio" };

export default function Page() {
  return (
    <>
      <AdminHeading title="Portfolio" intro="Projects shown on the Work page. State each project's real status." />
      <ProjectManager />
    </>
  );
}

import { AdminHeading } from "@/components/admin/AdminShell";
import { AdminOverviewPanel } from "@/components/auth/AdminOverviewPanel";

export default function AdminPage() {
  return (
    <>
      <AdminHeading title="Overview" intro="A summary of what needs your attention." />
      <AdminOverviewPanel />
    </>
  );
}

import type { Metadata } from "next";

import { AdminHeading } from "@/components/admin/AdminShell";
import { BookingList } from "@/components/admin/LeadPanels";

export const metadata: Metadata = { title: "Bookings" };

export default function Page() {
  return (
    <>
      <AdminHeading title="Bookings" intro="Booking requests from the booking form. Nothing is confirmed until you set it to confirmed." />
      <BookingList />
    </>
  );
}

import type { Metadata } from "next";

import { AccountContent } from "./AccountContent";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountContent />;
}

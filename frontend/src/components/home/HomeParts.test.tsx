import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ServiceIcon } from "@/components/home/ServiceIcon";
import { TrustStrip } from "@/components/home/TrustStrip";
import { services } from "@/content/services";

describe("home parts", () => {
  it("shows the company trust facts in a labelled region", () => {
    render(<TrustStrip />);
    expect(
      screen.getByRole("region", { name: "Working with NyaberaWorks" }),
    ).toBeInTheDocument();
    expect(screen.getByText("One to two working days")).toBeInTheDocument();
  });

  it("has an icon for every service and hides it from screen readers", () => {
    for (const s of services) {
      const { container, unmount } = render(<ServiceIcon slug={s.slug} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg?.querySelector("circle[r='8']")).toBeNull(); // not the fallback
      unmount();
    }
  });
});

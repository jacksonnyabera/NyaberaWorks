import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FaqList } from "@/components/home/FaqList";
import { faqs } from "@/content/general";

describe("FaqList", () => {
  it("renders every question", () => {
    render(<FaqList />);
    for (const f of faqs) expect(screen.getByText(f.q)).toBeInTheDocument();
  });
  it("respects the limit", () => {
    render(<FaqList limit={2} />);
    expect(screen.getAllByRole("group")).toHaveLength(2);
  });
});

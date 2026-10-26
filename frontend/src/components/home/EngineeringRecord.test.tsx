import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EngineeringRecord } from "@/components/home/EngineeringRecord";

describe("EngineeringRecord", () => {
  it("lists the checks and safeguards", () => {
    render(<EngineeringRecord />);
    expect(screen.getByRole("heading", { name: "Checked before it ships" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Checks that run on every push/ })).toBeInTheDocument();
    expect(screen.getByText("Automated tests")).toBeInTheDocument();
    expect(screen.getByText(/Argon2id/)).toBeInTheDocument();
  });
});

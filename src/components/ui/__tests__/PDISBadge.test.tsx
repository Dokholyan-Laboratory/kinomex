import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PDISBadge from "@/components/ui/PDISBadge";

describe("PDISBadge", () => {
  it("renders the score formatted to 2 decimals", () => {
    render(<PDISBadge score={0.4567} />);
    expect(screen.getByText("0.46")).toBeInTheDocument();
  });

  it("renders zero score", () => {
    render(<PDISBadge score={0} />);
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });

  it("renders max score", () => {
    render(<PDISBadge score={1} />);
    expect(screen.getByText("1.00")).toBeInTheDocument();
  });

  it("renders with sm size", () => {
    const { container } = render(<PDISBadge score={0.5} size="sm" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with lg size", () => {
    const { container } = render(<PDISBadge score={0.5} size="lg" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

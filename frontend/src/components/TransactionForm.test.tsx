import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { Holding } from "../api/types";
import { TransactionForm } from "./TransactionForm";

const scomHolding: Holding = {
  instrument: "SCOM",
  netQuantity: 1000,
  averageCost: 16,
  totalInvested: 16000,
  marketPrice: 17.5,
  totalValue: 17500,
  gain: 1500,
  gainPct: 9.38,
};

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <TransactionForm
      currency="KES"
      holdings={[scomHolding]}
      knownInstruments={["SCOM"]}
      onSubmit={onSubmit}
      onCancel={() => {}}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe("TransactionForm", () => {
  it("shows validation errors and does not submit an empty form", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Record buy" }));

    expect(await screen.findByText("Use a ticker such as SCOM, KCB or T-BILL-91.")).toBeInTheDocument();
    expect(screen.getByText("Enter a quantity.")).toBeInTheDocument();
    expect(screen.getByText("Enter a unit price.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("tells the analyst how much they hold before they sell", async () => {
    const { user } = renderForm();

    await user.click(screen.getByLabelText("Sell"));
    await user.type(screen.getByLabelText(/Instrument/), "scom");

    expect(screen.getByText("You currently hold 1,000 SCOM.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record sell" })).toBeInTheDocument();
  });

  it("submits a valid trade with an upper-case ticker and numeric amounts", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText(/Instrument/), "kcb");
    await user.type(screen.getByLabelText(/Quantity/), "250");
    await user.type(screen.getByLabelText(/Unit price/), "38.5");
    await user.click(screen.getByRole("button", { name: "Record buy" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ instrument: "KCB", type: "BUY", quantity: 250, unitPrice: 38.5 }),
    );
  });

  it("puts the API's oversell error under Quantity and explains it in a banner", async () => {
    const oversell = new ApiError(422, "INSUFFICIENT_HOLDINGS", "Cannot sell 5000 SCOM: only 1000 held on 2026-11-20.", [
      { field: "quantity", message: "Exceeds holding of 1000." },
    ]);
    const { user } = renderForm(vi.fn().mockRejectedValue(oversell));

    await user.click(screen.getByLabelText("Sell"));
    await user.type(screen.getByLabelText(/Instrument/), "SCOM");
    await user.type(screen.getByLabelText(/Quantity/), "5000");
    await user.type(screen.getByLabelText(/Unit price/), "19");
    await user.click(screen.getByRole("button", { name: "Record sell" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot sell 5000 SCOM: only 1000 held on 2026-11-20.");
    expect(screen.getByText("You only hold 1000, so you can't sell more than that.")).toBeInTheDocument();
  });
});

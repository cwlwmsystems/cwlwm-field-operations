"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseFinance } from "@/lib/finance/SupabaseFinanceProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import {
  buildInvoiceCsv,
  buildInvoicePdf,
  downloadBytes,
  downloadText,
  type InvoiceExportInput,
} from "@/lib/exports/invoiceExports";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useAuth();

  const finance = useSupabaseFinance();
  const sales = useSupabaseSales();
  const config = useSupabaseConfig();

  const batch = finance.batches.find((x) => x.id === id);

  const items = finance.items.filter((x) => x.batchId === id);

  const adjustments = finance.adjustments.filter(
    (x) => x.invoiceBatchId === id && x.status === "applied"
  );

  const exports = finance.exports.filter((x) => x.batchId === id);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [message, setMessage] = useState("");

  if (finance.loading) {
    return (
      <AppShell>
        <div className="card">Loading invoice…</div>
      </AppShell>
    );
  }

  if (!batch) {
    return (
      <AppShell>
        <div className="card">
          <h1>Invoice not found</h1>
          <Link href="/finance">Return to Finance</Link>
        </div>
      </AppShell>
    );
  }

  const currentBatch = batch;

  const format = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: finance.settings?.currency || "USD",
    }).format(value);

  function exportInput(): InvoiceExportInput {
    return {
      organizationName:
        organization?.name ?? "Cwlwm Field Operations",

      invoiceNumber: currentBatch.invoiceNumber,
      status: currentBatch.status,
      createdAt: currentBatch.createdAt,

      currency: finance.settings?.currency ?? "USD",

      subtotal: items.reduce(
        (sum, item) => sum + item.amount,
        0
      ),

      adjustmentsTotal: adjustments.reduce(
        (sum, adjustment) =>
          sum + adjustment.signedAmount,
        0
      ),

      total: finance.getBatchTotal(currentBatch.id),

      lines: items.map((item) => {
        const order = sales.orders.find(
          (x) => x.id === item.orderId
        );

        const location = order
          ? config.locations.find(
              (x) => x.id === order.locationId
            )
          : undefined;

        return {
          orderId: item.orderId,
          customer: order?.customerName ?? "Unknown",
          location: location?.address ?? "Unknown",
          description: item.description,
          amount: item.amount,
        };
      }),

      adjustments: adjustments.map((x) => ({
        description: x.reason,
        amount: x.signedAmount,
      })),
    };
  }

  async function addAdjustment(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      await finance.addAdjustment(
        currentBatch.id,
        description,
        Number(amount)
      );

      setDescription("");
      setAmount("0");

      setMessage("Adjustment added.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add adjustment."
      );
    }
  }

  async function setStatus(
    status: "finalized" | "exported" | "void"
  ) {
    try {
      await finance.setBatchStatus(
        currentBatch.id,
        status
      );

      setMessage(
        `Invoice marked ${status}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update invoice."
      );
    }
  }

  async function exportPdf() {
    try {
      const filename =
        `${currentBatch.invoiceNumber}.pdf`;

      const bytes = buildInvoicePdf(
        exportInput()
      );

      downloadBytes(
        bytes,
        filename,
        "application/pdf"
      );

      await finance.recordExport(
        currentBatch.id,
        "pdf",
        filename
      );

      setMessage(
        `Downloaded ${filename} and recorded the export.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "PDF export failed."
      );
    }
  }

  async function exportCsv() {
    try {
      const filename =
        `${currentBatch.invoiceNumber}.csv`;

      const csv = buildInvoiceCsv(
        exportInput()
      );

      downloadText(
        csv,
        filename,
        "text/csv;charset=utf-8"
      );

      await finance.recordExport(
        currentBatch.id,
        "csv",
        filename
      );

      setMessage(
        `Downloaded ${filename} and recorded the export.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "CSV export failed."
      );
    }
  }

  return (
    <AppShell>
      <div className="breadcrumbs">
        <Link href="/finance">
          Finance
        </Link>

        <span>/</span>

        {currentBatch.invoiceNumber}
      </div>

      <div className="page-header">
        <div>
          <div className="eyebrow">
            Invoice Batch · Supabase
          </div>

          <h1>
            {currentBatch.invoiceNumber}
          </h1>

          <p className="muted">
            Created{" "}
            {new Date(
              currentBatch.createdAt
            ).toLocaleString()}
          </p>
        </div>

        <span className="badge">
          {currentBatch.status}
        </span>
      </div>

      {message && (
        <div className="success-banner">
          <strong>Invoice</strong>
          <span>{message}</span>
        </div>
      )}

      <div className="grid location-summary-grid">
        <div className="card">
          <div className="eyebrow">
            Line items
          </div>

          <div className="metric-small">
            {items.length}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Subtotal
          </div>

          <div className="metric-small">
            {format(
              items.reduce(
                (sum, item) =>
                  sum + item.amount,
                0
              )
            )}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Adjustments
          </div>

          <div className="metric-small">
            {format(
              adjustments.reduce(
                (sum, adjustment) =>
                  sum +
                  adjustment.signedAmount,
                0
              )
            )}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Total
          </div>

          <div className="metric-small">
            {format(
              finance.getBatchTotal(
                currentBatch.id
              )
            )}
          </div>
        </div>
      </div>

      <section className="card section-block">
        <div className="section-heading compact">
          <div>
            <div className="eyebrow">
              Artifacts
            </div>

            <h2>
              Invoice exports
            </h2>
          </div>
        </div>

        <p className="muted">
          Generate a PDF invoice or a CSV
          finance export directly from the
          live Supabase batch.
        </p>

        <div className="form-actions">
          <button
            className="button"
            onClick={exportPdf}
          >
            Download PDF
          </button>

          <button
            className="button secondary"
            onClick={exportCsv}
          >
            Download CSV
          </button>
        </div>
      </section>

      <section className="card table-card section-block">
        <div className="section-heading compact">
          <div>
            <div className="eyebrow">
              Invoice Lines
            </div>

            <h2>Orders</h2>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Location</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const order =
                sales.orders.find(
                  (x) =>
                    x.id === item.orderId
                );

              const location = order
                ? config.locations.find(
                    (x) =>
                      x.id ===
                      order.locationId
                  )
                : undefined;

              return (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {order?.customerName ??
                        "Unknown"}
                    </strong>

                    <div className="small muted">
                      <Link
                        href={`/sales/orders/${item.orderId}`}
                      >
                        Order
                      </Link>
                    </div>
                  </td>

                  <td>
                    {location?.address ??
                      "Unknown"}
                  </td>

                  <td>
                    {item.description}
                  </td>

                  <td>
                    {format(item.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid two-column section-block">
        <section className="card">
          <div className="eyebrow">
            Adjustments
          </div>

          <h2>
            Credits / charges
          </h2>

          {adjustments.length === 0 ? (
            <div className="empty-state">
              No active adjustments.
            </div>
          ) : (
            <div className="stack-list">
              {adjustments.map(
                (adjustment) => (
                  <div key={adjustment.id}>
                    <div>
                      <strong>
                        {adjustment.reason}
                      </strong>

                      <span className="muted small">
                        {
                          adjustment.adjustmentType
                        }
                      </span>
                    </div>

                    <div className="row-actions">
                      <strong>
                        {format(
                          adjustment.signedAmount
                        )}
                      </strong>

                      {currentBatch.status !==
                        "exported" &&
                        currentBatch.status !==
                          "void" && (
                          <button
                            className="danger-link"
                            onClick={() =>
                              finance.removeAdjustment(
                                adjustment.id
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {currentBatch.status !==
            "exported" &&
            currentBatch.status !==
              "void" && (
              <form
                className="admin-form single section-block"
                onSubmit={
                  addAdjustment
                }
              >
                <label>
                  Description

                  <input
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Amount{" "}
                  <span className="muted small">
                    negative = credit
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    required
                  />
                </label>

                <button className="button">
                  Add adjustment
                </button>
              </form>
            )}
        </section>

        <section className="card">
          <div className="eyebrow">
            Invoice Actions
          </div>

          <h2>Finalize</h2>

          <p className="muted">
            Finalized locks the operational
            invoice state for output. Exported
            records downstream handoff.
          </p>

          <div className="form-actions vertical-actions">
            {currentBatch.status ===
              "draft" && (
              <button
                className="button"
                onClick={() =>
                  setStatus("finalized")
                }
              >
                Finalize Invoice
              </button>
            )}

            {currentBatch.status ===
              "finalized" && (
              <button
                className="button"
                onClick={() =>
                  setStatus("exported")
                }
              >
                Mark Exported
              </button>
            )}

            {currentBatch.status !==
              "exported" &&
              currentBatch.status !==
                "void" && (
                <button
                  className="danger-link"
                  onClick={() => {
                    if (
                      confirm(
                        "Void this invoice batch?"
                      )
                    ) {
                      setStatus("void");
                    }
                  }}
                >
                  Void batch
                </button>
              )}
          </div>

          <dl className="detail-list section-block">
            <div>
              <dt>Finalized</dt>

              <dd>
                {currentBatch.finalizedAt
                  ? new Date(
                      currentBatch.finalizedAt
                    ).toLocaleString()
                  : "Not finalized"}
              </dd>
            </div>

            <div>
              <dt>Exported</dt>

              <dd>
                {currentBatch.exportedAt
                  ? new Date(
                      currentBatch.exportedAt
                    ).toLocaleString()
                  : "Not exported"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card table-card section-block">
        <div className="section-heading compact">
          <div>
            <div className="eyebrow">
              Audit
            </div>

            <h2>
              Export history
            </h2>
          </div>
        </div>

        {exports.length === 0 ? (
          <div className="empty-state">
            No PDF or CSV exports recorded yet.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Format</th>
                <th>Filename</th>
                <th>Exported</th>
              </tr>
            </thead>

            <tbody>
              {exports.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="badge">
                      {row.format.toUpperCase()}
                    </span>
                  </td>

                  <td>
                    {row.filename}
                  </td>

                  <td>
                    {new Date(
                      row.exportedAt
                    ).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSupabaseFinance } from "@/lib/finance/SupabaseFinanceProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";

export default function FinancePage() {
  const finance = useSupabaseFinance();
  const sales = useSupabaseSales();
  const config = useSupabaseConfig();
  const lifecycle = useSupabaseLifecycle();

  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const currency = finance.settings?.currency || "USD";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);

  const eligible = sales.orders.filter((order) =>
    finance.eligibleOrderIds.includes(order.id)
  );

  const batchOrderIds = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const item of finance.items) {
      const existing = map.get(item.batchId) ?? [];

      map.set(item.batchId, [
        ...existing,
        item.orderId,
      ]);
    }

    return map;
  }, [finance.items]);

  async function createBatch() {
    if (selected.length === 0) {
      setMessage(
        "Select at least one eligible order."
      );
      return;
    }

    try {
      const batch =
        await finance.createBatch(selected);

      setSelected([]);

      setMessage(
        `Created invoice ${batch.invoiceNumber}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create invoice batch."
      );
    }
  }

  function toggleOrder(
    orderId: string,
    checked: boolean
  ) {
    setSelected((current) => {
      if (checked) {
        if (current.includes(orderId)) {
          return current;
        }

        return [...current, orderId];
      }

      return current.filter(
        (id) => id !== orderId
      );
    });
  }

  function selectAllEligible() {
    setSelected(
      eligible.map((order) => order.id)
    );
  }

  function clearSelection() {
    setSelected([]);
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">
            Finance Operations · Supabase
          </div>

          <h1>
            Finance &amp; Invoicing
          </h1>

          <p className="muted">
            Installed and activated orders flow
            directly into invoice eligibility.
          </p>
        </div>
      </div>

      {finance.error && (
        <div className="error-banner">
          <strong>
            Finance load failed
          </strong>

          <span>
            {finance.error}
          </span>
        </div>
      )}

      {message && (
        <div className="success-banner">
          <strong>Finance</strong>

          <span>{message}</span>
        </div>
      )}

      <div className="grid metric-grid">
        <div className="card">
          <div className="eyebrow">
            Eligible orders
          </div>

          <div className="metric">
            {eligible.length}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Invoice batches
          </div>

          <div className="metric">
            {finance.batches.length}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Finalized
          </div>

          <div className="metric">
            {
              finance.batches.filter(
                (batch) =>
                  batch.status === "finalized"
              ).length
            }
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Exported
          </div>

          <div className="metric">
            {
              finance.batches.filter(
                (batch) =>
                  batch.status === "exported"
              ).length
            }
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            Invoice value
          </div>

          <div className="metric">
            {formatCurrency(
              finance.batches
                .filter(
                  (batch) =>
                    batch.status !== "void"
                )
                .reduce(
                  (sum, batch) =>
                    sum +
                    finance.getBatchTotal(
                      batch.id
                    ),
                  0
                )
            )}
          </div>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              Invoice Eligibility
            </div>

            <h2>
              Installed / Activated orders
            </h2>
          </div>

          <div className="form-actions">
            {eligible.length > 0 &&
              selected.length !==
                eligible.length && (
                <button
                  className="button secondary"
                  onClick={
                    selectAllEligible
                  }
                >
                  Select All
                </button>
              )}

            {selected.length > 0 && (
              <button
                className="button secondary"
                onClick={
                  clearSelection
                }
              >
                Clear
              </button>
            )}

            <button
              className="button"
              disabled={
                selected.length === 0
              }
              onClick={createBatch}
            >
              Create invoice batch (
              {selected.length})
            </button>
          </div>
        </div>

        <div className="card table-card">
          {finance.loading ? (
            <div className="empty-state">
              Loading finance…
            </div>
          ) : eligible.length === 0 ? (
            <div className="empty-state">
              No unbilled Installed or
              Activated orders.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Product</th>
                  <th>Lifecycle</th>
                  <th>Order</th>
                </tr>
              </thead>

              <tbody>
                {eligible.map((order) => {
                  const location =
                    config.locations.find(
                      (x) =>
                        x.id ===
                        order.locationId
                    );

                  const stage =
                    lifecycle.getCurrentStage(
                      order.id
                    );

                  return (
                    <tr key={order.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(
                            order.id
                          )}
                          onChange={(
                            event
                          ) =>
                            toggleOrder(
                              order.id,
                              event.target
                                .checked
                            )
                          }
                        />
                      </td>

                      <td>
                        <strong>
                          {
                            order.customerName
                          }
                        </strong>

                        {(order.phone ||
                          order.email) && (
                          <div className="muted small">
                            {order.phone ||
                              order.email}
                          </div>
                        )}
                      </td>

                      <td>
                        {location?.address ??
                          "Unknown"}
                      </td>

                      <td>
                        {
                          order.productNameSnapshot
                        }
                      </td>

                      <td>
                        <span className="badge success">
                          {stage?.name ??
                            "—"}
                        </span>
                      </td>

                      <td>
                        <Link
                          className="text-link"
                          href={`/sales/orders/${order.id}`}
                        >
                          View order
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              Invoice History
            </div>

            <h2>Batches</h2>
          </div>
        </div>

        <div className="card table-card">
          {finance.loading ? (
            <div className="empty-state">
              Loading invoices…
            </div>
          ) : finance.batches.length ===
            0 ? (
            <div className="empty-state">
              No invoice batches yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Subtotal</th>
                  <th>Adjustments</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {finance.batches.map(
                  (batch) => {
                    const orderCount =
                      (
                        batchOrderIds.get(
                          batch.id
                        ) ?? []
                      ).length;

                    return (
                      <tr key={batch.id}>
                        <td>
                          <strong>
                            {
                              batch.invoiceNumber
                            }
                          </strong>
                        </td>

                        <td>
                          {orderCount}
                        </td>

                        <td>
                          <span className="badge">
                            {batch.status}
                          </span>
                        </td>

                        <td>
                          {formatCurrency(
                            batch.subtotal
                          )}
                        </td>

                        <td>
                          {formatCurrency(
                            batch.adjustmentsTotal
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              finance.getBatchTotal(
                                batch.id
                              )
                            )}
                          </strong>
                        </td>

                        <td>
                          {new Date(
                            batch.createdAt
                          ).toLocaleString()}
                        </td>

                        <td>
                          <Link
                            className="button secondary"
                            href={`/finance/invoices/${batch.id}`}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}
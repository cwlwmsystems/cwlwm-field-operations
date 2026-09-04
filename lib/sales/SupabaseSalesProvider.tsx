"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";

import type {
  DemoOffer,
  DemoOrder,
  DemoProduct,
  DemoSalesAttempt,
} from "@/lib/types/platform";

type AttemptInput = Omit<
  DemoSalesAttempt,
  "id" | "startedAt" | "updatedAt"
> & {
  id?: string;
};

type OrderInput = {
  clientSubmissionId: string;
  salesAttemptId?: string;
  locationId: string;
  representativeId: string;
  teamId?: string;
  territoryId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  productId: string;
  offerId: string;
  notes?: string;
  installDate?: string;
  installTime?: string;
};

type Ctx = {
  loading: boolean;
  error: string | null;
  products: DemoProduct[];
  offers: DemoOffer[];
  attempts: DemoSalesAttempt[];
  orders: DemoOrder[];

  refresh: () => Promise<void>;

  saveAttempt: (
    input: AttemptInput
  ) => Promise<DemoSalesAttempt>;

  abandonAttempt: (
    id: string
  ) => Promise<void>;

  submitOrder: (
    input: OrderInput
  ) => Promise<DemoOrder>;

  reviewOrder: (
    id: string,
    status: "approved" | "flagged",
    note?: string
  ) => Promise<void>;
};

const Context =
  createContext<Ctx | undefined>(
    undefined
  );

export function SupabaseSalesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { organization } = useAuth();
  const config = useSupabaseConfig();
  const territoryOps =
    useSupabaseTerritoryOps();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [products, setProducts] =
    useState<DemoProduct[]>([]);

  const [offers, setOffers] =
    useState<DemoOffer[]>([]);

  const [attempts, setAttempts] =
    useState<DemoSalesAttempt[]>([]);

  const [orders, setOrders] =
    useState<DemoOrder[]>([]);

  const orgId = organization?.id;

  const refresh = useCallback(
    async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const supabase =
        createClient();

      const [
        productsResult,
        offersResult,
        attemptsResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq(
            "organization_id",
            orgId
          )
          .order("name"),

        supabase
          .from("offers")
          .select("*")
          .eq(
            "organization_id",
            orgId
          )
          .order("name"),

        supabase
          .from("sales_attempts")
          .select("*")
          .eq(
            "organization_id",
            orgId
          )
          .order(
            "updated_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("orders")
          .select("*")
          .eq(
            "organization_id",
            orgId
          )
          .order(
            "submitted_at",
            {
              ascending: false,
            }
          ),
      ]);

      const firstError = [
        productsResult.error,
        offersResult.error,
        attemptsResult.error,
        ordersResult.error,
      ].find(Boolean);

      if (firstError) {
        setError(
          firstError.message
        );

        setLoading(false);
        return;
      }

      setProducts(
        (
          productsResult.data ??
          []
        ).map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          category:
            row.category ?? "",
          serviceLevel:
            row.service_level ?? "",
          basePrice: Number(
            row.base_recurring_price ??
              0
          ),
          isActive:
            row.is_active,
        }))
      );

      setOffers(
        (
          offersResult.data ??
          []
        ).map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          productId:
            row.product_id,

          badge:
            (row.terms as any)
              ?.badge ?? "",

          disclosure:
            (row.terms as any)
              ?.disclosure ?? "",

          isActive:
            row.is_active,

          phases:
            (row.terms as any)
              ?.phases ?? [
              {
                label:
                  row.name,

                months:
                  row.term_months
                    ? `${row.term_months} months`
                    : "Ongoing",

                price:
                  Number(
                    row.recurring_price ??
                      0
                  ),
              },
            ],
        }))
      );

      setAttempts(
        (
          attemptsResult.data ??
          []
        ).map(mapAttempt)
      );

      const mappedOrders: DemoOrder[] =
        (
          ordersResult.data ??
          []
        ).map((row) => {
          const mappedOrder: DemoOrder =
            {
              id: row.id,

              clientSubmissionId:
                row.client_submission_id,

              locationId:
                row.location_id,

              representativeId:
                row.representative_id ??
                "",

              salesAttemptId:
                row.sales_attempt_id ??
                undefined,

              customerName:
                `${row.customer_first_name ?? ""} ${row.customer_last_name ?? ""}`.trim(),

              phone:
                row.customer_phone ??
                "",

              email:
                row.customer_email ??
                "",

              productId:
                row.product_id ??
                "",

              offerId:
                row.offer_id ??
                "",

              productNameSnapshot:
                (
                  row.product_snapshot as any
                )?.name ??
                "Product",

              offerNameSnapshot:
                (
                  row.offer_snapshot as any
                )?.name ??
                "Offer",

              pricingSnapshot:
                {
                  phases:
                    (
                      row.offer_snapshot as any
                    )?.terms
                      ?.phases ?? [
                      {
                        label:
                          (
                            row.offer_snapshot as any
                          )?.name ??
                          "Offer",

                        months:
                          (
                            row.offer_snapshot as any
                          )
                            ?.term_months
                            ? `${
                                (
                                  row.offer_snapshot as any
                                )
                                  .term_months
                              } months`
                            : "Ongoing",

                        price:
                          Number(
                            row.recurring_price ??
                              0
                          ),
                      },
                    ],
                },

              installDate:
                (
                  row.metadata as any
                )?.installDate ??
                "",

              installTime:
                (
                  row.metadata as any
                )?.installTime ??
                "",

              notes:
                (
                  row.metadata as any
                )?.notes ?? "",

              orderStatus:
                row.status ===
                "cancelled"
                  ? "cancelled"
                  : row.status ===
                      "submitted"
                    ? "submitted"
                    : "accepted",

              reviewStatus:
                row.review_status ===
                "flagged"
                  ? "needs_attention"
                  : row.review_status ===
                      "approved"
                    ? "approved"
                    : "pending",

              reviewNote:
                (
                  row.metadata as any
                )?.reviewNote ??
                undefined,

              createdAt:
                row.submitted_at,

              updatedAt:
                row.updated_at,
            };

          return mappedOrder;
        });

      setOrders(mappedOrders);

      setLoading(false);
    },
    [orgId]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  function mapAttempt(
    row: any
  ): DemoSalesAttempt {
    return {
      id: row.id,

      clientAttemptId:
        row.client_attempt_id,

      locationId:
        row.location_id,

      representativeId:
        row.representative_id ??
        "",

      firstName:
        row.customer_first_name ??
        "",

      lastName:
        row.customer_last_name ??
        "",

      phone:
        row.customer_phone ??
        "",

      email:
        row.customer_email ??
        "",

      notes:
        (
          row.metadata as any
        )?.notes ?? "",

      productId:
        row.product_id ??
        undefined,

      offerId:
        row.offer_id ??
        undefined,

      installDate:
        row.appointment_date ??
        undefined,

      installTime:
        row.appointment_time
          ?.slice(0, 5) ??
        undefined,

      progressStep:
        row.progress_step,

      progressStage:
        row.progress_stage ??
        "",

      status:
        row.status ===
        "cancelled"
          ? "abandoned"
          : row.status,

      startedAt:
        row.created_at,

      updatedAt:
        row.updated_at,

      convertedAt:
        row.converted_at ??
        undefined,
    };
  }

  async function syncLocationInteraction(
    input: {
      locationId: string;
      representativeId?: string;
      teamId?: string;
      territoryId?: string;
      dispositionId: string;
      clientSubmissionId: string;
      interactionType:
        | "sales_attempt"
        | "sale";
      note?: string;
      followUpNeeded?: boolean;
      followUpAt?:
        | string
        | null;
    }
  ) {
    if (!orgId) {
      throw new Error(
        "No active organization."
      );
    }

    const { error } =
      await createClient().rpc(
        "record_location_interaction",
        {
          p_organization_id:
            orgId,

          p_location_id:
            input.locationId,

          p_representative_id:
            input.representativeId ||
            null,

          p_territory_id:
            input.territoryId ||
            null,

          p_team_id:
            input.teamId ||
            null,

          p_disposition_id:
            input.dispositionId,

          p_interaction_type:
            input.interactionType,

          p_note:
            input.note ||
            null,

          p_decision_maker_contacted:
            true,

          p_follow_up_needed:
            Boolean(
              input.followUpNeeded
            ),

          p_follow_up_at:
            input.followUpAt ||
            null,

          p_occurred_at:
            new Date().toISOString(),

          p_source_system:
            "sales",

          p_client_submission_id:
            input.clientSubmissionId,
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }
  }

  async function saveAttempt(
    input: AttemptInput
  ): Promise<DemoSalesAttempt> {
    if (!orgId) {
      throw new Error(
        "No active organization."
      );
    }

    const supabase =
      createClient();

    const location =
      config.locations.find(
        (location) =>
          location.id ===
          input.locationId
      );

    if (!location) {
      throw new Error(
        "Location not found."
      );
    }

    const savedAt =
      new Date().toISOString();

    const payload = {
      organization_id:
        orgId,

      client_attempt_id:
        input.clientAttemptId,

      location_id:
        input.locationId,

      representative_id:
        input.representativeId ||
        null,

      team_id:
        location.teamId ||
        null,

      territory_id:
        location.territoryId ||
        null,

      customer_first_name:
        input.firstName ||
        null,

      customer_last_name:
        input.lastName ||
        null,

      customer_email:
        input.email ||
        null,

      customer_phone:
        input.phone ||
        null,

      product_id:
        input.productId ||
        null,

      offer_id:
        input.offerId ||
        null,

      progress_step:
        input.progressStep,

      progress_stage:
        input.progressStage,

      status:
        input.status,

      appointment_date:
        input.installDate ||
        null,

      appointment_time:
        input.installTime ||
        null,

      last_saved_at:
        savedAt,

      metadata: {
        notes:
          input.notes ?? "",
      },
    };

    let data: any;

    if (input.id) {
      const result =
        await supabase
          .from(
            "sales_attempts"
          )
          .update(payload)
          .eq(
            "organization_id",
            orgId
          )
          .eq(
            "id",
            input.id
          )
          .select("*")
          .single();

      if (result.error) {
        throw new Error(
          result.error.message
        );
      }

      data =
        result.data;
    } else {
      const result =
        await supabase
          .from(
            "sales_attempts"
          )
          .upsert(
            payload,
            {
              onConflict:
                "organization_id,client_attempt_id",
            }
          )
          .select("*")
          .single();

      if (result.error) {
        throw new Error(
          result.error.message
        );
      }

      data =
        result.data;
    }

    if (!data?.id) {
      throw new Error(
        "Supabase did not return the saved sales attempt."
      );
    }

    const verify =
      await supabase
        .from(
          "sales_attempts"
        )
        .select("*")
        .eq(
          "organization_id",
          orgId
        )
        .eq(
          "id",
          data.id
        )
        .single();

    if (verify.error) {
      throw new Error(
        `Save completed but verification failed: ${verify.error.message}`
      );
    }

    const persisted =
      verify.data;

    const expectedNotes =
      input.notes ?? "";

    if (
      (
        persisted.customer_first_name ??
        ""
      ) !==
        (
          input.firstName ??
          ""
        ) ||
      (
        persisted.customer_last_name ??
        ""
      ) !==
        (
          input.lastName ??
          ""
        ) ||
      (
        persisted.customer_phone ??
        ""
      ) !==
        (
          input.phone ??
          ""
        ) ||
      (
        persisted.customer_email ??
        ""
      ) !==
        (
          input.email ??
          ""
        ) ||
      (
        (
          persisted.metadata as any
        )?.notes ??
        ""
      ) !==
        expectedNotes ||
      persisted.progress_step !==
        input.progressStep
    ) {
      throw new Error(
        "Supabase returned the row, but the saved values did not match the form. The UI will not report this as synced."
      );
    }

    const mapped =
      mapAttempt(
        persisted
      );

    if (
      input.status ===
      "in_progress"
    ) {
      const interested =
        config.dispositions.find(
          (disposition) =>
            disposition.code ===
            "interested"
        ) ??
        config.dispositions.find(
          (disposition) =>
            disposition.isActive !==
              false &&
            disposition.marksContact &&
            !disposition.marksSale
        );

      if (!interested) {
        throw new Error(
          "No active Interested/contact disposition is configured for sales attempts."
        );
      }

      let followUpAt:
        | string
        | null = null;

      if (
        interested.requiresFollowUp &&
        interested.defaultFollowUpDays
      ) {
        const date =
          new Date();

        date.setDate(
          date.getDate() +
            interested.defaultFollowUpDays
        );

        followUpAt =
          date.toISOString();
      }

      await syncLocationInteraction(
        {
          locationId:
            input.locationId,

          representativeId:
            input.representativeId ||
            undefined,

          teamId:
            location.teamId ||
            undefined,

          territoryId:
            location.territoryId ||
            undefined,

          dispositionId:
            interested.id,

          clientSubmissionId:
            persisted.id,

          interactionType:
            "sales_attempt",

          note:
            input.notes?.trim() ||
            "Sales attempt in progress.",

          followUpNeeded:
            interested.requiresFollowUp,

          followUpAt,
        }
      );
    }

    setAttempts(
      (current) => {
        const exists =
          current.some(
            (attempt) =>
              attempt.id ===
              mapped.id
          );

        const next =
          exists
            ? current.map(
                (attempt) =>
                  attempt.id ===
                  mapped.id
                    ? mapped
                    : attempt
              )
            : [
                mapped,
                ...current,
              ];

        return next.sort(
          (a, b) =>
            Date.parse(
              b.updatedAt
            ) -
            Date.parse(
              a.updatedAt
            )
        );
      }
    );

    await config.refresh();
    await territoryOps.refresh();

    return mapped;
  }

  async function abandonAttempt(
    id: string
  ) {
    if (!orgId) {
      throw new Error(
        "No active organization."
      );
    }

    const { error } =
      await createClient()
        .from(
          "sales_attempts"
        )
        .update({
          status:
            "abandoned",

          abandoned_at:
            new Date().toISOString(),
        })
        .eq(
          "organization_id",
          orgId
        )
        .eq(
          "id",
          id
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    await refresh();
  }

  async function submitOrder(
    input: OrderInput
  ): Promise<DemoOrder> {
    if (!orgId) {
      throw new Error(
        "No active organization."
      );
    }

    const supabase =
      createClient();

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "submit_order",
        {
          p_organization_id:
            orgId,

          p_client_submission_id:
            input.clientSubmissionId,

          p_sales_attempt_id:
            input.salesAttemptId ||
            null,

          p_location_id:
            input.locationId,

          p_representative_id:
            input.representativeId ||
            null,

          p_team_id:
            input.teamId ||
            null,

          p_territory_id:
            input.territoryId ||
            null,

          p_customer_first_name:
            input.firstName,

          p_customer_last_name:
            input.lastName,

          p_customer_email:
            input.email ||
            null,

          p_customer_phone:
            input.phone ||
            null,

          p_product_id:
            input.productId,

          p_offer_id:
            input.offerId,
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    if (!data?.id) {
      throw new Error(
        "Order submission succeeded but Supabase did not return an order ID."
      );
    }

    const metadataUpdate =
      await supabase
        .from("orders")
        .update({
          metadata: {
            notes:
              input.notes ??
              "",

            installDate:
              input.installDate ??
              "",

            installTime:
              input.installTime ??
              "",
          },
        })
        .eq(
          "organization_id",
          orgId
        )
        .eq(
          "id",
          data.id
        )
        .select("id")
        .single();

    if (
      metadataUpdate.error
    ) {
      throw new Error(
        metadataUpdate.error
          .message
      );
    }

    const saleDisposition =
      config.dispositions.find(
        (disposition) =>
          disposition.code ===
          "sale"
      ) ??
      config.dispositions.find(
        (disposition) =>
          disposition.isActive !==
            false &&
          disposition.marksSale
      );

    if (!saleDisposition) {
      throw new Error(
        "No active Sale disposition is configured."
      );
    }

    await syncLocationInteraction(
      {
        locationId:
          input.locationId,

        representativeId:
          input.representativeId ||
          undefined,

        teamId:
          input.teamId ||
          undefined,

        territoryId:
          input.territoryId ||
          undefined,

        dispositionId:
          saleDisposition.id,

        clientSubmissionId:
          data.id,

        interactionType:
          "sale",

        note:
          input.notes?.trim() ||
          "Order submitted.",

        followUpNeeded:
          false,

        followUpAt:
          null,
      }
    );

    await config.refresh();
    await territoryOps.refresh();
    await refresh();

    const result =
      await supabase
        .from("orders")
        .select("*")
        .eq(
          "organization_id",
          orgId
        )
        .eq(
          "id",
          data.id
        )
        .single();

    if (result.error) {
      throw new Error(
        result.error.message
      );
    }

    const row =
      result.data;

    const mappedOrder: DemoOrder =
      {
        id:
          row.id,

        clientSubmissionId:
          row.client_submission_id,

        locationId:
          row.location_id,

        representativeId:
          row.representative_id ??
          "",

        salesAttemptId:
          row.sales_attempt_id ??
          undefined,

        customerName:
          `${row.customer_first_name ?? ""} ${row.customer_last_name ?? ""}`.trim(),

        phone:
          row.customer_phone ??
          "",

        email:
          row.customer_email ??
          "",

        productId:
          row.product_id ??
          "",

        offerId:
          row.offer_id ??
          "",

        productNameSnapshot:
          (
            row.product_snapshot as any
          )?.name ??
          "Product",

        offerNameSnapshot:
          (
            row.offer_snapshot as any
          )?.name ??
          "Offer",

        pricingSnapshot:
          {
            phases:
              (
                row.offer_snapshot as any
              )?.terms
                ?.phases ?? [
                {
                  label:
                    (
                      row.offer_snapshot as any
                    )?.name ??
                    "Offer",

                  months:
                    (
                      row.offer_snapshot as any
                    )?.term_months
                      ? `${
                          (
                            row.offer_snapshot as any
                          )
                            .term_months
                        } months`
                      : "Ongoing",

                  price:
                    Number(
                      row.recurring_price ??
                        0
                    ),
                },
              ],
          },

        installDate:
          input.installDate ??
          "",

        installTime:
          input.installTime ??
          "",

        notes:
          input.notes ??
          "",

        orderStatus:
          row.status ===
          "cancelled"
            ? "cancelled"
            : row.status ===
                "submitted"
              ? "submitted"
              : "accepted",

        reviewStatus:
          row.review_status ===
          "approved"
            ? "approved"
            : row.review_status ===
                "flagged"
              ? "needs_attention"
              : "pending",

        reviewNote:
          (
            row.metadata as any
          )?.reviewNote ??
          undefined,

        createdAt:
          row.submitted_at,

        updatedAt:
          row.updated_at,
      };

    return mappedOrder;
  }

  async function reviewOrder(
    id: string,
    status:
      | "approved"
      | "flagged",
    note?: string
  ) {
    if (!orgId) {
      throw new Error(
        "No active organization."
      );
    }

    const supabase =
      createClient();

    const current =
      orders.find(
        (order) =>
          order.id === id
      );

    const {
      error,
    } =
      await supabase
        .from("orders")
        .update({
          review_status:
            status,

          status:
            status ===
            "approved"
              ? "approved"
              : "flagged",

          metadata: {
            notes:
              current?.notes ??
              "",

            installDate:
              current?.installDate ??
              "",

            installTime:
              current?.installTime ??
              "",

            reviewNote:
              note ?? "",
          },
        })
        .eq(
          "organization_id",
          orgId
        )
        .eq(
          "id",
          id
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    await refresh();
  }

  const value: Ctx = {
    loading,
    error,
    products,
    offers,
    attempts,
    orders,
    refresh,
    saveAttempt,
    abandonAttempt,
    submitOrder,
    reviewOrder,
  };

  return (
    <Context.Provider
      value={value}
    >
      {children}
    </Context.Provider>
  );
}

export function useSupabaseSales() {
  const value =
    useContext(Context);

  if (!value) {
    throw new Error(
      "useSupabaseSales must be within SupabaseSalesProvider"
    );
  }

  return value;
}
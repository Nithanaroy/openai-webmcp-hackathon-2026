"use client";

import {
  MEDICATIONS,
  PHARMACIES,
  PRESCRIPTION,
  RESERVATION_MINUTES,
  isValidZip,
  medicationById,
} from "@/lib/data";
import type { Reservation } from "@/lib/types";
import {
  asString,
  useModelContextTools,
  type WebmcpToolDef,
} from "@/lib/webmcp";
import type { CollabController } from "@/lib/collab";

export interface PharmacyApi {
  medicationId: string;
  zip: string;
  reservation: Reservation | null;
  setMedication: (id: string) => void;
  setZip: (zip: string) => void;
  search: () => void;
  reserve: (pharmacyId: string) => Reservation;
  cancel: () => void;
  collab: CollabController;
}

function resolveMedication(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const q = input.toLowerCase();
  const byId = MEDICATIONS.find((m) => m.id === q);
  if (byId) return byId.id;
  const byName = MEDICATIONS.find(
    (m) => m.name.toLowerCase() === q || `${m.name} ${m.strength}`.toLowerCase().includes(q),
  );
  return byName?.id ?? fallback;
}

function resolvePharmacy(input: string | undefined) {
  if (!input) return undefined;
  const q = input.toLowerCase();
  return (
    PHARMACIES.find((p) => p.id === q) ??
    PHARMACIES.find((p) => p.name.toLowerCase().includes(q))
  );
}

export function usePharmacyWebmcp(apiRef: { current: PharmacyApi }): void {
  useModelContextTools(() => {
    const tools: WebmcpToolDef[] = [
      {
        name: "get_prescription",
        description: "Read the prescribed auto-injector, dose and quantity on file.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => {
          const med = medicationById(PRESCRIPTION.medicationId);
          apiRef.current.collab.log("agent", "Read the prescribed auto-injector and dose.");
          return {
            medication: med ? `${med.name} ${med.strength}` : PRESCRIPTION.medicationId,
            quantity: PRESCRIPTION.quantity,
            prescribed_at: PRESCRIPTION.facility,
            patient: PRESCRIPTION.patient,
          };
        },
      },
      {
        name: "check_stock",
        description: "Summarize auto-injector availability near a ZIP without changing the page.",
        inputSchema: {
          type: "object",
          properties: {
            medication: { type: "string", description: "Medication name or id. Defaults to current." },
            zip: { type: "string", description: "5-digit ZIP (optional)." },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input) => {
          const medId = resolveMedication(asString(input.medication), apiRef.current.medicationId);
          const med = medicationById(medId);
          const rows = PHARMACIES.map((p) => ({ p, s: p.stock[medId] }));
          const inStock = rows.filter((r) => r.s && r.s.status !== "out");
          const nearest = [...inStock].sort((a, b) => a.p.distanceMiles - b.p.distanceMiles)[0];
          const cheapest = [...inStock].sort((a, b) => a.s.cashPrice - b.s.cashPrice)[0];
          apiRef.current.collab.log("agent", "Checked availability across nearby pharmacies.");
          return {
            medication: med ? `${med.name} ${med.strength}` : medId,
            in_stock_locations: inStock.length,
            total_locations: PHARMACIES.length,
            nearest_in_stock: nearest
              ? `${nearest.p.name} — ${nearest.p.distanceMiles} mi, $${nearest.s.cashPrice}`
              : "none nearby",
            cheapest: cheapest ? `${cheapest.p.name} — $${cheapest.s.cashPrice}` : "n/a",
            note:
              inStock.length <= 2
                ? "Pediatric 0.15 mg is in short supply; nearest stock may be farther away."
                : "",
          };
        },
      },
      {
        name: "find_pharmacies",
        description: "Search nearby pharmacies for a medication and show results on the page.",
        inputSchema: {
          type: "object",
          properties: {
            zip: { type: "string", description: "5-digit ZIP code." },
            medication: { type: "string", description: "Medication name or id. Defaults to prescription." },
          },
          required: ["zip"],
          additionalProperties: false,
        },
        execute: (input) => {
          const zip = asString(input.zip) ?? "";
          if (!isValidZip(zip)) return "Enter a valid 5-digit ZIP code.";
          const medId = resolveMedication(asString(input.medication), apiRef.current.medicationId);
          apiRef.current.setMedication(medId);
          apiRef.current.setZip(zip);
          apiRef.current.search();
          apiRef.current.collab.log("agent", `Searched pharmacies near ${zip} and listed results.`);
          const med = medicationById(medId);
          const rows = [...PHARMACIES]
            .sort((a, b) => a.distanceMiles - b.distanceMiles)
            .map((p) => {
              const s = p.stock[medId];
              return {
                pharmacy: p.name,
                distance_mi: p.distanceMiles,
                status: s.status,
                units: s.units,
                price: s.status === "out" ? null : s.cashPrice,
                open_24h: p.open24h,
              };
            });
          return { medication: med ? `${med.name} ${med.strength}` : medId, results: rows };
        },
      },
      {
        name: "reserve_injector",
        description:
          "Reserve an in-stock auto-injector. The parent chooses the pharmacy (if several) and authorizes the hold.",
        inputSchema: {
          type: "object",
          properties: {
            pharmacy: {
              type: "string",
              description: "Optional suggested pharmacy name or id. The parent makes the final call.",
            },
          },
          additionalProperties: false,
        },
        execute: async (input, ctx) => {
          const { collab } = apiRef.current;
          const medId = apiRef.current.medicationId;
          const med = medicationById(medId);
          const medLabel = med ? `${med.name} ${med.strength}` : medId;
          const inStock = [...PHARMACIES]
            .filter((p) => p.stock[medId] && p.stock[medId].status !== "out")
            .sort((a, b) => a.distanceMiles - b.distanceMiles);
          if (inStock.length === 0) {
            return "No in-stock locations for this dose nearby. Try a different medication or ZIP.";
          }
          const suggested = resolvePharmacy(asString(input.pharmacy));

          // Judgment gate: which pharmacy (distance vs price vs hours).
          let chosenId: string;
          if (inStock.length === 1) {
            chosenId = inStock[0].id;
          } else {
            collab.log("agent", `Found ${inStock.length} in-stock options; prepared a comparison.`);
            const options = inStock.map((p) => {
              const s = p.stock[medId];
              return {
                id: p.id,
                label: p.name,
                sublabel: `${p.distanceMiles} mi${p.open24h ? " · open 24h" : ""}`,
                badge: `$${s.cashPrice}`,
                suggested: suggested?.id === p.id,
                attributes: [
                  { label: "Distance", value: `${p.distanceMiles} mi` },
                  { label: "Price (cash)", value: `$${s.cashPrice}` },
                  { label: "In stock", value: `${s.units} units` },
                  { label: "Hours", value: p.open24h ? "Open 24 hours" : "Standard hours" },
                ],
              };
            });
            try {
              chosenId = await collab.requestDecision(
                {
                  title: "Choose a pharmacy",
                  prompt: "These carry the pediatric dose right now. Weigh distance, price, and hours.",
                  options,
                },
                ctx?.signal,
              );
            } catch {
              return "Still waiting on the parent to choose a pharmacy.";
            }
          }
          const pharmacy = PHARMACIES.find((p) => p.id === chosenId)!;
          const stock = pharmacy.stock[medId];

          // Commit gate: authorize the hold.
          collab.log("agent", `Prepared a hold at ${pharmacy.name}.`);
          let approved: boolean;
          try {
            approved = await collab.requestConfirm(
              {
                title: "Confirm pharmacy hold",
                intro:
                  "Places a 30-minute hold so it's guaranteed at pickup. Nothing is charged now.",
                rows: [
                  { label: "Medication", value: medLabel },
                  { label: "Pharmacy", value: pharmacy.name },
                  { label: "Address", value: `${pharmacy.address} · ${pharmacy.distanceMiles} mi` },
                  { label: "Price (cash)", value: `$${stock.cashPrice}` },
                  { label: "Hold", value: `${RESERVATION_MINUTES} minutes` },
                ],
                confirmLabel: "Place hold",
                caution: "Holds a real unit for pickup.",
              },
              ctx?.signal,
            );
          } catch {
            return "The hold is waiting on the parent's confirmation.";
          }
          if (!approved) return "The parent declined the hold.";
          const r = apiRef.current.reserve(pharmacy.id);
          return `Reserved ${medLabel} at ${pharmacy.name}. Code ${r.code}, held ${RESERVATION_MINUTES} min. Next: pick it up at ${pharmacy.name} (${pharmacy.address}) before the hold expires — bring a photo ID and the prescription.`;
        },
      },
      {
        name: "cancel_reservation",
        description: "Cancel the current pharmacy hold, if any.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: () => {
          if (!apiRef.current.reservation) return "No active reservation.";
          apiRef.current.cancel();
          return "Reservation cancelled.";
        },
      },
    ];
    return tools;
  });
}

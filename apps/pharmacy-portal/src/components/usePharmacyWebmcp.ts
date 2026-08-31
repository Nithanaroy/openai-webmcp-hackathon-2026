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

export interface PharmacyApi {
  medicationId: string;
  zip: string;
  reservation: Reservation | null;
  setMedication: (id: string) => void;
  setZip: (zip: string) => void;
  search: () => void;
  reserve: (pharmacyId: string) => Reservation;
  cancel: () => void;
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
        description: "Place a hold for an in-stock auto-injector at a chosen pharmacy.",
        inputSchema: {
          type: "object",
          properties: {
            pharmacy: { type: "string", description: "Pharmacy name or id from the results." },
          },
          required: ["pharmacy"],
          additionalProperties: false,
        },
        execute: (input) => {
          const pharmacy = resolvePharmacy(asString(input.pharmacy));
          if (!pharmacy) return "Pharmacy not found. Use a name from find_pharmacies.";
          const stock = pharmacy.stock[apiRef.current.medicationId];
          if (!stock || stock.status === "out") {
            return `Out of stock at ${pharmacy.name}. Choose a location with availability.`;
          }
          const r = apiRef.current.reserve(pharmacy.id);
          const med = medicationById(apiRef.current.medicationId);
          return `Reserved ${med ? `${med.name} ${med.strength}` : "medication"} at ${pharmacy.name}. Code ${r.code}, held ${RESERVATION_MINUTES} min.`;
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

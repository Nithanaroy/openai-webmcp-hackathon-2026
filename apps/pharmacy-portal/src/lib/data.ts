import type { Medication, Pharmacy } from "./types";

// The dose the parent was prescribed at urgent care — this is the context they
// must carry over from the clinic (no shared state between portals).
export const PRESCRIPTION = {
  facility: "Northgate Urgent Care",
  medicationId: "epipen-jr",
  quantity: "2 (twin pack)",
  patient: "Joey Rivera",
};

export const MEDICATIONS: Medication[] = [
  {
    id: "epipen-jr",
    name: "EpiPen Jr",
    strength: "0.15 mg auto-injector",
    note: "Pediatric dose — patients 33–66 lb (15–30 kg).",
  },
  {
    id: "epipen",
    name: "EpiPen",
    strength: "0.3 mg auto-injector",
    note: "Standard dose — patients ≥ 66 lb (30 kg).",
  },
  {
    id: "auvi-q-015",
    name: "Auvi-Q",
    strength: "0.15 mg auto-injector",
    note: "Alternative brand, pediatric dose.",
  },
  {
    id: "epi-generic-015",
    name: "Epinephrine (authorized generic)",
    strength: "0.15 mg auto-injector",
    note: "Generic equivalent of EpiPen Jr.",
  },
];

// Stock is deliberately scarce for the pediatric 0.15 mg dose to model the
// real-world pediatric auto-injector shortage.
export const PHARMACIES: Pharmacy[] = [
  {
    id: "rx-market-24",
    name: "MarketRx Pharmacy",
    address: "1200 Cortland Ave",
    distanceMiles: 0.6,
    open24h: false,
    stock: {
      "epipen-jr": { status: "out", units: 0, cashPrice: 0, updatedMinsAgo: 14 },
      epipen: { status: "in-stock", units: 8, cashPrice: 189, updatedMinsAgo: 14 },
      "auvi-q-015": { status: "out", units: 0, cashPrice: 0, updatedMinsAgo: 40 },
      "epi-generic-015": { status: "low", units: 1, cashPrice: 109, updatedMinsAgo: 22 },
    },
  },
  {
    id: "rx-cornerstone",
    name: "Cornerstone Drug",
    address: "45 Mission St",
    distanceMiles: 1.3,
    open24h: false,
    stock: {
      "epipen-jr": { status: "out", units: 0, cashPrice: 0, updatedMinsAgo: 9 },
      epipen: { status: "low", units: 2, cashPrice: 199, updatedMinsAgo: 9 },
      "auvi-q-015": { status: "out", units: 0, cashPrice: 0, updatedMinsAgo: 55 },
      "epi-generic-015": { status: "out", units: 0, cashPrice: 0, updatedMinsAgo: 30 },
    },
  },
  {
    id: "rx-bayview-24",
    name: "Bayview Care Pharmacy (24h)",
    address: "3050 Third St",
    distanceMiles: 2.8,
    open24h: true,
    stock: {
      "epipen-jr": { status: "low", units: 2, cashPrice: 174, updatedMinsAgo: 6 },
      epipen: { status: "in-stock", units: 12, cashPrice: 169, updatedMinsAgo: 6 },
      "auvi-q-015": { status: "in-stock", units: 5, cashPrice: 155, updatedMinsAgo: 18 },
      "epi-generic-015": { status: "in-stock", units: 7, cashPrice: 99, updatedMinsAgo: 6 },
    },
  },
  {
    id: "rx-summit",
    name: "Summit Family Pharmacy",
    address: "800 Portola Dr",
    distanceMiles: 4.1,
    open24h: false,
    stock: {
      "epipen-jr": { status: "in-stock", units: 6, cashPrice: 182, updatedMinsAgo: 12 },
      epipen: { status: "in-stock", units: 9, cashPrice: 179, updatedMinsAgo: 12 },
      "auvi-q-015": { status: "low", units: 1, cashPrice: 165, updatedMinsAgo: 48 },
      "epi-generic-015": { status: "in-stock", units: 4, cashPrice: 105, updatedMinsAgo: 12 },
    },
  },
  {
    id: "rx-lakeside-24",
    name: "Lakeside Pharmacy (24h)",
    address: "77 Lakeview Blvd",
    distanceMiles: 6.5,
    open24h: true,
    stock: {
      "epipen-jr": { status: "in-stock", units: 10, cashPrice: 176, updatedMinsAgo: 3 },
      epipen: { status: "in-stock", units: 15, cashPrice: 171, updatedMinsAgo: 3 },
      "auvi-q-015": { status: "in-stock", units: 8, cashPrice: 158, updatedMinsAgo: 3 },
      "epi-generic-015": { status: "in-stock", units: 11, cashPrice: 97, updatedMinsAgo: 3 },
    },
  },
];

export const RESERVATION_MINUTES = 30;

export function medicationById(id: string): Medication | undefined {
  return MEDICATIONS.find((m) => m.id === id);
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

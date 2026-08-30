export type StockStatus = "in-stock" | "low" | "out";

export interface Medication {
  id: string;
  name: string;
  strength: string;
  note: string;
}

export interface PharmacyStock {
  status: StockStatus;
  units: number;
  cashPrice: number;
  updatedMinsAgo: number;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  distanceMiles: number;
  open24h: boolean;
  stock: Record<string, PharmacyStock>;
}

export interface Reservation {
  code: string;
  pharmacyId: string;
  medicationId: string;
  expiresAt: number; // epoch ms
}

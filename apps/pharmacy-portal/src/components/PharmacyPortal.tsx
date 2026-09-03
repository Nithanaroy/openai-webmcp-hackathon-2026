"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MEDICATIONS,
  PHARMACIES,
  PRESCRIPTION,
  RESERVATION_MINUTES,
  isValidZip,
  medicationById,
} from "@/lib/data";
import type { Pharmacy, Reservation, StockStatus } from "@/lib/types";
import { usePharmacyWebmcp, type PharmacyApi } from "@/components/usePharmacyWebmcp";
import { useCollab } from "@/lib/collab";
import { CollabLedger, CollabOverlay } from "@/components/CollabPanel";

const STATUS_META: Record<StockStatus, { label: string; cls: string }> = {
  "in-stock": { label: "In stock", cls: "bg-emerald-100 text-emerald-700" },
  low: { label: "Low stock", cls: "bg-amber-100 text-amber-700" },
  out: { label: "Out of stock", cls: "bg-rose-100 text-rose-700" },
};

export default function PharmacyPortal() {
  const [medicationId, setMedicationId] = useState(PRESCRIPTION.medicationId);
  const [zip, setZip] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const collab = useCollab();

  const medication = medicationById(medicationId);
  const zipValid = isValidZip(zip);

  const results = useMemo(() => {
    const list = [...PHARMACIES].sort((a, b) => a.distanceMiles - b.distanceMiles);
    if (!inStockOnly) return list;
    return list.filter((p) => p.stock[medicationId]?.status !== "out");
  }, [inStockOnly, medicationId]);

  function runSearch() {
    if (!zipValid) return;
    setSearching(true);
    setSearched(false);
    // Simulate the portal's async stock lookup.
    window.setTimeout(() => {
      setSearching(false);
      setSearched(true);
    }, 700);
  }

  function reserve(pharmacy: Pharmacy): Reservation {
    const r: Reservation = {
      code: `PH-${Math.floor(1000 + Math.random() * 8999)}`,
      pharmacyId: pharmacy.id,
      medicationId,
      expiresAt: Date.now() + RESERVATION_MINUTES * 60 * 1000,
    };
    setReservation(r);
    return r;
  }

  // Expose the pharmacy actions to a WebMCP agent via a live ref.
  const apiRef = useRef<PharmacyApi>({} as PharmacyApi);
  apiRef.current = {
    medicationId,
    zip,
    reservation,
    setMedication: (id) => {
      setMedicationId(id);
      setSearched(false);
      setReservation(null);
    },
    setZip: (z) => setZip(z),
    search: () => {
      setSearching(false);
      setSearched(true);
    },
    reserve: (pharmacyId) => {
      const pharmacy = PHARMACIES.find((p) => p.id === pharmacyId)!;
      return reserve(pharmacy);
    },
    cancel: () => setReservation(null),
    collab,
  };
  usePharmacyWebmcp(apiRef);

  const inStockCount = results.filter(
    (p) => p.stock[medicationId]?.status !== "out",
  ).length;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
      <div>
      {reservation && (
        <ReservationBanner
          reservation={reservation}
          onCancel={() => setReservation(null)}
        />
      )}

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Prescription on file
        </p>
        <p className="mt-1">
          <span className="font-semibold">
            {medicationById(PRESCRIPTION.medicationId)?.name}{" "}
            {medicationById(PRESCRIPTION.medicationId)?.strength}
          </span>{" "}
          · qty {PRESCRIPTION.quantity} · prescribed at {PRESCRIPTION.facility}
        </p>
      </div>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Medication &amp; dose
            </label>
            <select
              value={medicationId}
              onChange={(e) => {
                setMedicationId(e.target.value);
                setSearched(false);
                setReservation(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              {MEDICATIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.strength}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ZIP code
            </label>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="94110"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={!zipValid || searching}
            className="h-[38px] rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {searching ? "Searching…" : "Check stock"}
          </button>
        </div>
        {medication && (
          <p className="mt-2 text-xs text-slate-500">{medication.note}</p>
        )}
      </section>

      {searched && (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {inStockCount} of {PHARMACIES.length} nearby pharmacies have{" "}
              <span className="font-medium">{medication?.name}</span> available.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              In stock only
            </label>
          </div>

          <ul className="space-y-3">
            {results.map((pharmacy) => {
              const stock = pharmacy.stock[medicationId];
              const meta = STATUS_META[stock.status];
              const reserved = reservation?.pharmacyId === pharmacy.id;
              const canReserve = stock.status !== "out" && !reservation;
              return (
                <li
                  key={pharmacy.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{pharmacy.name}</p>
                      {pharmacy.open24h && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          24h
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {pharmacy.address} · {pharmacy.distanceMiles} mi
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Updated {stock.updatedMinsAgo} min ago
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}
                      >
                        {meta.label}
                        {stock.status !== "out" ? ` · ${stock.units} units` : ""}
                      </span>
                      {stock.status !== "out" && (
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          ${stock.cashPrice} cash
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => reserve(pharmacy)}
                      disabled={!canReserve}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        reserved
                          ? "bg-emerald-600 text-white"
                          : canReserve
                            ? "border border-sky-500 text-sky-700 hover:bg-sky-50"
                            : "cursor-not-allowed border border-slate-200 text-slate-300"
                      }`}
                    >
                      {reserved ? "Reserved" : "Reserve"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!searched && !searching && (
        <p className="mt-8 text-center text-sm text-slate-400">
          Enter your ZIP code and check stock to find a pharmacy.
        </p>
      )}
      </div>

      <CollabLedger ledger={collab.ledger} pending={collab.pending} />
      <CollabOverlay pending={collab.pending} />
    </div>
  );
}

function ReservationBanner({
  reservation,
  onCancel,
}: {
  reservation: Reservation;
  onCancel: () => void;
}) {
  const remaining = useCountdown(reservation.expiresAt);
  const pharmacy = PHARMACIES.find((p) => p.id === reservation.pharmacyId);
  const medication = medicationById(reservation.medicationId);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const expired = remaining <= 0;
  const directionsUrl = pharmacy
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${pharmacy.name} ${pharmacy.address}`,
      )}`
    : undefined;

  if (expired) {
    return (
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-amber-800">
            Hold expired · {reservation.code} — the unit was released back to stock.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-amber-700 underline"
          >
            Search again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            Reserved for pickup
          </span>
          <span className="font-mono text-xs font-semibold text-emerald-700">
            {reservation.code}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Get directions
            </a>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-emerald-700 underline"
          >
            Cancel hold
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm font-semibold text-emerald-900">
        {medication?.name} {medication?.strength}
        {reservation.medicationId === PRESCRIPTION.medicationId
          ? ` · qty ${PRESCRIPTION.quantity}`
          : ""}
      </p>
      <p className="text-sm text-emerald-800">
        {pharmacy?.name}
        {pharmacy?.open24h ? " (open 24h)" : ""}
        {pharmacy ? ` · ${pharmacy.address} · ${pharmacy.distanceMiles} mi` : ""}
      </p>

      <div className="mt-2 flex items-center gap-4 rounded-lg bg-white/70 px-3 py-2">
        <p className="flex-1 text-sm font-medium text-emerald-900">
          <span className="font-semibold">Next step:</span> head to {pharmacy?.name}{" "}
          to pick it up before the hold expires. Bring a photo ID and the
          prescription.
        </p>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
            Expires in
          </p>
          <p className="font-mono text-lg font-semibold text-emerald-700">
            {mins}:{secs.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}

function useCountdown(expiresAt: number): number {
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now());
  const ref = useRef<number | null>(null);
  useEffect(() => {
    setRemaining(expiresAt - Date.now());
    ref.current = window.setInterval(() => {
      const left = expiresAt - Date.now();
      setRemaining(left > 0 ? left : 0);
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [expiresAt]);
  return remaining;
}

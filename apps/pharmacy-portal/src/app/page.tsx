import PharmacyPortal from "@/components/PharmacyPortal";
import WebmcpBadge from "@/components/WebmcpBadge";

export default function Home() {
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
              C
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">
                CarePoint <span className="text-teal-600">Pharmacy</span>
              </p>
              <p className="text-xs text-slate-500">Auto-Injector Finder</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 sm:flex">
            <span className="font-medium text-teal-700">Find a medication</span>
            <span>Transfer Rx</span>
            <span>Refills</span>
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Find an epinephrine auto-injector
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time stock varies by location. Reserve a hold to guarantee pickup.
          </p>
          <div className="mt-4">
            <WebmcpBadge accent="teal" />
          </div>
        </div>
        <PharmacyPortal />
      </main>

      <footer className="mx-auto max-w-4xl px-4 py-8 text-center text-xs text-slate-400">
        Demo portal for the WebMCP Challenge · not a real pharmacy · no PHI.
      </footer>
    </div>
  );
}

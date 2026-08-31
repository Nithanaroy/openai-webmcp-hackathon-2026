import DaycarePlan from "@/components/DaycarePlan";
import WebmcpBadge from "@/components/WebmcpBadge";

export default function Home() {
  return (
    <div className="min-h-full">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              B
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">
                BrightPath <span className="text-emerald-600">Childcare</span>
              </p>
              <p className="text-xs text-slate-500">Health &amp; Safety Forms</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 sm:flex">
            <span className="font-medium text-emerald-700">Allergy Action Plan</span>
            <span>Immunizations</span>
            <span>Emergency Contacts</span>
          </nav>
        </div>
      </header>

      <main>
        <div className="no-print mx-auto max-w-3xl px-4 pt-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Allergy &amp; Anaphylaxis Action Plan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete this plan so staff know exactly how to keep your child safe.
          </p>
          <div className="mt-4">
            <WebmcpBadge accent="emerald" />
          </div>
        </div>
        <DaycarePlan />
      </main>

      <footer className="no-print mx-auto max-w-3xl px-4 py-8 text-center text-xs text-slate-400">
        Demo portal for the WebMCP Challenge · not a real childcare system · no PHI.
      </footer>
    </div>
  );
}

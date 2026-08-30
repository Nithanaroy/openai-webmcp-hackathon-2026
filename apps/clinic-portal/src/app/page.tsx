import ClinicPortal from "@/components/ClinicPortal";

export default function Home() {
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">
              R
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">
                HealthConnect <span className="text-sky-600">MyChart</span>
              </p>
              <p className="text-xs text-slate-500">
                Riverside Pediatrics &amp; Allergy Network
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 sm:flex">
            <span className="font-medium text-sky-700">Appointments</span>
            <span>Messages</span>
            <span>Test Results</span>
            <span>Billing</span>
          </nav>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            DR
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Schedule an appointment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Follow the steps to request a specialist appointment for your child.
          </p>
        </div>
        <ClinicPortal />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
        Demo portal for the WebMCP Challenge · not a real medical system · no PHI.
      </footer>
    </div>
  );
}

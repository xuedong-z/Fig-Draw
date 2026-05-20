import type { PlotType } from "@/lib/types";
import { plotTypes } from "@/lib/defaultSettings";

export function PlotTypeSelector({ value, onChange }: { value: PlotType; onChange: (value: PlotType) => void }) {
  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">Plot Type</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {plotTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`rounded border px-3 py-2 text-left text-sm transition ${
              value === type.id ? "border-accent bg-accent text-white" : "border-rule bg-white hover:border-accent"
            }`}
            onClick={() => onChange(type.id)}
          >
            {type.label}
          </button>
        ))}
      </div>
    </section>
  );
}

import type { PlotType, ReferenceTemplate } from "@/lib/types";

export function ReferenceTemplateSelector({
  templates,
  plotType,
  selectedId,
  onSelect
}: {
  templates: ReferenceTemplate[];
  plotType: PlotType;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const filtered = templates.filter((template) => template.chart_type === plotType);

  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">Reference Library</h2>
      <div className="mt-4 grid gap-3">
        {filtered.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`rounded border p-3 text-left transition ${
              selectedId === template.id ? "border-accent bg-accent/10" : "border-rule bg-white hover:border-accent"
            }`}
            onClick={() => onSelect(template.id)}
          >
            <span className="block text-sm font-semibold">{template.name}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{template.description}</span>
            <span className="mt-2 block text-[11px] uppercase tracking-wide text-slate-500">
              Required: {(template.required_fields || template.required_semantic_fields?.map((field) => field.key) || []).join(", ")}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

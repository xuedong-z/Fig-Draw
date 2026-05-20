import type { DataMapping, UploadedDataset } from "@/lib/types";

const fields: { key: keyof DataMapping; label: string; optional?: boolean }[] = [
  { key: "x", label: "x axis column" },
  { key: "y", label: "y axis column" },
  { key: "group", label: "group column", optional: true },
  { key: "error", label: "error column", optional: true },
  { key: "second_y", label: "second y axis column", optional: true }
];

export function DataMappingPanel({
  dataset,
  mapping,
  onChange
}: {
  dataset: UploadedDataset | null;
  mapping: DataMapping;
  onChange: (mapping: DataMapping) => void;
}) {
  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">Data Mapping</h2>
      <div className="mt-4 grid gap-3">
        {fields.map((field) => (
          <label key={field.key} className="grid gap-1">
            <span className="control-label">
              {field.label} {field.optional ? "(optional)" : ""}
            </span>
            <select
              className="field"
              disabled={!dataset}
              value={mapping[field.key] || ""}
              onChange={(event) => onChange({ ...mapping, [field.key]: event.target.value || undefined })}
            >
              <option value="">Select column</option>
              {dataset?.columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

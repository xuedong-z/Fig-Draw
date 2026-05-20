import type { UploadedDataset } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export function DataPreview({ dataset }: { dataset: UploadedDataset | null }) {
  const { t } = useLanguage();

  if (!dataset) {
    return (
      <section className="panel-shell rounded-lg p-4">
        <h2 className="text-base font-semibold">{t("Data Preview", "数据预览")}</h2>
        <p className="mt-3 text-sm text-slate-500">{t("Upload a data file to inspect columns and preview rows.", "上传数据文件后，可查看列名和前几行数据。")}</p>
      </section>
    );
  }

  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">{t("Data Preview", "数据预览")}</h2>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              {dataset.columns.map((column) => (
                <th key={column} className="border-b border-rule bg-panel px-2 py-2 text-left font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.preview.map((row, index) => (
              <tr key={index}>
                {dataset.columns.map((column) => (
                  <td key={column} className="border-b border-rule px-2 py-2 text-slate-700">
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

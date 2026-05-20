import { Upload } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import type { UploadedDataset } from "@/lib/types";

type Props = {
  dataset: UploadedDataset | null;
  loading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
};

export function DataUploader({ dataset, loading, error, onUpload }: Props) {
  const { t } = useLanguage();

  return (
    <section className="panel-shell rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("Data Upload", "数据上传")}</h2>
        <Upload className="h-4 w-4 text-accent" />
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-rule bg-panel px-4 py-6 text-center transition hover:border-accent">
        <span className="text-sm font-semibold">{t("Upload CSV / TXT / XLSX", "上传 CSV / TXT / XLSX")}</span>
        <span className="mt-1 text-xs text-slate-500">{t("Headers are required for column mapping.", "文件需要包含表头，便于字段映射。")}</span>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </label>
      {loading && <p className="mt-3 text-sm text-slate-500">{t("Reading data...", "正在读取数据...")}</p>}
      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {dataset && (
        <div className="mt-4 rounded border border-rule bg-white p-3 text-sm">
          <p className="font-semibold">{dataset.filename}</p>
          <p className="mt-1 text-slate-500">
            {dataset.row_count} {t("rows", "行")} · {dataset.columns.length} {t("columns", "列")}
          </p>
        </div>
      )}
    </section>
  );
}

import { AlertTriangle, ImageIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function PlotPreview({
  image,
  loading,
  error,
  warnings
}: {
  image: string | null;
  loading: boolean;
  error: string | null;
  warnings: string[];
}) {
  const { t } = useLanguage();

  return (
    <section className="panel-shell rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("Plot Preview", "图表预览")}</h2>
        <ImageIcon className="h-4 w-4 text-accent" />
      </div>
      <div className="flex min-h-[360px] items-center justify-center rounded border border-rule bg-white p-4">
        {loading && <p className="text-sm text-slate-500">{t("Generating plot...", "正在生成图表...")}</p>}
        {!loading && image && <img src={image} alt="Generated scientific plot" className="max-h-[520px] max-w-full object-contain" />}
        {!loading && !image && <p className="text-sm text-slate-500">{t("Upload data, map fields, and generate a plot.", "上传数据、完成字段映射后生成图表。")}</p>}
      </div>
      {error && (
        <div className="mt-3 flex gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}

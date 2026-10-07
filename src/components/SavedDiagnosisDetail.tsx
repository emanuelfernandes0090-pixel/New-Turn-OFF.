import React, { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Zap,
  Users,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Sliders,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Tv,
  Thermometer,
  Lightbulb,
  Droplets,
  HardDrive,
  Info,
  FileDown,
  Check,
} from "lucide-react";
import { SavedDiagnosis, AccessibilitySettings } from "../types";
import { formatBRL, formatNumber } from "../lib/energy";
import { downloadPdfReport } from "../lib/pdfReportCompiler";

interface SavedDiagnosisDetailProps {
  diagnosis: SavedDiagnosis;
  onBack: () => void;
  onOpenSimulator: (diagnosis: SavedDiagnosis) => void;
  onOpenDiagnosisTab?: (diagnosis: SavedDiagnosis) => void;
  onShare: (diagnosis: SavedDiagnosis) => void;
  settings: AccessibilitySettings;
}

export const SavedDiagnosisDetail: React.FC<SavedDiagnosisDetailProps> = ({
  diagnosis,
  onBack,
  onOpenSimulator,
  onOpenDiagnosisTab,
  onShare,
  settings,
}) => {
  const { input, result, createdAt, kind } = diagnosis;
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Prepare horizontal ranked chart data defensively
  const totalEstimated = result?.totalEstimated || 1;
  const effectiveCostPerKwh = result?.effectiveCostPerKwh || 0.88;
  const rankedItems = [...(result?.estimates || [])]
    .sort((a, b) => b.monthlyKwh - a.monthlyKwh)
    .slice(0, 6)
    .map((item) => {
      const pct = Math.round((item.monthlyKwh / totalEstimated) * 100);
      const cost = item.monthlyKwh * effectiveCostPerKwh;
      return {
        id: item.id,
        label: item.label,
        kwh: Math.round(item.monthlyKwh * 10) / 10,
        pct,
        cost,
      };
    });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadPdfReport({ type: "diagnosis", diagnosis });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
      if (typeof window !== "undefined") {
        window.focus();
      }
    }
  };

  const validDate = new Date(createdAt);
  const formattedDate = !isNaN(validDate.getTime())
    ? validDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data recente";

  return (
    <div
      id="saved-diagnosis-detail-view"
      className="space-y-6 animate-in fade-in duration-300"
    >
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <button
            type="button"
            id="btn-detail-back-history"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Histórico
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:white font-['Space_Grotesk']">
              Detalhes do Diagnóstico
            </h1>
            <span
              className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full ${
                kind === "teste"
                  ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {kind === "teste"
                ? "Simulação de Teste"
                : "Diagnóstico Principal"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Salvo em {formattedDate}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenDiagnosisTab && (
            <button
              type="button"
              id="btn-detail-open-diagnosis-tab"
              onClick={() => onOpenDiagnosisTab(diagnosis)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              Abrir no Diagnóstico
            </button>
          )}
          <button
            type="button"
            id="btn-detail-share"
            onClick={() => onShare(diagnosis)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            Compartilhar
          </button>
          <button
            type="button"
            id="btn-detail-download-pdf"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {isDownloading ? (
              <span>Gerando...</span>
            ) : downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>PDF Baixado!</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </>
            )}
          </button>
          <button
            type="button"
            id="btn-detail-open-simulator"
            onClick={() => onOpenSimulator(diagnosis)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5" />
            Abrir na Simulação
          </button>
        </div>
      </div>

      {/* Critical Safety Notice if any safety risks were identified */}
      {result?.safetyAlert && (
        <div
          id="saved-detail-safety-alert"
          className="p-5 rounded-3xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-950 dark:text-red-200 shadow-sm space-y-2"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base">
              Atenção: Alerta de Segurança Elétrica Registrado
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-red-900/90 dark:text-red-300 leading-relaxed">
            Durante este diagnóstico foram apontadas condições elétricas de
            risco (ex: aquecimento em tomadas, cheiro de fiação queimada,
            ausência de aterramento ou disjuntor incompatível). A integridade e
            segurança da sua família são prioritárias: consulte um profissional
            eletricista qualificado.
          </p>
        </div>
      )}

      {/* Main Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Total Estimado
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
            {formatNumber(result?.totalEstimated ?? 0)}{" "}
            <span className="text-xs font-normal text-slate-500">kWh/mês</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Fatura real informada: {input?.monthlyKwh ?? "—"} kWh
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Custo Estimado
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-['Space_Grotesk']">
            {formatBRL((result?.totalEstimated ?? 0) * effectiveCostPerKwh)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tarifa base: {formatBRL(effectiveCostPerKwh)}/kWh
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Por Morador
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
            {formatNumber(result?.kwhPerPerson ?? 0)}{" "}
            <span className="text-xs font-normal text-slate-500">kWh</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {formatBRL(result?.costPerPerson ?? 0)}/pessoa ({input?.occupants ?? 1} pessoas)
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            Confiabilidade
          </span>
          <p className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 font-['Space_Grotesk']">
            {result?.confidenceScore ?? 80}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
            Nível: {result?.confidence || "Média"} ({result?.coherence || "Compatível"})
          </p>
        </div>
      </div>

      {/* Distribution Chart - Ranking Horizontal de Aparelhos */}
      {rankedItems.length > 0 && (
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Ranking de Consumo por Aparelho
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribuição estimada das maiores parcelas de energia da residência ({formatNumber(result?.totalEstimated ?? totalEstimated)} kWh totais)
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {rankedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 transition-all hover:border-teal-400 dark:hover:border-teal-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-teal-600/15 text-teal-700 dark:text-teal-300 font-black text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-x-2.5 gap-y-1 self-start sm:self-auto shrink-0 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {formatNumber(item.kwh)} kWh/mês
                    </span>
                    <span className="text-xs font-black text-teal-700 dark:text-teal-400">
                      {formatBRL(item.cost)}/mês
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800/60 shrink-0">
                      {item.pct}% do total
                    </span>
                  </div>
                </div>

                {/* Barra Horizontal em Tom Teal/Esmeralda */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, item.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Appliances List */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Aparelhos Inventariados ({result?.estimates?.length || 0})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Detalhamento de potência, regime de uso e impacto na conta
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Aparelho</th>
                <th className="py-2.5 px-3 font-semibold text-center">Qtd</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Potência
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Uso Diário
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Consumo (kWh)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Custo Estimado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {result?.estimates?.map((item) => {
                const itemCost = item.monthlyKwh * effectiveCostPerKwh;
                const pct = ((item.monthlyKwh / totalEstimated) * 100).toFixed(
                  1,
                );
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {pct}% do consumo estimado
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-medium">
                      {item.quantity || 1}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      {item.powerWatts} W
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      {item.hoursPerDay}h/dia ({item.frequency || 30}d/mês)
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatNumber(item.monthlyKwh)} kWh
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBRL(itemCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations & Potential Savings */}
      {result?.recommendations && result.recommendations.length > 0 && (
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            Recomendações Geradas neste Diagnóstico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {result.recommendations.map((rec) => {
              const maxSavings = rec.potentialKwh?.[1] || 0;
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {rec.title}
                    </h4>
                    {maxSavings > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                        Economia ~{formatNumber(maxSavings)} kWh
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {settings.simpleLanguage && rec.actionSimple
                      ? rec.actionSimple
                      : rec.action}
                  </p>
                  {(rec.why || rec.whySimple) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
                      {settings.simpleLanguage && rec.whySimple
                        ? rec.whySimple
                        : rec.why}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

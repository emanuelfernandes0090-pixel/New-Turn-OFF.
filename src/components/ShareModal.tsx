import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  X,
  FileDown,
  Printer,
  Sparkles,
  Zap,
  ShoppingBag,
  FileCheck,
  Send,
  Loader2,
} from "lucide-react";
import { SavedDiagnosis, ExtractedBill } from "../types";
import { formatBRL, formatNumber } from "../lib/energy";
import { loadDiagnoses, loadBillScans } from "../lib/storage";
import { downloadPdfReport, generateStaticPdfBlob, compileReport, ReportPayload } from "../lib/pdfReportCompiler";

export type SharePayload =
  | { type: "app" }
  | { type: "diagnosis"; diagnosis: SavedDiagnosis }
  | {
      type: "simulation";
      baseline?: SavedDiagnosis | null;
      scenario: {
        label?: string;
        monthlyKwh: number;
        savingsKwh: number;
        monthlyCost?: number;
        savingsBrl: number;
        changesSummary?: string[];
        baseMonthlyBrl?: number;
        baseMonthlyKwh?: number;
        actionsCount?: number;
        summaryTitle?: string;
      };
    }
  | {
      type: "payback";
      equipmentName: string;
      investmentCost: number;
      monthlySavings: number;
      annualSavings?: number;
      paybackMonths: number;
      return5Years?: number;
      viable?: boolean;
    }
  | { type: "bill"; bill: ExtractedBill };

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload?: SharePayload | null;
  latestDiagnosis?: SavedDiagnosis | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  payload,
  latestDiagnosis,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const currentUrl =
    typeof window !== "undefined"
      ? window.location.href
      : "https://turnoff.app";

  // Resolve active payload
  const activePayload: SharePayload = payload
    ? payload
    : latestDiagnosis
      ? { type: "diagnosis", diagnosis: latestDiagnosis }
      : { type: "app" };

  let modalTitle = "Compartilhar & Exportar";
  let modalSubtitle = "Divulgue o Turn OFF ou baixe seus resultados em PDF";
  let shareText = "";
  let toolColorClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
  let toolIconBg = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400";
  let toolBorderClass = "border-emerald-500";
  let toolName = "Diagnóstico";

  switch (activePayload.type) {
    case "diagnosis": {
      const diag = activePayload.diagnosis;
      modalTitle = "Exportar & Compartilhar Diagnóstico";
      modalSubtitle = "Resumo dos aparelhos, consumo mensal e plano de economia";
      toolColorClass = "bg-teal-600 hover:bg-teal-700 text-white";
      toolIconBg = "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400";
      toolBorderClass = "border-teal-500";
      toolName = "Diagnóstico Residencial";
      shareText =
        `💡 Turn OFF - Diagnóstico Energético Residencial:\n` +
        `• Consumo Residencial Mapeado: ${formatNumber(diag.result.totalEstimated)} kWh/mês\n` +
        `• Economia Média Projetada: ${formatNumber(diag.result.savings.probable[0])} a ${formatNumber(
          diag.result.savings.probable[1],
        )} kWh/mês\n` +
        `• Confiabilidade dos Dados: ${diag.result.confidenceScore}%\n` +
        `• Prioridades: ${
          diag.result.recommendations
            ?.slice(0, 2)
            .map((a) => a.title)
            .join("; ") || "Consumo eficiente"
        }\n` +
        `Acesse o app gratuito desenvolvido pela EEEP Dom Walfrido Teixeira Vieira (GT-02): ${currentUrl}`;
      break;
    }
    case "bill": {
      const b = activePayload.bill;
      modalTitle = "Exportar & Compartilhar Auditoria de Fatura";
      modalSubtitle = "Resumo dos dados auditados da conta de luz com IA";
      toolColorClass = "bg-orange-600 hover:bg-orange-700 text-white";
      toolIconBg = "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400";
      toolBorderClass = "border-orange-500";
      toolName = "Leitor de Contas";
      shareText =
        `💡 Turn OFF - Auditoria de Conta de Energia Elétrica:\n` +
        `• Distribuidora: ${b.distribuidora || "Concessionária"}\n` +
        `• Mês de Referência: ${b.mes_referencia || "Atual"}\n` +
        `• Consumo Faturado: ${b.consumo_kwh ?? "—"} kWh\n` +
        `• Valor Total: ${formatBRL(b.valor_total || 0)}\n` +
        `• Tarifa Social Aplicada: ${b.tarifa_social_identificada ? "Sim (Ativa)" : "Não identificada"}\n` +
        `Audite sua fatura grátis pelo Turn OFF: ${currentUrl}`;
      break;
    }
    case "payback": {
      modalTitle = "Exportar & Compartilhar Análise de Payback";
      modalSubtitle = "Tempo de retorno financeiro e lucro para troca de aparelhos";
      toolColorClass = "bg-indigo-600 hover:bg-indigo-700 text-white";
      toolIconBg = "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400";
      toolBorderClass = "border-indigo-500";
      toolName = "Simulador de Payback";
      shareText =
        `💡 Turn OFF - Análise de Viabilidade Financeira (Payback):\n` +
        `• Equipamento Eficiente: ${activePayload.equipmentName}\n` +
        `• Custo do Investimento: ${formatBRL(activePayload.investmentCost)}\n` +
        `• Economia Mensal na Conta: ${formatBRL(activePayload.monthlySavings)}/mês\n` +
        `• Retorno do Investimento (Payback): ${activePayload.paybackMonths} meses\n` +
        `• Lucro Líquido em 5 anos: ${formatBRL(activePayload.return5Years ?? activePayload.monthlySavings * 60 - activePayload.investmentCost)}\n` +
        `Calcule o payback de seus aparelhos no Turn OFF: ${currentUrl}`;
      break;
    }
    case "simulation": {
      const sim = activePayload.scenario;
      const simTitle = sim.label || sim.summaryTitle || "Simulação de Otimização de Hábitos";
      modalTitle = "Exportar & Compartilhar Simulação";
      modalSubtitle = "Comparativo entre consumo atual e novo hábito simulado";
      toolColorClass = "bg-blue-600 hover:bg-blue-700 text-white";
      toolIconBg = "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400";
      toolBorderClass = "border-blue-500";
      toolName = "Simulação";
      shareText =
        `💡 Turn OFF - ${simTitle}:\n` +
        `• Novo Consumo Simulado: ${formatNumber(sim.monthlyKwh ?? 0)} kWh/mês\n` +
        `• Redução Estimada: -${formatNumber(sim.savingsKwh ?? 0)} kWh/mês\n` +
        `• Economia Financeira na Conta: ${formatBRL(sim.savingsBrl ?? 0)}/mês\n` +
        `Faça sua própria simulação gratuitamente: ${currentUrl}`;
      break;
    }
    case "app":
    default: {
      modalTitle = "Exportar & Compartilhar o Turn OFF";
      modalSubtitle = "Educação, Eficiência Energética Residencial e Cidadania";
      toolColorClass = "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white";
      toolIconBg = "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400";
      toolBorderClass = "border-slate-800 dark:border-emerald-500";
      toolName = "Aplicativo Geral";
      shareText =
        `💡 Conheça o Turn OFF — Aplicativo gratuito de eficiência energética e cidadania desenvolvido pelo GT-02 da EEEP Dom Walfrido Teixeira Vieira:\n` +
        `Auditoria de conta de luz com IA, diagnóstico inteligente de aparelhos, simulação de hábitos e cenários, cálculo de payback e guia de segurança elétrica residencial!\n${currentUrl}`;
      break;
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Turn OFF - Eficiência Energética Residencial",
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch {
        // Fallback to copy if user cancelled or error
      }
    }
    handleCopy();
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      let compilerPayload: ReportPayload;

      if (activePayload.type === "app") {
        const diagnoses = loadDiagnoses();
        const bills = loadBillScans();
        compilerPayload = { type: "app", diagnoses, bills };
      } else if (activePayload.type === "diagnosis") {
        compilerPayload = { type: "diagnosis", diagnosis: activePayload.diagnosis };
      } else if (activePayload.type === "bill") {
        compilerPayload = { type: "bill", bill: activePayload.bill };
      } else if (activePayload.type === "payback") {
        compilerPayload = { ...activePayload };
      } else if (activePayload.type === "simulation") {
        const sc = activePayload.scenario;
        compilerPayload = {
          type: "simulation",
          baseline: activePayload.baseline,
          scenario: {
            label: sc.label || sc.summaryTitle || "Simulação de Otimização",
            summaryTitle: sc.summaryTitle || sc.label,
            monthlyKwh: sc.monthlyKwh ?? 0,
            savingsKwh: sc.savingsKwh ?? 0,
            monthlyCost:
              sc.monthlyCost ??
              (sc.baseMonthlyBrl ? Math.max(0, sc.baseMonthlyBrl - (sc.savingsBrl ?? 0)) : 0),
            savingsBrl: sc.savingsBrl ?? 0,
            changesSummary: sc.changesSummary,
            baseMonthlyBrl: sc.baseMonthlyBrl,
            baseMonthlyKwh: sc.baseMonthlyKwh,
            actionsCount: sc.actionsCount,
          },
        };
      } else {
        const diagnoses = loadDiagnoses();
        const bills = loadBillScans();
        compilerPayload = { type: "app", diagnoses, bills };
      }

      // Geração em memória com Blob estático (sem tocar no DOM nem re-renderizar nós)
      const { blob, filename } = await generateStaticPdfBlob(compilerPayload);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 1500);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setIsDownloading(false);
      document.body.style.pointerEvents = "";
      document.documentElement.style.pointerEvents = "";
      if (typeof window !== "undefined") {
        window.focus();
      }
    }
  };

  const handlePrint = () => {
    let compilerPayload: ReportPayload;
    if (activePayload.type === "app") {
      const diagnoses = loadDiagnoses();
      const bills = loadBillScans();
      compilerPayload = { type: "app", diagnoses, bills };
    } else {
      // @ts-ignore
      compilerPayload = { ...activePayload };
    }

    const { html } = compileReport(compilerPayload);
    
    // Cria iframe isolado invisível para não abrir popups bloqueantes nem travar a janela
    const printFrame = document.createElement("iframe");
    printFrame.id = "turnoff-isolated-print-frame";
    printFrame.style.position = "fixed";
    printFrame.style.top = "0";
    printFrame.style.left = "0";
    printFrame.style.width = "1px";
    printFrame.style.height = "1px";
    printFrame.style.opacity = "0";
    printFrame.style.border = "none";
    printFrame.style.pointerEvents = "none";
    document.body.appendChild(printFrame);

    try {
      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                @page { size: A4; margin: 10mm; }
                body { margin: 0; padding: 15px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn("Falha no diálogo de impressão isolado:", e);
          } finally {
            setTimeout(() => {
              if (document.body.contains(printFrame)) {
                document.body.removeChild(printFrame);
              }
              document.body.style.pointerEvents = "";
              document.documentElement.style.pointerEvents = "";
              if (typeof window !== "undefined") window.focus();
            }, 600);
          }
        }, 400);
      }
    } catch (e) {
      console.warn("Falha ao preparar impressão:", e);
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
    }
  };

  const handleSafeClose = () => {
    document.body.style.pointerEvents = "";
    document.documentElement.style.pointerEvents = "";
    if (typeof window !== "undefined") {
      window.focus();
    }
    onClose();
  };

  return (
    <div
      id="share-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-start justify-center pt-6 sm:pt-12 pb-16 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSafeClose();
      }}
    >
      <div
        id="share-modal-container"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl ${toolIconBg} flex items-center justify-center font-bold`}>
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {modalTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button
            id="btn-close-share"
            onClick={handleSafeClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: Download PDF in Tool's Native Theme Color */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Compilar & Baixar Relatório Oficial
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Formato PDF A4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              id="btn-download-compiled-pdf"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className={`p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${toolColorClass} ${
                isDownloading ? "opacity-75 cursor-wait" : ""
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Compilando PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>PDF Baixado com Sucesso!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>Baixar PDF Formatado</span>
                </>
              )}
            </button>

            <button
              id="btn-share-print"
              onClick={handlePrint}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Imprimir / Visualizar</span>
            </button>
          </div>
        </div>

        {/* Instant Sharing Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Opções de Compartilhamento:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* WhatsApp */}
            <button
              id="btn-share-whatsapp"
              onClick={handleWhatsApp}
              className="p-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Compartilhar no WhatsApp"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp</span>
            </button>

            {/* Native Mobile Share */}
            <button
              id="btn-share-native"
              onClick={handleNativeShare}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Compartilhar pelo Celular"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>Celular / Apps</span>
            </button>

            {/* Copy Link / Summary */}
            <button
              id="btn-share-copy"
              onClick={handleCopy}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Copiar texto formatado"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Copiar Resumo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text preview box */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Pré-visualização da Mensagem:
          </label>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
            {shareText}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from "react";
import {
  History,
  Trash2,
  Download,
  Upload,
  Zap,
  TrendingUp,
  FileText,
  Sliders,
  ArrowRight,
  Share2,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building,
  RefreshCw,
  X,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  SavedDiagnosis,
  BillScanRecord,
  AccessibilitySettings,
} from "../types";
import { formatBRL, formatNumber } from "../lib/energy";
import {
  exportAppData,
  importAppData,
  validateBackupJson,
  getStorageStats,
  BackupValidationResult,
} from "../lib/storage";
import { auth } from "../lib/firebase";
import { syncToCloud } from "../lib/sync/firebaseSync";
import { SavedDiagnosisDetail } from "./SavedDiagnosisDetail";
import { AdSlot } from "./AdSlot";

interface HistoryViewProps {
  diagnoses: SavedDiagnosis[];
  billScans: BillScanRecord[];
  onSelectDiagnosis: (diagnosis: SavedDiagnosis) => void;
  onSelectBill: (billScan: BillScanRecord) => void;
  onDeleteDiagnosis: (id: string) => void;
  onDeleteBill: (id: string) => void;
  onClearAll: () => void;
  onDataImported: () => void;
  onOpenShare?: (diagnosis?: SavedDiagnosis) => void;
  onOpenSimulator?: (diagnosis: SavedDiagnosis) => void;
  onOpenAuth?: () => void;
  onNavigateToTab?: (tab: any) => void;
  settings: AccessibilitySettings;
}

const HistoryViewComponent: React.FC<HistoryViewProps> = ({
  diagnoses,
  billScans,
  onSelectDiagnosis,
  onSelectBill,
  onDeleteDiagnosis,
  onDeleteBill,
  onClearAll,
  onDataImported,
  onOpenShare,
  onOpenSimulator,
  onOpenAuth,
  onNavigateToTab,
  settings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"diagnoses" | "bills">("diagnoses");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedDiagnosisDetail, setSelectedDiagnosisDetail] = useState<SavedDiagnosis | null>(null);
  const [billMetric, setBillMetric] = useState<"kwh" | "brl">("kwh");

  // Backup modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupActiveTab, setBackupActiveTab] = useState<"local" | "cloud">("local");
  const [copiedJson, setCopiedJson] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [pendingImportContent, setPendingImportContent] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState<string | null>(null);
  const [cloudUser, setCloudUser] = useState(auth.currentUser);

  // Bill search & filter state
  const [billSearchTerm, setBillSearchTerm] = useState("");
  const [billDistributorFilter, setBillDistributorFilter] = useState("all");
  const [billSortOrder, setBillSortOrder] = useState<"recent" | "oldest" | "highest_kwh" | "highest_val">("recent");
  const [confirmDeleteBillId, setConfirmDeleteBillId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCloudUser(u));
    return () => unsub();
  }, []);

  // If a diagnosis is selected for detailed inspection, render the SavedDiagnosisDetail view
  if (selectedDiagnosisDetail) {
    return (
      <SavedDiagnosisDetail
        diagnosis={selectedDiagnosisDetail}
        onBack={() => setSelectedDiagnosisDetail(null)}
        onOpenDiagnosisTab={(diag) => onSelectDiagnosis(diag)}
        onOpenSimulator={(diag) => {
          if (onOpenSimulator) {
            onOpenSimulator(diag);
          } else {
            onSelectDiagnosis(diag);
          }
        }}
        onShare={(diag) => {
          if (onOpenShare) {
            onOpenShare(diag);
          }
        }}
        settings={settings}
      />
    );
  }

  // Group diagnoses: Principal vs Teste
  const principalDiagnoses = useMemo(
    () => (diagnoses || []).filter((d) => d.kind !== "teste"),
    [diagnoses]
  );
  const testDiagnoses = useMemo(
    () => (diagnoses || []).filter((d) => d.kind === "teste"),
    [diagnoses]
  );

  // Bill Analytics & Financial Summary
  const billSummary = useMemo(() => {
    const validBills = (billScans || []).filter((s) => s && s.bill);
    if (validBills.length === 0) return null;

    let totalSpent = 0;
    let totalKwh = 0;
    let maxBillVal = 0;
    let minBillVal = Infinity;
    const distributorCounts: Record<string, number> = {};

    validBills.forEach((s) => {
      const val = s.bill.valor_total || 0;
      const kwh = s.bill.consumo_kwh || 0;
      totalSpent += val;
      totalKwh += kwh;
      if (val > maxBillVal) maxBillVal = val;
      if (val < minBillVal) minBillVal = val;
      if (s.bill.distribuidora) {
        distributorCounts[s.bill.distribuidora] = (distributorCounts[s.bill.distribuidora] || 0) + 1;
      }
    });

    const averageKwh = validBills.length > 0 ? Math.round(totalKwh / validBills.length) : 0;
    const averageSpent = validBills.length > 0 ? totalSpent / validBills.length : 0;
    const effectiveCostPerKwh = totalKwh > 0 ? totalSpent / totalKwh : 0;

    return {
      totalSpent,
      totalKwh,
      averageKwh,
      averageSpent,
      effectiveCostPerKwh,
      maxBillVal,
      minBillVal: minBillVal === Infinity ? 0 : minBillVal,
      count: validBills.length,
      distributors: Object.keys(distributorCounts),
    };
  }, [billScans]);

  // Filtered and sorted bill scans
  const filteredBillScans = useMemo(() => {
    let result = (billScans || []).filter((s) => s && s.bill);

    // Search filter
    if (billSearchTerm.trim()) {
      const q = billSearchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          (s.bill.mes_referencia && s.bill.mes_referencia.toLowerCase().includes(q)) ||
          (s.bill.distribuidora && s.bill.distribuidora.toLowerCase().includes(q)) ||
          (s.bill.vencimento && s.bill.vencimento.includes(q))
      );
    }

    // Distributor filter
    if (billDistributorFilter !== "all") {
      result = result.filter((s) => s.bill.distribuidora === billDistributorFilter);
    }

    // Sort
    return result.sort((a, b) => {
      const timeA = new Date(a.scannedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.scannedAt || b.createdAt || 0).getTime();
      if (billSortOrder === "recent") return timeB - timeA;
      if (billSortOrder === "oldest") return timeA - timeB;
      if (billSortOrder === "highest_kwh") return (b.bill.consumo_kwh || 0) - (a.bill.consumo_kwh || 0);
      if (billSortOrder === "highest_val") return (b.bill.valor_total || 0) - (a.bill.valor_total || 0);
      return 0;
    });
  }, [billScans, billSearchTerm, billDistributorFilter, billSortOrder]);

  // Chart data from saved bills (sorted chronologically)
  const billChartData = useMemo(() => {
    return (billScans || [])
      .filter((scan) => scan && scan.bill)
      .map((scan) => {
        const dateStr = scan.scannedAt || scan.createdAt || new Date().toISOString();
        const validDate = new Date(dateStr);
        const isDateValid = !isNaN(validDate.getTime());
        const formattedDate = isDateValid
          ? validDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          : "Recente";

        return {
          mes: scan.bill.mes_referencia || formattedDate,
          kWh: scan.bill.consumo_kwh || 0,
          valor: scan.bill.valor_total || 0,
          rawDate: isDateValid ? validDate.getTime() : 0,
        };
      })
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [billScans]);

  // Chart data from saved diagnoses (evolution of estimated consumption across analyses)
  const diagnosisChartData = useMemo(() => {
    return (diagnoses || [])
      .filter((diag) => diag && diag.result)
      .map((diag) => {
        const validDate = new Date(diag.createdAt);
        const isDateValid = !isNaN(validDate.getTime());
        const formattedDate = isDateValid
          ? validDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
          : "Recente";

        const totalEst = diag.result?.totalEstimated ?? 0;
        const costKwh = diag.result?.effectiveCostPerKwh ?? 0.88;

        return {
          data: formattedDate,
          estimadoKwh: Math.round(totalEst),
          faturadoKwh: diag.input?.monthlyKwh ? Math.round(diag.input.monthlyKwh) : 0,
          custoEstimadoBrl: Math.round(totalEst * costKwh),
          rawDate: isDateValid ? validDate.getTime() : 0,
          kind: diag.kind === "teste" ? "Simulação" : "Diagnóstico",
        };
      })
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [diagnoses]);

  // Export JSON file
  const handleExportJson = () => {
    const jsonStr = exportAppData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turn-off-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    const jsonStr = exportAppData();
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // fallback
    }
  };

  // File selection and pre-validation
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatusMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setPendingImportContent(content);
      const val = validateBackupJson(content);
      setValidationResult(val);
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleConfirmImport = () => {
    if (!pendingImportContent) return;
    const success = importAppData(pendingImportContent, { mode: importMode });
    if (success) {
      setImportStatusMessage({
        type: "success",
        text: `Backup restaurado com sucesso no modo ${importMode === "merge" ? "Mesclagem" : "Substituição Total"}!`,
      });
      setPendingImportContent(null);
      setValidationResult(null);
      onDataImported();
    } else {
      setImportStatusMessage({
        type: "error",
        text: "Falha ao restaurar o arquivo de backup. Verifique se o arquivo é válido.",
      });
    }
  };

  // Trigger cloud sync
  const handleCloudSync = async () => {
    setSyncingCloud(true);
    setCloudSyncSuccess(null);
    try {
      await syncToCloud();
      setCloudSyncSuccess("Dados sincronizados com sucesso na nuvem!");
      onDataImported();
    } catch (e) {
      setImportStatusMessage({
        type: "error",
        text: "Falha na sincronização com a nuvem. Seus dados continuam salvos localmente.",
      });
    } finally {
      setSyncingCloud(false);
    }
  };

  const hasAnyData = (diagnoses && diagnoses.length > 0) || (billScans && billScans.length > 0);
  const storageStats = getStorageStats();

  return (
    <div id="history-view" className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/60">
            <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Memória & Evolução
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight">
            Histórico de Contas & Diagnósticos
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed text-pretty">
            Monitore suas faturas de luz, compare simulações e preserve seus dados com backup seguro em arquivo ou na nuvem.
          </p>
        </div>

        {/* Primary Backup & Accounts Center CTA */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            id="btn-open-backup-modal"
            type="button"
            onClick={() => setIsBackupModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            title="Gerenciador de Backup Local e Sincronização em Nuvem"
          >
            <Database className="w-4 h-4 text-amber-100" />
            <span>Central de Backup & Nuvem</span>
            {cloudUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-amber-600" title="Nuvem conectada" />
            )}
          </button>
        </div>
      </div>

      {/* Historical Charts Grid: Evolução de Contas & Diagnósticos */}
      {hasAnyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bill Evolution Chart */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 font-['Space_Grotesk']">
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Evolução das Faturas Cadastradas
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Histórico real baseado nos comprovantes escaneados
                </p>
              </div>

              {/* Metric Toggle */}
              {billChartData.length > 0 && (
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setBillMetric("kwh")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      billMetric === "kwh"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Consumo (kWh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillMetric("brl")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      billMetric === "brl"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Valor (R$)
                  </button>
                </div>
              )}
            </div>

            {billChartData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={billChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (billMetric === "kwh" ? `${val}k` : `R$${val}`)}
                    />
                    <Tooltip
                      formatter={(val: number) => [
                        billMetric === "kwh" ? `${formatNumber(val)} kWh` : formatBRL(val),
                        billMetric === "kwh" ? "Consumo Faturado" : "Valor da Fatura",
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey={billMetric === "kwh" ? "kWh" : "valor"}
                      name={billMetric === "kwh" ? "Consumo (kWh)" : "Valor (R$)"}
                      fill="#d97706"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                <FileText className="w-8 h-8 text-amber-500/50 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Nenhuma fatura escaneada ainda.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Escaneie suas contas na aba Leitor de Contas para ver a evolução mensal.
                </p>
              </div>
            )}
          </div>

          {/* Diagnoses Evolution Chart */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 font-['Space_Grotesk']">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Trajetória dos Diagnósticos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Estimativas acumuladas em relação ao consumo registrado
              </p>
            </div>

            {diagnosisChartData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diagnosisChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}k`}
                    />
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        `${formatNumber(val)} kWh/mês`,
                        name === "estimadoKwh" ? "Estimado pelos Aparelhos" : "Faturado na Conta",
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      formatter={(name) => (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {name === "estimadoKwh" ? "Estimado Aparelhos" : "Faturado Conta"}
                        </span>
                      )}
                    />
                    <Bar dataKey="estimadoKwh" name="estimadoKwh" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="faturadoKwh" name="faturadoKwh" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                <Zap className="w-8 h-8 text-amber-500/50 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Nenhum diagnóstico registrado.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Conclua um diagnóstico na aba Diagnóstico Residencial para acompanhar seu histórico aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab navigation (Diagnósticos vs Faturas de Luz) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          id="btn-subtab-diagnoses"
          onClick={() => setActiveSubTab("diagnoses")}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "diagnoses"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Diagnósticos do Lar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-black">
            {diagnoses.length}
          </span>
        </button>

        <button
          type="button"
          id="btn-subtab-bills"
          onClick={() => setActiveSubTab("bills")}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "bills"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Contas & Faturas de Luz</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-black">
            {billScans.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Diagnoses List */}
      {activeSubTab === "diagnoses" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Diagnósticos Principais */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Diagnósticos do Lar ({principalDiagnoses.length})
            </h3>

            {principalDiagnoses.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nenhum diagnóstico principal concluído ainda.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Realize sua primeira auditoria residencial para mapear o consumo dos seus aparelhos.
                  </p>
                </div>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab("diagnosis")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    Iniciar Diagnóstico Agora
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {principalDiagnoses.map((diag) => (
                  <div
                    key={diag.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Diagnóstico de {new Date(diag.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold whitespace-nowrap">
                          {diag.result?.confidence || "alta"} confiança
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(diag.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-pretty">
                        Consumo faturado: <strong className="text-slate-900 dark:text-slate-100">{diag.input?.monthlyKwh ? `${diag.input.monthlyKwh} kWh` : "Não informado"}</strong> · Estimado: <strong className="text-amber-700 dark:text-amber-400">{formatNumber(diag.result?.totalEstimated ?? 0)} kWh</strong> · {diag.input?.occupants ?? 1} moradores
                      </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto shrink-0">
                      {onOpenShare && (
                        <button
                          type="button"
                          onClick={() => onOpenShare(diag)}
                          className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          title="Compartilhar / Relatório"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        id={`btn-view-detail-${diag.id}`}
                        onClick={() => onSelectDiagnosis(diag)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Abrir diagnóstico completo com equipamentos, medidas e totais"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Ver Detalhes / Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDiagnosisDetail(diag)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Ver resumo rápido deste diagnóstico"
                      >
                        Resumo Rápido
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDiagnosis(diag.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title="Excluir diagnóstico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Simulações e Hipóteses de Economia */}
          {testDiagnoses.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Simulações & Hipóteses de Economia ({testDiagnoses.length})
              </h3>

              <div className="space-y-3">
                {testDiagnoses.map((diag) => (
                  <div
                    key={diag.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Hipótese de {new Date(diag.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold whitespace-nowrap">
                          Simulação
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(diag.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-pretty">
                        {diag.simulation?.description || `Consumo estimado simulado: ${formatNumber(diag.result?.totalEstimated ?? 0)} kWh/mês`}
                      </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto shrink-0">
                      {onOpenShare && (
                        <button
                          type="button"
                          onClick={() => onOpenShare(diag)}
                          className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          title="Compartilhar / Relatório"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        id={`btn-view-detail-sim-${diag.id}`}
                        onClick={() => {
                          if (onOpenSimulator) {
                            onOpenSimulator(diag);
                          } else {
                            onSelectDiagnosis(diag);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Abrir simulação interativa"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Ver Detalhes / Simulação
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDiagnosisDetail(diag)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Ver resumo rápido desta simulação"
                      >
                        Resumo Rápido
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDiagnosis(diag.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title="Excluir simulação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Enhanced Bills List (Opção de Contas de Luz) */}
      {activeSubTab === "bills" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Financial & Energy Metrics Banner */}
          {billSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  Total Gasto
                </span>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {formatBRL(billSummary.totalSpent)}
                </div>
                <p className="text-[11px] text-slate-500">
                  {billSummary.count} fatura(s) cadastrada(s)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Média Mensal
                </span>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {billSummary.averageKwh} kWh
                </div>
                <p className="text-[11px] text-slate-500">
                  ~ {formatBRL(billSummary.averageSpent)} / mês
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  Custo Médio / kWh
                </span>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  R$ {billSummary.effectiveCostPerKwh.toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-500">
                  Média tarifária efetiva
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  Extremos (Min / Max)
                </span>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pt-1">
                  Min: <span className="text-emerald-600 dark:text-emerald-400">{formatBRL(billSummary.minBillVal)}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Max: <span className="text-amber-600 dark:text-amber-400">{formatBRL(billSummary.maxBillVal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Search, Filter & Sorting Bar */}
          {billScans.length > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por mês (ex: Jan/25, Março) ou distribuidora..."
                  value={billSearchTerm}
                  onChange={(e) => setBillSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                {billSearchTerm && (
                  <button
                    onClick={() => setBillSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Distributor dropdown */}
              {billSummary && billSummary.distributors.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={billDistributorFilter}
                    onChange={(e) => setBillDistributorFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs py-2 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">Todas Concessionárias</option>
                    {billSummary.distributors.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort Order */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={billSortOrder}
                  onChange={(e) => setBillSortOrder(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs py-2 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="oldest">Mais Antigas</option>
                  <option value="highest_val">Maior Valor (R$)</option>
                  <option value="highest_kwh">Maior Consumo (kWh)</option>
                </select>
              </div>
            </div>
          )}

          {/* Bills List or Empty State */}
          {billScans.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhuma conta de luz escaneada salva ainda
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Escaneie suas faturas físicas ou envie faturas em PDF pelo Leitor de Contas para acompanhar seus gastos reais mês a mês.
                </p>
              </div>
              {onNavigateToTab && (
                <button
                  type="button"
                  id="btn-goto-scanner-from-history"
                  onClick={() => onNavigateToTab("scanner")}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm cursor-pointer inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Escanear Conta de Energia Agora
                </button>
              )}
            </div>
          ) : filteredBillScans.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Nenhuma fatura encontrada com os filtros selecionados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBillSearchTerm("");
                  setBillDistributorFilter("all");
                }}
                className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBillScans.map((scan) => {
                const isAboveAverage =
                  billSummary && scan.bill.consumo_kwh && scan.bill.consumo_kwh > billSummary.averageKwh;
                const isBelowAverage =
                  billSummary && scan.bill.consumo_kwh && scan.bill.consumo_kwh < billSummary.averageKwh;

                return (
                  <div
                    key={scan.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                          {scan.bill.distribuidora || "Conta de Energia"} · {scan.bill.mes_referencia || "Mês de Referência"}
                        </span>
                        {scan.bill.tarifa_social_identificada && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold whitespace-nowrap">
                            Tarifa Social Ativa
                          </span>
                        )}
                        {scan.bill.bandeira && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border ${
                              scan.bill.bandeira.toLowerCase().includes("verde")
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300/60"
                                : scan.bill.bandeira.toLowerCase().includes("amarela")
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300/60"
                                : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300/60"
                            }`}
                          >
                            Bandeira {scan.bill.bandeira.replace("_", " ")}
                          </span>
                        )}
                        {isAboveAverage && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            (Acima da média)
                          </span>
                        )}
                        {isBelowAverage && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            (Abaixo da média)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          Consumo: <strong className="text-slate-900 dark:text-slate-100 font-bold">{scan.bill.consumo_kwh ?? "—"} kWh</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Valor: <strong className="text-amber-700 dark:text-amber-400 font-bold">{formatBRL(scan.bill.valor_total || 0)}</strong>
                        </span>
                        {scan.bill.vencimento && (
                          <>
                            <span>•</span>
                            <span>Vencimento: {scan.bill.vencimento}</span>
                          </>
                        )}
                        {scan.bill.unidade_consumidora && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-400">UC: {scan.bill.unidade_consumidora}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        id={`btn-view-bill-${scan.id}`}
                        onClick={() => onSelectBill(scan)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Abrir conta detalhada no Leitor de Contas"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Ver Detalhes / Abrir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {confirmDeleteBillId === scan.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteBill(scan.id);
                              setConfirmDeleteBillId(null);
                            }}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl cursor-pointer"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBillId(null)}
                            className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] rounded-xl cursor-pointer"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteBillId(scan.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="Excluir fatura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clear All Safety Action */}
      {hasAnyData && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Armazenamento local ocupado: <strong>~{storageStats.storageKb} KB</strong> ({storageStats.diagnosesCount} diagnósticos, {storageStats.billsCount} faturas)
          </span>

          {!showClearConfirm ? (
            <button
              type="button"
              id="btn-clear-all-data"
              onClick={() => setShowClearConfirm(true)}
              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer transition"
            >
              Limpar todos os dados salvos neste navegador
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-red-600 font-bold">
                Tem certeza? Todos os registros locais serão apagados.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl cursor-pointer transition shadow-2xs"
              >
                Sim, apagar tudo
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer transition"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* DEDICATED BACKUP & CLOUD MODAL */}
      {isBackupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="backup-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Central de Contas & Backup
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Exportação segura, restauração validada e nuvem
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center px-5 pt-3 border-b border-slate-100 dark:border-slate-800 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBackupActiveTab("local")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  backupActiveTab === "local"
                    ? "border-amber-500 text-amber-600 dark:text-amber-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Backup Local (.json)
              </button>
              <button
                type="button"
                onClick={() => setBackupActiveTab("cloud")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  backupActiveTab === "cloud"
                    ? "border-amber-500 text-amber-600 dark:text-amber-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                Sincronização em Nuvem
                {cloudUser && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* Status alerts */}
              {importStatusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 border animate-in fade-in ${
                    importStatusMessage.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                  }`}
                >
                  {importStatusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <p className="leading-snug">{importStatusMessage.text}</p>
                </div>
              )}

              {/* TAB 1: LOCAL BACKUP */}
              {backupActiveTab === "local" && (
                <div className="space-y-4">
                  
                  {/* Current Snapshot Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Status dos Dados Atuais
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {diagnoses.length}
                        </div>
                        <div className="text-[10px] text-slate-500">Diagnósticos</div>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {billScans.length}
                        </div>
                        <div className="text-[10px] text-slate-500">Faturas de Luz</div>
                      </div>
                    </div>
                  </div>

                  {/* Export Options */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      1. Exportar Cópia de Segurança
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="btn-download-backup-file"
                        onClick={handleExportJson}
                        className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Arquivo (.json)
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-400" />
                            Copiar para Área de Transf.
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Restore / Import Section */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      2. Restaurar ou Importar Dados
                    </span>

                    <label className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Selecionar arquivo .json de backup
                      </span>
                      <span className="text-[10px] text-slate-400">
                        O arquivo será validado antes de qualquer alteração
                      </span>
                      <input type="file" accept=".json" onChange={handleFileSelected} className="hidden" />
                    </label>

                    {/* Validation Preview Card */}
                    {validationResult && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 animate-in fade-in">
                        {validationResult.valid ? (
                          <>
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              Arquivo válido identificado!
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                              <p>
                                • Diagnósticos encontrados: <strong>{validationResult.diagnosesCount}</strong>
                              </p>
                              <p>
                                • Faturas de luz encontradas: <strong>{validationResult.billsCount}</strong>
                              </p>
                              {validationResult.exportedAt && (
                                <p className="text-[10px] text-slate-400">
                                  Exportado originalmente em: {new Date(validationResult.exportedAt).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                            </div>

                            {/* Mode Selection */}
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                Como deseja aplicar?
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setImportMode("merge")}
                                  className={`p-2 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                                    importMode === "merge"
                                      ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  Mesclar (Recomendado)
                                  <span className="block text-[9px] font-normal opacity-80">
                                    Preserva seus dados atuais
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setImportMode("replace")}
                                  className={`p-2 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                                    importMode === "replace"
                                      ? "bg-red-600 text-white border-red-600 shadow-2xs"
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  Substituir Tudo
                                  <span className="block text-[9px] font-normal opacity-80">
                                    Sobrescreve histórico local
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Confirm Action Button */}
                            <button
                              type="button"
                              onClick={handleConfirmImport}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              Concluir e Aplicar Backup
                            </button>
                          </>
                        ) : (
                          <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block">Arquivo Inválido:</strong>
                              <span>{validationResult.error}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CLOUD SYNC */}
              {backupActiveTab === "cloud" && (
                <div className="space-y-4">
                  {cloudUser ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                            Conta Conectada ao Firebase
                          </span>
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                            Conectado como <strong>{cloudUser.email}</strong>. Suas faturas e diagnósticos sincronizam de forma contínua e segura.
                          </p>
                        </div>
                      </div>

                      {cloudSyncSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          {cloudSyncSuccess}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleCloudSync}
                        disabled={syncingCloud}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingCloud ? "animate-spin" : ""}`} />
                        {syncingCloud ? "Sincronizando..." : "Sincronizar Nuvem Agora"}
                      </button>

                      {onOpenAuth && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsBackupModalOpen(false);
                            onOpenAuth();
                          }}
                          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Gerenciar Detalhes da Conta
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-amber-600" />
                          Backup Automático e Perpétuo na Nuvem
                        </span>
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                          Conectando sua conta Google ou cadastrando seu e-mail, suas contas de luz escaneadas e diagnósticos são salvos automaticamente no Google Cloud / Firestore:
                        </p>
                        <ul className="text-[11px] text-amber-900 dark:text-amber-200 space-y-1 list-disc pl-4">
                          <li>Não perde dados se limpar o cache ou formatar o aparelho</li>
                          <li>Acesso contínuo no celular, tablet ou computador</li>
                          <li>100% gratuito e opcional</li>
                        </ul>
                      </div>

                      {onOpenAuth && (
                        <button
                          type="button"
                          id="btn-login-from-backup-modal"
                          onClick={() => {
                            setIsBackupModalOpen(false);
                            onOpenAuth();
                          }}
                          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Cloud className="w-4 h-4" />
                          Conectar Conta / Fazer Login Grátis
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discrete ad banner placeholder */}
      <AdSlot placement="history-footer" />
    </div>
  );
};

export const HistoryView = React.memo(HistoryViewComponent);

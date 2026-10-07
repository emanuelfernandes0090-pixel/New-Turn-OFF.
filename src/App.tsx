import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Header } from "./components/Header";
import { HomeDashboard } from "./components/HomeDashboard";
import { BillScanner } from "./components/BillScanner";
import { DiagnosisWizard } from "./components/DiagnosisWizard";
import { WhatIfSimulator } from "./components/WhatIfSimulator";
import { TarifaSocialGuide } from "./components/TarifaSocialGuide";
import { SafetyGuide } from "./components/SafetyGuide";
import { LearningGuide } from "./components/LearningGuide";
import { EquipmentPaybackSimulator } from "./components/EquipmentPaybackSimulator";
import { HistoryView } from "./components/HistoryView";
import { AccessibilityModal } from "./components/AccessibilityModal";
import { BottomNav } from "./components/BottomNav";
import { OnboardingModal } from "./components/OnboardingModal";
import { AdBanner } from "./components/AdBanner";
import { ShareModal, SharePayload } from "./components/ShareModal";
import { AIAssistantChat } from "./components/AIAssistantChat";
import { AuthModal } from "./components/AuthModal";
import {
  AppTab,
  AccessibilitySettings,
  SavedDiagnosis,
  BillScanRecord,
  ExtractedBill,
} from "./types";
import {
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  loadDiagnoses,
  saveDiagnoses,
  loadBillScans,
  saveBillScans,
  saveBillScan,
  loadPlanProgress,
} from "./lib/storage";
import { CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "./lib/useNetworkStatus";
import { NetworkStatusNotifier } from "./components/NetworkStatusNotifier";
import { syncToCloud, markPendingSync } from "./lib/sync/firebaseSync";

export default function App() {
  // Network Status Manager (Offline / Reconnected sync)
  const networkStatus = useNetworkStatus();

  // Navigation
  const [activeTab, setActiveTab] = useState<AppTab>("home");

  // Persistent storage states with lazy initializers
  const [settings, setSettings] = useState<AccessibilitySettings>(() =>
    loadAccessibilitySettings(),
  );
  const [diagnoses, setDiagnoses] = useState<SavedDiagnosis[]>(() =>
    loadDiagnoses(),
  );
  const [billScans, setBillScans] = useState<BillScanRecord[]>(() =>
    loadBillScans(),
  );
  const [planProgress, setPlanProgress] = useState<string[]>(() =>
    loadPlanProgress(),
  );

  // Cross-view state passings
  const [selectedBillForDiagnosis, setSelectedBillForDiagnosis] =
    useState<BillScanRecord | null>(null);
  const [selectedBillForScanner, setSelectedBillForScanner] =
    useState<BillScanRecord | null>(null);
  const [selectedDiagnosisForWizard, setSelectedDiagnosisForWizard] =
    useState<SavedDiagnosis | null>(null);
  const [activeSimulatorBaseline, setActiveSimulatorBaseline] =
    useState<SavedDiagnosis | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Modal and dialog states
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("turnoff:first_visit_tutorial_seen");
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [selectedDiagnosisForShare, setSelectedDiagnosisForShare] =
    useState<SavedDiagnosis | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Timer ref to avoid racing timeouts on toasts
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 4000);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Navigation handlers with stable identity
  const handleSelectTab = useCallback((tab: AppTab) => {
    setIsFocusMode(false);
    setActiveTab(tab);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem("turnoff:first_visit_tutorial_seen", "true");
    } catch {
      // ignore
    }
  }, []);

  const handleOpenOnboarding = useCallback(() => {
    setIsOnboardingOpen(true);
  }, []);

  const handleOpenAccessibility = useCallback(() => {
    setIsAccessModalOpen(true);
  }, []);

  const handleCloseAccessibility = useCallback(() => {
    setIsAccessModalOpen(false);
  }, []);

  const handleSaveSettings = useCallback((newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    saveAccessibilitySettings(newSettings);
  }, []);

  const handleOpenAIChat = useCallback(() => {
    setIsAIChatOpen(true);
  }, []);

  const handleCloseAIChat = useCallback(() => {
    setIsAIChatOpen(false);
  }, []);

  const handleOpenAuth = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleOpenShareApp = useCallback(() => {
    setSharePayload({ type: "app" });
    setIsShareModalOpen(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setIsShareModalOpen(false);
    setSharePayload(null);
    document.body.style.pointerEvents = "";
    document.documentElement.style.pointerEvents = "";
    if (typeof window !== "undefined") {
      window.focus();
    }
  }, []);

  // Sync settings with document classes and CSS custom variables
  useEffect(() => {
    const root = document.documentElement;

    // Theme (dark mode is default)
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Dynamic Font Scaling (Default: 85%)
    const scale = settings.fontScale ?? 0.85;
    root.style.setProperty("--app-font-scale", `${Math.round(scale * 100)}%`);

    // High Contrast Mode (WCAG AAA)
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Reduced Motion
    if (settings.reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // Dyslexic / High Readability Font
    if (settings.dyslexicFont) {
      root.classList.add("dyslexic-font");
    } else {
      root.classList.remove("dyslexic-font");
    }

    // Enhanced Line & Letter Spacing
    if (settings.enhancedSpacing) {
      root.classList.add("enhanced-spacing");
    } else {
      root.classList.remove("enhanced-spacing");
    }

    // Large Focus Ring for Keyboard navigation
    if (settings.largeFocusRing) {
      root.classList.add("large-focus-ring");
    } else {
      root.classList.remove("large-focus-ring");
    }

    saveAccessibilitySettings(settings);
  }, [settings]);

  // Robust theme toggler using functional update to avoid unnecessary re-renders
  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextTheme: "light" | "dark" =
        prev.theme === "dark" ? "light" : "dark";
      const updated: AccessibilitySettings = {
        ...prev,
        theme: nextTheme,
      };
      saveAccessibilitySettings(updated);
      showToast(
        nextTheme === "dark" ? "Modo escuro ativado." : "Modo claro ativado.",
      );
      return updated;
    });
  }, [showToast]);

  // Save diagnosis with functional state update (stabilizes handler identity)
  const handleSaveDiagnosis = useCallback(
    (newDiagnosis: SavedDiagnosis) => {
      setDiagnoses((prev) => {
        const updated = [
          newDiagnosis,
          ...prev.filter((d) => d.id !== newDiagnosis.id),
        ];
        saveDiagnoses(updated);
        return updated;
      });

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        markPendingSync();
        showToast("Diagnóstico salvo localmente (Modo Offline)!");
      } else {
        syncToCloud().catch(() => markPendingSync());
        showToast("Diagnóstico registrado e salvo no histórico com sucesso!");
      }
    },
    [showToast],
  );

  // Delete diagnosis
  const handleDeleteDiagnosis = useCallback(
    (id: string) => {
      setDiagnoses((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        saveDiagnoses(updated);
        return updated;
      });

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        markPendingSync();
      } else {
        syncToCloud().catch(() => markPendingSync());
      }
      showToast("Diagnóstico removido.");
    },
    [showToast],
  );

  // Save bill scans
  const handleSaveBill = useCallback(
    (bill: ExtractedBill) => {
      saveBillScan(bill);
      setBillScans(loadBillScans());
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        markPendingSync();
        showToast("Fatura salva localmente no histórico (Modo Offline)!");
      } else {
        syncToCloud().catch(() => markPendingSync());
        showToast("Fatura salva no histórico com sucesso!");
      }
    },
    [showToast],
  );

  // Delete bill
  const handleDeleteBill = useCallback(
    (id: string) => {
      setBillScans((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        saveBillScans(updated);
        return updated;
      });

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        markPendingSync();
      } else {
        syncToCloud().catch(() => markPendingSync());
      }
      showToast("Fatura removida.");
    },
    [showToast],
  );

  // Clear all data
  const handleClearAllData = useCallback(() => {
    setDiagnoses([]);
    setBillScans([]);
    saveDiagnoses([]);
    saveBillScans([]);
    showToast("Todos os dados salvos foram apagados.");
  }, [showToast]);

  // Refresh from imported file
  const handleDataImported = useCallback(() => {
    setDiagnoses(loadDiagnoses());
    setBillScans(loadBillScans());
    setSettings(loadAccessibilitySettings());
    showToast("Backup importado com sucesso!");
  }, [showToast]);

  // Action from Scanner -> Open in Diagnosis Wizard
  const handleUseBillInDiagnosis = useCallback(
    (bill: ExtractedBill) => {
      const record = saveBillScan(bill);
      setBillScans(loadBillScans());
      setSelectedBillForDiagnosis(record);
      setActiveTab("diagnosis");
      showToast("Dados da fatura carregados no assistente de diagnóstico.");
    },
    [showToast],
  );

  // Action from Diagnosis -> Open in What-If Simulator
  const handleOpenSimulator = useCallback((diagnosis: SavedDiagnosis) => {
    setActiveSimulatorBaseline(diagnosis);
    setActiveTab("simulator");
  }, []);

  // Action from History -> Open diagnosis
  const handleSelectDiagnosisFromHistory = useCallback(
    (diag: SavedDiagnosis) => {
      setSelectedDiagnosisForWizard(diag);
      setActiveSimulatorBaseline(diag);
      if (diag.kind === "teste") {
        setActiveTab("simulator");
        showToast("Simulação carregada no Simulador.");
      } else {
        setActiveTab("diagnosis");
        showToast("Diagnóstico aberto com equipamentos, medidas e totais.");
      }
    },
    [showToast],
  );

  // Action from History -> Open bill
  const handleSelectBillFromHistory = useCallback(
    (billRecord: BillScanRecord) => {
      setSelectedBillForScanner(billRecord);
      setActiveTab("scanner");
      showToast("Fatura aberta no Leitor de Contas.");
    },
    [showToast],
  );

  const handleExitDiagnosis = useCallback(() => {
    setIsFocusMode(false);
    setSelectedDiagnosisForWizard(null);
    setActiveTab("home");
  }, []);

  const handleShareBill = useCallback((bill: ExtractedBill) => {
    setSharePayload({
      type: "bill",
      bill,
    });
    setIsShareModalOpen(true);
  }, []);

  const handleShareDiagnosis = useCallback((diag: SavedDiagnosis) => {
    setSharePayload({
      type: "diagnosis",
      diagnosis: diag,
    });
    setIsShareModalOpen(true);
  }, []);

  const handleShareSimulation = useCallback((payload: SharePayload) => {
    setSharePayload(payload);
    setIsShareModalOpen(true);
  }, []);

  const handleSharePayback = useCallback((payload: any) => {
    setSharePayload({
      type: "payback",
      equipmentName: payload.equipmentName,
      investmentCost: payload.investmentBrl,
      monthlySavings: payload.monthlySavingsBrl,
      annualSavings: payload.annualSavingsBrl,
      paybackMonths: payload.paybackMonths,
      return5Years: payload.monthlySavingsBrl * 60 - payload.investmentBrl,
      viable: payload.viable,
    });
    setIsShareModalOpen(true);
  }, []);

  // Memoize default simulator baseline computation
  const defaultSimulatorBaseline = useMemo(() => {
    return (
      activeSimulatorBaseline ||
      diagnoses.find((d) => d.kind !== "teste") ||
      diagnoses[0] ||
      null
    );
  }, [activeSimulatorBaseline, diagnoses]);

  const handleOpenShareFromHistory = useCallback(
    (diag?: SavedDiagnosis | null) => {
      const target = diag || defaultSimulatorBaseline;
      if (target) {
        setSharePayload({ type: "diagnosis", diagnosis: target });
      } else {
        setSharePayload({ type: "app" });
      }
      setSelectedDiagnosisForShare(target);
      setIsShareModalOpen(true);
    },
    [defaultSimulatorBaseline],
  );

  // Memoized navigation counts for BottomNav to avoid unnecessary re-renders
  const savedDiagnosisCount = diagnoses.length;
  const savedBillsCount = billScans.length;

  // Memoize main content to prevent heavy view re-renders on toast or modal toggle
  const mainContent = useMemo(() => {
    switch (activeTab) {
      case "home":
        return (
          <HomeDashboard
            diagnoses={diagnoses}
            billScans={billScans}
            completedActions={planProgress}
            onNavigate={handleSelectTab}
            onOpenTutorial={handleOpenOnboarding}
            settings={settings}
          />
        );

      case "scanner":
        return (
          <BillScanner
            initialBillRecord={selectedBillForScanner}
            onSaveBill={handleSaveBill}
            onUseInDiagnosis={handleUseBillInDiagnosis}
            onShareBill={handleShareBill}
            settings={settings}
          />
        );

      case "diagnosis":
        return (
          <DiagnosisWizard
            onSaveDiagnosis={handleSaveDiagnosis}
            onOpenSimulator={handleOpenSimulator}
            onExit={handleExitDiagnosis}
            billScans={billScans}
            initialBillScan={selectedBillForDiagnosis}
            initialSavedDiagnosis={selectedDiagnosisForWizard}
            settings={settings}
            onFocusModeChange={setIsFocusMode}
            onShareDiagnosis={handleShareDiagnosis}
          />
        );

      case "simulator":
        return (
          <WhatIfSimulator
            savedDiagnosis={defaultSimulatorBaseline}
            savedDiagnoses={diagnoses}
            billScans={billScans}
            onSaveSimulation={handleSaveDiagnosis}
            onShareSimulation={handleShareSimulation}
            onNavigateToDiagnosis={() => handleSelectTab("diagnosis")}
            onNavigateToScanner={() => handleSelectTab("scanner")}
          />
        );

      case "payback":
        return (
          <EquipmentPaybackSimulator
            settings={settings}
            diagnoses={diagnoses}
            billScans={billScans}
            onSharePayback={handleSharePayback}
          />
        );

      case "safety":
        return <SafetyGuide settings={settings} />;

      case "learn":
        return (
          <LearningGuide
            settings={settings}
            diagnoses={diagnoses}
            billScans={billScans}
          />
        );

      case "tarifa-social":
        return (
          <TarifaSocialGuide
            settings={settings}
            diagnoses={diagnoses}
            billScans={billScans}
            onNavigateToTab={handleSelectTab}
          />
        );

      case "history":
        return (
          <HistoryView
            diagnoses={diagnoses}
            billScans={billScans}
            onSelectDiagnosis={handleSelectDiagnosisFromHistory}
            onSelectBill={handleSelectBillFromHistory}
            onDeleteDiagnosis={handleDeleteDiagnosis}
            onDeleteBill={handleDeleteBill}
            onClearAll={handleClearAllData}
            onDataImported={handleDataImported}
            onOpenShare={handleOpenShareFromHistory}
            onOpenSimulator={handleOpenSimulator}
            onOpenAuth={handleOpenAuth}
            onNavigateToTab={handleSelectTab}
            settings={settings}
          />
        );

      default:
        return null;
    }
  }, [
    activeTab,
    diagnoses,
    billScans,
    planProgress,
    settings,
    selectedBillForDiagnosis,
    selectedBillForScanner,
    defaultSimulatorBaseline,
    handleSelectTab,
    handleOpenOnboarding,
    handleSaveBill,
    handleUseBillInDiagnosis,
    handleShareBill,
    handleSaveDiagnosis,
    handleOpenSimulator,
    handleExitDiagnosis,
    handleShareDiagnosis,
    handleShareSimulation,
    handleSharePayback,
    handleSelectDiagnosisFromHistory,
    handleSelectBillFromHistory,
    handleDeleteDiagnosis,
    handleDeleteBill,
    handleClearAllData,
    handleDataImported,
    handleOpenShareFromHistory,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020817] text-slate-900 dark:text-slate-100 flex flex-col font-['Inter',sans-serif] selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Skip to Content for Keyboard and Screen Reader Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Pular para o conteúdo principal
      </a>

      {/* Subtle Network Status Banner (Offline / Reconnected Sync) */}
      <NetworkStatusNotifier status={networkStatus} />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-emerald-700 text-white shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in slide-in-from-top-4 duration-300"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header (Memoized) */}
      <Header
        activeTab={activeTab}
        currentTab={activeTab}
        onSelectTab={handleSelectTab}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        onOpenAccessibility={handleOpenAccessibility}
        onOpenTutorial={handleOpenOnboarding}
        onOpenAIChat={handleOpenAIChat}
        onOpenShare={handleOpenShareApp}
        onOpenAuth={handleOpenAuth}
        settings={settings}
      />

      {/* Main Content Area with bottom padding for fixed BottomNav */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 focus:outline-hidden"
      >
        {mainContent}
      </main>

      {/* Fixed Bottom Navigation (Memoized) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isFocusMode={isFocusMode}
        savedDiagnosisCount={savedDiagnosisCount}
        savedBillsCount={savedBillsCount}
      />

      {/* Guided Tutorial Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onNavigateToTab={handleSelectTab}
        onOpenAccessibility={() => setIsAccessModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenAIChat={() => setIsAIChatOpen(true)}
      />

      {/* Share and PDF Export Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleCloseShare}
        payload={sharePayload}
        latestDiagnosis={selectedDiagnosisForShare || defaultSimulatorBaseline}
      />

      {/* Accessibility Preferences Modal */}
      <AccessibilityModal
        isOpen={isAccessModalOpen}
        onClose={handleCloseAccessibility}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearData={handleClearAllData}
        onOpenTutorial={handleOpenOnboarding}
      />

      {/* Authentication Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuth} />

      {/* Interactive Explanatory AI Assistant */}
      <AIAssistantChat
        settings={settings}
        currentTab={activeTab}
        onNavigateTab={handleSelectTab}
        isOpen={isAIChatOpen}
        onToggleOpen={setIsAIChatOpen}
        onClose={handleCloseAIChat}
        latestDiagnosis={defaultSimulatorBaseline}
        latestBill={billScans[0]?.bill || null}
      />

      {/* Espaço reservado para Publicidade não intrusiva */}
      <AdBanner />

      {/* Footer Simplified & Clean */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 mb-16 sm:mb-16 pb-24 sm:pb-24 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-0.5 text-center sm:text-left">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Turn OFF — Eficiência Energética Residencial
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Projeto do GT-02 · EEEP Dom Walfrido Teixeira Vieira
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => handleSelectTab("learn")}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition underline cursor-pointer"
            >
              Normas Técnicas e Metodologia
            </button>
            <button
              onClick={handleOpenAccessibility}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition underline cursor-pointer"
            >
              Acessibilidade
            </button>
            <a
              href="https://forms.gle/yFHNmcvSwQfGbJdv5"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 font-bold transition underline"
              title="Ouvidoria: dê opiniões, sugestões, pedidos ou reclamações"
            >
              Ouvidoria & Sugestões
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

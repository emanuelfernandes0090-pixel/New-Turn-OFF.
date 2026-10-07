import React, { useState, useMemo, useEffect } from "react";
import {
  Share2,
  Sliders,
  Check,
  Info,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Search,
  CheckCircle2,
  Lightbulb,
  Sun,
  Zap,
  RotateCcw,
  Save,
  Sparkles,
  Droplets,
  Thermometer,
  Flame,
  Tv,
  Wind,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Layers,
  Award,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  ApplianceInput,
  BillScanRecord,
  SavedDiagnosis
} from "../types";
import {
  calculateDiagnosis,
  formatBRL,
  formatNumber,
  applianceCatalog,
  APPLIANCE_HABITS_CATALOG,
  calculateHabitsEconomy,
  applyHabitsToAppliances
} from "../lib/energy";

export interface WhatIfSimulatorProps {
  onShareSimulation?: (payload: any) => void;
  onSaveSimulation?: (newDiag: SavedDiagnosis) => void;
  savedDiagnosis?: SavedDiagnosis | null;
  savedDiagnoses?: SavedDiagnosis[];
  billScans?: BillScanRecord[];
  baseAppliances?: ApplianceInput[];
  baseMonthlyKwh?: number;
  baseMonthlyBrl?: number;
  onNavigateToDiagnosis?: () => void;
  onNavigateToScanner?: () => void;
}

/**
 * Extrai estritamente os aparelhos selecionados como presentes durante o diagnóstico residencial.
 * Remove quaisquer aparelhos não marcados pelo usuário (present: false).
 */
export function extractSelectedAppliancesFromDiagnosis(diagnosis: SavedDiagnosis): ApplianceInput[] {
  const rawAppliances = diagnosis.input?.appliances || [];

  // 1. Prioridade máxima: cruzar com diagnosis.result.estimates (onde estão os aparelhos efetivamente calculados)
  const calculatedKeys = new Set(
    (diagnosis.result?.estimates || []).map((e) => e.key || e.id)
  );

  if (calculatedKeys.size > 0) {
    const matched = rawAppliances.filter(
      (a) => (calculatedKeys.has(a.key) || calculatedKeys.has(a.id)) && a.present !== false
    );
    if (matched.length > 0) return matched;
  }

  // 2. Segunda prioridade: filtrar por a.present === true explícito
  const explicitlyPresent = rawAppliances.filter(
    (a) => a.present === true && (a.quantity === undefined || a.quantity > 0)
  );
  if (explicitlyPresent.length > 0) return explicitlyPresent;

  // 3. Fallback: descartar qualquer aparelho que tenha present === false
  return rawAppliances.filter((a) => a.present !== false);
}

type TabType = "habits" | "flags" | "solar-social";

interface TariffFlagInfo {
  key: string;
  name: string;
  extraPer100Kwh: number; // in R$
  colorClass: string;
  badgeClass: string;
  desc: string;
}

const TARIFF_FLAGS: Record<string, TariffFlagInfo> = {
  verde: {
    key: "verde",
    name: "Bandeira Verde",
    extraPer100Kwh: 0,
    colorClass: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300",
    badgeClass: "bg-emerald-500 text-white",
    desc: "Condições hídricas favoráveis de geração. Nenhum acréscimo cobrado na tarifa de energia."
  },
  amarela: {
    key: "amarela",
    name: "Bandeira Amarela",
    extraPer100Kwh: 1.885,
    colorClass: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300",
    badgeClass: "bg-yellow-500 text-slate-900",
    desc: "Condições de geração menos favoráveis. Acréscimo de R$ 1,885 a cada 100 kWh consumidos."
  },
  vermelha1: {
    key: "vermelha1",
    name: "Bandeira Vermelha Patamar 1",
    extraPer100Kwh: 4.463,
    colorClass: "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300",
    badgeClass: "bg-orange-500 text-white",
    desc: "Condições mais custosas de geração com termelétricas a gás. Acréscimo de R$ 4,463 a cada 100 kWh."
  },
  vermelha2: {
    key: "vermelha2",
    name: "Bandeira Vermelha Patamar 2",
    extraPer100Kwh: 7.877,
    colorClass: "border-rose-600 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300",
    badgeClass: "bg-rose-600 text-white",
    desc: "Seca e condições severas nos reservatórios. Acréscimo de R$ 7,877 a cada 100 kWh consumidos."
  },
  escassez: {
    key: "escassez",
    name: "Escassez Hídrica (Cenário de Crise)",
    extraPer100Kwh: 14.200,
    colorClass: "border-red-800 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-300",
    badgeClass: "bg-red-800 text-white",
    desc: "Cenário emergencial de seca histórica extrema. Acréscimo regulatório de R$ 14,20 a cada 100 kWh."
  }
};

// Standard Brazilian Household Profiles
const DEFAULT_PROFILES: {
  id: string;
  name: string;
  subtitle: string;
  monthlyKwh: number;
  billValue: number;
  occupants: number;
  appliances: ApplianceInput[];
}[] = [
  {
    id: "familia-media",
    name: "Família Média Brasileira (Padrão ANEEL)",
    subtitle: "3 a 4 moradores · Chuveiro 5.500W, Geladeira Frost-Free, TV, Lavadora e AC",
    monthlyKwh: 200,
    billValue: 176,
    occupants: 3,
    appliances: [
      {
        id: "app-chuveiro",
        key: "chuveiro",
        label: "Chuveiro Elétrico",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 0.8, // 4 banhos de 12 min
        powerWatts: 5500,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-geladeira",
        key: "geladeira",
        label: "Geladeira Duplex Frost-Free",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 24,
        powerWatts: 150,
        source: "estimativa",
        utilizationFactor: 0.40
      },
      {
        id: "app-ac",
        key: "ar-condicionado",
        label: "Ar-Condicionado 9.000 BTU",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 24,
        hoursPerDay: 4.0,
        powerWatts: 1100,
        source: "estimativa",
        utilizationFactor: 0.65
      },
      {
        id: "app-tv",
        key: "televisao",
        label: "Smart TV 50 polegadas",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 6.0,
        powerWatts: 120,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-lavadora",
        key: "lavadora",
        label: "Máquina de Lavar Roupa (11kg)",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 8,
        hoursPerDay: 1.2,
        powerWatts: 500,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-ferro",
        key: "ferro",
        label: "Ferro Elétrico a Vapor",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 4,
        hoursPerDay: 1.5,
        powerWatts: 1200,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-iluminacao",
        key: "iluminacao",
        label: "Iluminação Geral da Casa",
        present: true,
        quantity: 10,
        quantityUsed: 8,
        frequency: 30,
        hoursPerDay: 5.0,
        powerWatts: 120,
        source: "estimativa",
        utilizationFactor: 1.0,
        lightingRooms: [
          {
            id: "room-1",
            name: "Sala e Cozinha",
            frequency: 30,
            hoursPerDay: 5,
            lamps: { led: 4, fluorescente: 2, incandescente: 0 }
          },
          {
            id: "room-2",
            name: "Quartos e Banheiro",
            frequency: 30,
            hoursPerDay: 3,
            lamps: { led: 3, fluorescente: 1, incandescente: 1 }
          }
        ]
      },
      {
        id: "app-microondas",
        key: "microondas",
        label: "Forno Micro-ondas",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 0.3,
        powerWatts: 1200,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-ventilador",
        key: "ventilador",
        label: "Ventilador de Mesa",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 25,
        hoursPerDay: 6.0,
        powerWatts: 80,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-computador",
        key: "computador",
        label: "Computador / Home Office",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 22,
        hoursPerDay: 4.0,
        powerWatts: 150,
        source: "estimativa",
        utilizationFactor: 1.0
      }
    ]
  },
  {
    id: "casal-economico",
    name: "Apartamento Compacto / Casal Econômico",
    subtitle: "1 a 2 pessoas · Baixo consumo, iluminação LED e hábitos conscientes",
    monthlyKwh: 120,
    billValue: 105,
    occupants: 2,
    appliances: [
      {
        id: "app-chuveiro-c",
        key: "chuveiro",
        label: "Chuveiro Elétrico",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 0.4, // 2 banhos de 12 min
        powerWatts: 5500,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-geladeira-c",
        key: "geladeira",
        label: "Geladeira 1 Porta",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 24,
        powerWatts: 120,
        source: "estimativa",
        utilizationFactor: 0.35
      },
      {
        id: "app-tv-c",
        key: "televisao",
        label: "Smart TV 43 polegadas",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 4.0,
        powerWatts: 90,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-lavadora-c",
        key: "lavadora",
        label: "Máquina de Lavar",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 4,
        hoursPerDay: 1.0,
        powerWatts: 450,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-iluminacao-c",
        key: "iluminacao",
        label: "Iluminação 100% LED",
        present: true,
        quantity: 6,
        quantityUsed: 5,
        frequency: 30,
        hoursPerDay: 4.0,
        powerWatts: 54,
        source: "estimativa",
        utilizationFactor: 1.0,
        lightingRooms: [
          {
            id: "room-c1",
            name: "Apartamento Completo",
            frequency: 30,
            hoursPerDay: 4,
            lamps: { led: 6, fluorescente: 0, incandescente: 0 }
          }
        ]
      },
      {
        id: "app-ventilador-c",
        key: "ventilador",
        label: "Ventilador de Teto",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 20,
        hoursPerDay: 5.0,
        powerWatts: 70,
        source: "estimativa",
        utilizationFactor: 1.0
      }
    ]
  },
  {
    id: "alto-consumo",
    name: "Residência com Climatização / Alto Consumo",
    subtitle: "4 a 5 pessoas · Múltiplos aparelhos de ar-condicionado, freezer e eletrônicos",
    monthlyKwh: 380,
    billValue: 342,
    occupants: 4,
    appliances: [
      {
        id: "app-chuveiro-a",
        key: "chuveiro",
        label: "Chuveiro Elétrico Turbo",
        present: true,
        quantity: 2,
        quantityUsed: 2,
        frequency: 30,
        hoursPerDay: 1.1,
        powerWatts: 6800,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-geladeira-a",
        key: "geladeira",
        label: "Refrigerador Side-by-Side",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 24,
        powerWatts: 190,
        source: "estimativa",
        utilizationFactor: 0.45
      },
      {
        id: "app-freezer-a",
        key: "freezer",
        label: "Freezer Horizontal",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 30,
        hoursPerDay: 24,
        powerWatts: 140,
        source: "estimativa",
        utilizationFactor: 0.45
      },
      {
        id: "app-ac-a",
        key: "ar-condicionado",
        label: "2x Ar-Condicionado (Quartos)",
        present: true,
        quantity: 2,
        quantityUsed: 2,
        frequency: 28,
        hoursPerDay: 7.0,
        powerWatts: 2200,
        source: "estimativa",
        utilizationFactor: 0.65
      },
      {
        id: "app-tv-a",
        key: "televisao",
        label: "TVs (Sala + Quartos)",
        present: true,
        quantity: 2,
        quantityUsed: 2,
        frequency: 30,
        hoursPerDay: 8.0,
        powerWatts: 220,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-airfryer-a",
        key: "air-fryer",
        label: "Fritadeira Air Fryer",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 20,
        hoursPerDay: 0.6,
        powerWatts: 1500,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-lavadora-a",
        key: "lavadora",
        label: "Lavadora + Secadora",
        present: true,
        quantity: 1,
        quantityUsed: 1,
        frequency: 12,
        hoursPerDay: 2.0,
        powerWatts: 1800,
        source: "estimativa",
        utilizationFactor: 1.0
      },
      {
        id: "app-iluminacao-a",
        key: "iluminacao",
        label: "Iluminação de Ambientes",
        present: true,
        quantity: 16,
        quantityUsed: 12,
        frequency: 30,
        hoursPerDay: 6.0,
        powerWatts: 200,
        source: "estimativa",
        utilizationFactor: 1.0,
        lightingRooms: [
          {
            id: "room-a1",
            name: "Salas e Cozinha",
            frequency: 30,
            hoursPerDay: 6,
            lamps: { led: 8, fluorescente: 4, incandescente: 0 }
          },
          {
            id: "room-a2",
            name: "Áreas Externas e Garagem",
            frequency: 30,
            hoursPerDay: 8,
            lamps: { led: 2, fluorescente: 2, incandescente: 2 }
          }
        ]
      }
    ]
  }
];

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  onShareSimulation,
  onSaveSimulation,
  savedDiagnosis,
  savedDiagnoses,
  billScans = [],
  baseAppliances: explicitBaseAppliances,
  baseMonthlyKwh: explicitBaseKwh,
  baseMonthlyBrl: explicitBaseBrl,
  onNavigateToDiagnosis,
  onNavigateToScanner
}) => {
  // Compile all available saved diagnoses for baseline selection
  const allDiagnoses = useMemo(() => {
    const list = [...(savedDiagnoses || [])];
    if (savedDiagnosis && !list.some((d) => d.id === savedDiagnosis.id)) {
      list.unshift(savedDiagnosis);
    }
    return list;
  }, [savedDiagnoses, savedDiagnosis]);

  // Determine baseline choices available
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(() => {
    if (savedDiagnosis) return `diag-${savedDiagnosis.id}`;
    if (allDiagnoses.length > 0) return `diag-${allDiagnoses[0].id}`;
    if (billScans.length > 0) return `bill-${billScans[0].id}`;
    return "diag-default";
  });

  // Keep selectedBaselineId synchronized when savedDiagnosis prop updates (e.g. from history or diagnosis wizard)
  useEffect(() => {
    if (savedDiagnosis) {
      setSelectedBaselineId(`diag-${savedDiagnosis.id}`);
    } else if (allDiagnoses.length > 0 && (!selectedBaselineId || selectedBaselineId === "diag-default")) {
      setSelectedBaselineId(`diag-${allDiagnoses[0].id}`);
    }
  }, [savedDiagnosis?.id, allDiagnoses.length]);

  // Current active baseline parameters
  const currentBaseline = useMemo(() => {
    // 1. Explicit props if passed directly
    if (explicitBaseAppliances && explicitBaseAppliances.length > 0) {
      const activeApps = explicitBaseAppliances.filter(
        (a) => a.present === true || (a.present !== false && (a.quantity === undefined || a.quantity > 0))
      );
      return {
        label: "Diagnóstico Residencial Ativo",
        sourceType: "diagnosis" as const,
        appliances: activeApps.length > 0 ? activeApps : explicitBaseAppliances,
        monthlyKwh: explicitBaseKwh || 200,
        billValue: explicitBaseBrl || 176,
        occupants: savedDiagnosis?.input?.occupants || 3
      };
    }

    // 2. User's saved diagnosis (either by specific diag- id or legacy user-diagnosis)
    const isDiagSelection = selectedBaselineId.startsWith("diag-") || selectedBaselineId === "user-diagnosis";
    if (isDiagSelection && allDiagnoses.length > 0) {
      const diagId = selectedBaselineId.replace("diag-", "");
      const foundDiag = allDiagnoses.find((d) => d.id === diagId) || savedDiagnosis || allDiagnoses[0];
      if (foundDiag) {
        const activeApps = extractSelectedAppliancesFromDiagnosis(foundDiag);
        const dateStr = foundDiag.createdAt ? new Date(foundDiag.createdAt).toLocaleDateString("pt-BR") : "";
        const label = dateStr ? `Diagnóstico Residencial (${dateStr})` : "Diagnóstico Residencial";
        return {
          label,
          sourceType: "diagnosis" as const,
          appliances: activeApps,
          monthlyKwh: foundDiag.result?.totalEstimated || foundDiag.input?.monthlyKwh || 200,
          billValue: foundDiag.input?.billValue || 176,
          occupants: foundDiag.input?.occupants || 3
        };
      }
    }

    // 3. Scanned bill from history
    if (selectedBaselineId.startsWith("bill-")) {
      const billId = selectedBaselineId.replace("bill-", "");
      const foundBill = billScans.find((b) => b.id === billId);
      if (foundBill) {
        const kwh = foundBill.bill.consumo_kwh || 200;
        const val = foundBill.bill.valor_total || 176;
        const scaledAppliances = JSON.parse(
          JSON.stringify(DEFAULT_PROFILES[0].appliances)
        ) as ApplianceInput[];
        return {
          label: `Fatura ${foundBill.bill.mes_referencia || "Escaneada"}`,
          sourceType: "bill" as const,
          appliances: scaledAppliances,
          monthlyKwh: kwh,
          billValue: val,
          occupants: 3
        };
      }
    }

    // 4. Fallback baseline if no diagnosis registered yet
    const fallbackProfile = DEFAULT_PROFILES[0];
    return {
      label: "Diagnóstico Residencial Base",
      sourceType: "profile" as const,
      appliances: JSON.parse(JSON.stringify(fallbackProfile.appliances)) as ApplianceInput[],
      monthlyKwh: fallbackProfile.monthlyKwh,
      billValue: fallbackProfile.billValue,
      occupants: fallbackProfile.occupants
    };
  }, [
    selectedBaselineId,
    allDiagnoses,
    savedDiagnosis,
    billScans,
    explicitBaseAppliances,
    explicitBaseKwh,
    explicitBaseBrl
  ]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("habits");

  // State for active preset IDs
  const [activePresets, setActivePresets] = useState<Record<string, boolean>>({});

  // Sliders for fine-tuning top energy consumers
  const [showerMinutes, setShowerMinutes] = useState<number>(12);
  const [acDailyHours, setAcDailyHours] = useState<number>(4);
  const [acTemperature, setAcTemperature] = useState<number>(23);
  const [tvDailyHours, setTvDailyHours] = useState<number>(5);

  // ANEEL Tariff Flag Simulation
  const [currentFlagKey, setCurrentFlagKey] = useState<string>("verde");
  const [simulatedFlagKey, setSimulatedFlagKey] = useState<string>("verde");

  // Social Tariff & Solar Generation
  const [tarifaSocialActive, setTarifaSocialActive] = useState<boolean>(false);
  const [solarOffsetPercent, setSolarOffsetPercent] = useState<number>(0); // 0%, 50%, 75%, 90%, 95%
  const [globalSavingsGoal, setGlobalSavingsGoal] = useState<number>(0); // 0%, 10%, 20%, 30%

  // Search in Habits
  const [searchQuery, setSearchQuery] = useState("");
  // Retractable accordion state for appliances (closed by default)
  const [openAppliancePanels, setOpenAppliancePanels] = useState<Record<string, boolean>>({});
  const [explanatoryTopic, setExplanatoryTopic] = useState<{
    title: string;
    physics: string;
    tip: string;
  } | null>(null);

  // Toast confirmation for saved simulation
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Reset modifiers when baseline changes and synchronize sliders with present appliances
  useEffect(() => {
    setActivePresets({});
    setTarifaSocialActive(false);
    setSolarOffsetPercent(0);
    setGlobalSavingsGoal(0);
    setSimulatedFlagKey(currentFlagKey);

    // Initialize sliders from current baseline appliances if present
    const chuveiro = currentBaseline.appliances.find((a) => a.key === "chuveiro");
    if (chuveiro) {
      if (chuveiro.showerDetails?.mode === "detailed" && chuveiro.showerDetails.bathers?.length) {
        const avg = Math.round(
          chuveiro.showerDetails.bathers.reduce((s, b) => s + b.minutesPerBath, 0) /
          chuveiro.showerDetails.bathers.length
        );
        setShowerMinutes(Math.min(30, Math.max(4, avg || 12)));
      } else if (chuveiro.showerDetails?.averageMinutesPerBath) {
        setShowerMinutes(Math.min(30, Math.max(4, chuveiro.showerDetails.averageMinutesPerBath)));
      } else if (chuveiro.hoursPerDay) {
        const occ = currentBaseline.occupants || 3;
        const mins = Math.round((chuveiro.hoursPerDay * 60) / Math.max(1, occ));
        setShowerMinutes(Math.min(30, Math.max(4, mins || 12)));
      } else {
        setShowerMinutes(12);
      }
    } else {
      setShowerMinutes(12);
    }

    const ac = currentBaseline.appliances.find((a) => a.key === "ar-condicionado");
    if (ac && ac.hoursPerDay !== undefined) {
      setAcDailyHours(Math.min(14, Math.max(0, Math.round(ac.hoursPerDay))));
    } else {
      setAcDailyHours(4);
    }

    const tv = currentBaseline.appliances.find((a) => a.key === "televisao");
    if (tv && tv.hoursPerDay !== undefined) {
      setTvDailyHours(Math.min(14, Math.max(1, Math.round(tv.hoursPerDay))));
    } else {
      setTvDailyHours(5);
    }
  }, [selectedBaselineId, currentBaseline.appliances, currentBaseline.occupants]);

  // Baseline reference appliances and parameters to avoid double-action and false savings
  const baseShowerApp = useMemo(() => {
    return currentBaseline.appliances.find((a) => a.key === "chuveiro");
  }, [currentBaseline.appliances]);

  const baseShowerMinutes = useMemo(() => {
    if (!baseShowerApp) return 12;
    if (baseShowerApp.showerDetails?.mode === "detailed" && baseShowerApp.showerDetails.bathers?.length) {
      const avg = Math.round(
        baseShowerApp.showerDetails.bathers.reduce((s, b) => s + b.minutesPerBath, 0) /
        baseShowerApp.showerDetails.bathers.length
      );
      return Math.max(1, avg);
    }
    if (baseShowerApp.showerDetails?.averageMinutesPerBath) {
      return baseShowerApp.showerDetails.averageMinutesPerBath;
    }
    const occ = currentBaseline.occupants || 3;
    return Math.max(1, Math.round(((baseShowerApp.hoursPerDay || 0.6) * 60) / Math.max(1, occ)));
  }, [baseShowerApp, currentBaseline.occupants]);

  const baseAcApp = useMemo(() => {
    return currentBaseline.appliances.find((a) => a.key === "ar-condicionado");
  }, [currentBaseline.appliances]);

  const baseAcHours = useMemo(() => {
    return baseAcApp ? Math.round(baseAcApp.hoursPerDay * 10) / 10 : 4;
  }, [baseAcApp]);

  const baseTvApp = useMemo(() => {
    return currentBaseline.appliances.find((a) => a.key === "televisao");
  }, [currentBaseline.appliances]);

  const baseTvHours = useMemo(() => {
    return baseTvApp ? Math.round(baseTvApp.hoursPerDay * 10) / 10 : 5;
  }, [baseTvApp]);

  // Comprehensive Habit Presets Catalog linked strictly to the baseline diagnosis
  // Shows ONLY appliances present in the reference diagnosis, with 2 to 6 physics habits each.
  const presetDefinitions = useMemo(() => {
    const list: Array<{
      id: string;
      group: string;
      groupName: string;
      applianceKey: string;
      label: string;
      desc: string;
      physics: string;
      tip: string;
      direction: "reduce" | "increase";
      apply: (c: ApplianceInput[], base: ApplianceInput[], on: boolean) => void;
    }> = [];

    // Map keys present in current baseline
    const presentKeys = new Set(currentBaseline.appliances.map((a) => a.key));

    Object.entries(APPLIANCE_HABITS_CATALOG).forEach(([appKey, habits]) => {
      // Only include if appliance is present in the current baseline diagnosis
      if (!presentKeys.has(appKey as any)) return;

      const catDef = applianceCatalog.find((c) => c.key === appKey);
      const appName = catDef?.label || appKey;
      const groupName = appName;

      habits.forEach((h) => {
        list.push({
          id: h.id,
          group: appKey,
          groupName,
          applianceKey: appKey,
          label: h.label,
          desc: h.desc,
          physics: h.physics,
          tip: h.tip,
          direction: h.direction || "reduce",
          apply: (c: ApplianceInput[], base: ApplianceInput[], on: boolean) => {
            const targetApp = c.find((x) => x.key === appKey);
            const baseApp = base.find((x) => x.key === appKey);
            if (targetApp && baseApp) {
              h.apply(targetApp, baseApp, on);
            }
          }
        });
      });
    });

    return list;
  }, [currentBaseline.appliances]);

  // Grouped presets by appliance for retractable accordion panels
  const presetGroups = useMemo(() => {
    const groupsMap = new Map<string, {
      group: string;
      groupName: string;
      applianceKey: string;
      applianceInput?: ApplianceInput;
      catalogItem?: typeof applianceCatalog[0];
      items: typeof presetDefinitions;
    }>();

    // Preserve order of appliances in current baseline
    currentBaseline.appliances.forEach((app) => {
      const catDef = applianceCatalog.find((c) => c.key === app.key);
      const appName = catDef?.label || app.label || app.key;
      groupsMap.set(app.key, {
        group: app.key,
        groupName: appName,
        applianceKey: app.key,
        applianceInput: app,
        catalogItem: catDef,
        items: []
      });
    });

    // Populate habits for each group
    presetDefinitions.forEach((preset) => {
      if (groupsMap.has(preset.group)) {
        groupsMap.get(preset.group)!.items.push(preset);
      }
    });

    // Filter out groups with 0 habits if any
    return Array.from(groupsMap.values()).filter((g) => g.items.length > 0);
  }, [presetDefinitions, currentBaseline.appliances]);

  // Compute Simulated Appliances using the precision physics habit engine
  const simulatedAppliances = useMemo(() => {
    return applyHabitsToAppliances(
      currentBaseline.appliances,
      activePresets,
      {
        showerMinutes,
        acDailyHours,
        acTemperature,
        tvDailyHours
      },
      currentBaseline.occupants || 3
    );
  }, [
    currentBaseline,
    activePresets,
    showerMinutes,
    acDailyHours,
    acTemperature,
    tvDailyHours
  ]);

  // Base Diagnosis Calculation
  const baseResult = useMemo(() => {
    return calculateDiagnosis({
      monthlyKwh: currentBaseline.monthlyKwh,
      occupants: currentBaseline.occupants,
      appliances: currentBaseline.appliances,
      detailed: true,
      hasSafetyRisk: false,
      billValue: currentBaseline.billValue
    });
  }, [currentBaseline]);

  // Simulated Diagnosis Calculation
  const simulatedResult = useMemo(() => {
    return calculateDiagnosis({
      monthlyKwh: currentBaseline.monthlyKwh,
      occupants: currentBaseline.occupants,
      appliances: simulatedAppliances,
      detailed: true,
      hasSafetyRisk: false,
      billValue: currentBaseline.billValue
    });
  }, [currentBaseline, simulatedAppliances]);

  // Effective Base Tariff per kWh
  const effectiveBaseRate = useMemo(() => {
    if (currentBaseline.billValue > 0 && currentBaseline.monthlyKwh > 0) {
      return currentBaseline.billValue / currentBaseline.monthlyKwh;
    }
    return 0.88; // Brazilian standard average R$ 0,88/kWh
  }, [currentBaseline]);

  // Core Financial & Energy Metrics
  const simulationMetrics = useMemo(() => {
    const baseKwh = currentBaseline.monthlyKwh;
    const baseBrl = currentBaseline.billValue;

    // Direct appliance consumption difference
    const rawSimulatedKwh = simulatedResult.totalEstimated;
    const rawBaseKwh = Math.max(1, baseResult.totalEstimated);

    // Dynamic consumption ratio between simulated appliances and base appliances
    // Allows consumption to increase without capping if user raises hours or habits!
    const consumptionRatio = rawSimulatedKwh / rawBaseKwh;

    // Apply proportional adjustment to the baseline bill kWh
    let adjustedSimulatedKwh = Math.max(15, baseKwh * consumptionRatio);

    // Apply Global Goal if selected
    if (globalSavingsGoal > 0) {
      adjustedSimulatedKwh = Math.max(15, adjustedSimulatedKwh * (1 - globalSavingsGoal / 100));
    }

    // Solar Generation Offset
    let solarGeneratedKwh = 0;
    if (solarOffsetPercent > 0) {
      solarGeneratedKwh = adjustedSimulatedKwh * (solarOffsetPercent / 100);
      // Ensure regulatory minimum grid availability fee (monofásica: 30 kWh)
      const minGridAvailabilityKwh = 30;
      adjustedSimulatedKwh = Math.max(
        minGridAvailabilityKwh,
        adjustedSimulatedKwh - solarGeneratedKwh
      );
    }

    // ANEEL Tariff Flag Difference
    const currentFlagRate = (TARIFF_FLAGS[currentFlagKey]?.extraPer100Kwh || 0) / 100;
    const simulatedFlagRate = (TARIFF_FLAGS[simulatedFlagKey]?.extraPer100Kwh || 0) / 100;
    const flagRateDelta = simulatedFlagRate - currentFlagRate;
    const flagCostDiff = adjustedSimulatedKwh * flagRateDelta;

    // Calculate Simulated Bill Value
    let rawBillBrl = adjustedSimulatedKwh * effectiveBaseRate + flagCostDiff;

    // Tarifa Social (TSEE) Law 10.438 / 12.212 discounts
    let socialDiscountBrl = 0;
    if (tarifaSocialActive) {
      // 0 to 30 kWh: 65% off
      const f1Kwh = Math.min(30, adjustedSimulatedKwh);
      const f1Discount = f1Kwh * effectiveBaseRate * 0.65;

      // 31 to 100 kWh: 40% off
      const f2Kwh = Math.max(0, Math.min(70, adjustedSimulatedKwh - 30));
      const f2Discount = f2Kwh * effectiveBaseRate * 0.40;

      // 101 to 220 kWh: 10% off
      const f3Kwh = Math.max(0, Math.min(120, adjustedSimulatedKwh - 100));
      const f3Discount = f3Kwh * effectiveBaseRate * 0.10;

      socialDiscountBrl = f1Discount + f2Discount + f3Discount;
      rawBillBrl = Math.max(15, rawBillBrl - socialDiscountBrl);
    }

    const finalSimulatedKwh = Math.round(adjustedSimulatedKwh);
    const finalSimulatedBrl = Math.max(15, Math.round(rawBillBrl * 100) / 100);

    // Delta calculations:
    // monthlyBrlDelta: positive means savings (base > simulated), negative means increase (simulated > base)
    const monthlyBrlDelta = Math.round((baseBrl - finalSimulatedBrl) * 100) / 100;
    const monthlyKwhDelta = Math.round(baseKwh - finalSimulatedKwh);

    const isIncrease = monthlyBrlDelta < -0.05 || monthlyKwhDelta < 0;
    const isSavings = monthlyBrlDelta > 0.05;
    const isNeutral = !isIncrease && !isSavings;

    const absBrlDelta = Math.abs(monthlyBrlDelta);
    const absKwhDelta = Math.abs(monthlyKwhDelta);
    const annualBrlDelta = Math.round(absBrlDelta * 12 * 100) / 100;
    const percentDelta = baseBrl > 0 ? Math.round((absBrlDelta / baseBrl) * 100) : 0;

    return {
      baseKwh,
      baseBrl,
      finalSimulatedKwh,
      finalSimulatedBrl,
      monthlyBrlDelta,
      monthlyKwhDelta,
      absBrlDelta,
      absKwhDelta,
      annualBrlDelta,
      percentDelta,
      isIncrease,
      isSavings,
      isNeutral,
      solarGeneratedKwh: Math.round(solarGeneratedKwh),
      socialDiscountBrl: Math.round(socialDiscountBrl * 100) / 100,
      flagCostDiff: Math.round(flagCostDiff * 100) / 100
    };
  }, [
    currentBaseline,
    baseResult,
    simulatedResult,
    effectiveBaseRate,
    globalSavingsGoal,
    solarOffsetPercent,
    currentFlagKey,
    simulatedFlagKey,
    tarifaSocialActive
  ]);

  // Rank active actions by highest impact using the precision habit calculation engine
  const topRankedActions = useMemo(() => {
    const list: { id: string; label: string; groupName: string; estimatedSavings: number }[] = [];

    // Calculate individual isolated savings for each active habit preset using calculateHabitsEconomy
    Object.keys(activePresets).forEach((presetId) => {
      if (activePresets[presetId]) {
        const singleActive = { [presetId]: true };
        const eco = calculateHabitsEconomy({
          baseAppliances: currentBaseline.appliances,
          monthlyKwh: currentBaseline.monthlyKwh,
          billValue: currentBaseline.billValue,
          occupants: currentBaseline.occupants || 3,
          activeHabitIds: singleActive,
          effectiveTariffPerKwh: effectiveBaseRate,
          customSliders: undefined // Cálculo estritamente isolado sem poluição de sliders
        });

        const habitDef = presetDefinitions.find((p) => p.id === presetId);
        if (habitDef && Math.abs(eco.totalDeltaBrl) > 0) {
          list.push({
            id: presetId,
            label: habitDef.label,
            groupName: habitDef.groupName,
            estimatedSavings: Math.round(eco.totalDeltaBrl * 10) / 10
          });
        }
      }
    });

    // Slider actions only included if they strictly represent a reduction relative to the user's actual baseline
    if (baseShowerApp && showerMinutes < baseShowerMinutes) {
      const showerDeltaMinutes = baseShowerMinutes - showerMinutes;
      const occ = currentBaseline.occupants || 3;
      const bathsPerDay = baseShowerApp.showerDetails?.bathsPerDayPerPerson || 1;
      const showerPowerKw = (baseShowerApp.powerWatts || 5500) / 1000;
      const mult = baseShowerApp.showerDetails?.defaultSetting === "verao" ? 0.65 : 1.0;
      const monthlyKwhSaved = (showerDeltaMinutes / 60) * showerPowerKw * mult * occ * bathsPerDay * (baseShowerApp.frequency || 30);
      const brlSaved = Math.round(monthlyKwhSaved * effectiveBaseRate * 10) / 10;
      if (brlSaved > 0) {
        list.push({
          id: "slider-shower-time",
          label: `Banhos reduzidos de ${baseShowerMinutes} para ${showerMinutes} min`,
          groupName: "Chuveiro Elétrico",
          estimatedSavings: brlSaved
        });
      }
    }

    if (baseAcApp && acDailyHours < baseAcHours) {
      const acDeltaHours = baseAcHours - acDailyHours;
      const acPowerKw = (baseAcApp.powerWatts || 1100) / 1000;
      const duty = baseAcApp.utilizationFactor || 0.65;
      const monthlyKwhSaved = acDeltaHours * acPowerKw * duty * (baseAcApp.frequency || 24);
      const brlSaved = Math.round(monthlyKwhSaved * effectiveBaseRate * 10) / 10;
      if (brlSaved > 0) {
        list.push({
          id: "slider-ac-hours",
          label: `Ar-condicionado reduzido de ${baseAcHours}h para ${acDailyHours}h/dia`,
          groupName: "Ar-Condicionado",
          estimatedSavings: brlSaved
        });
      }
    }

    if (baseTvApp && tvDailyHours < baseTvHours) {
      const tvDeltaHours = baseTvHours - tvDailyHours;
      const tvPowerKw = (baseTvApp.powerWatts || 120) / 1000;
      const monthlyKwhSaved = tvDeltaHours * tvPowerKw * (baseTvApp.frequency || 30);
      const brlSaved = Math.round(monthlyKwhSaved * effectiveBaseRate * 10) / 10;
      if (brlSaved > 0) {
        list.push({
          id: "slider-tv-hours",
          label: `TV ligada reduzida de ${baseTvHours}h para ${tvDailyHours}h/dia`,
          groupName: "Televisão",
          estimatedSavings: brlSaved
        });
      }
    }

    if (solarOffsetPercent > 0) {
      list.push({
        id: "solar-gen",
        label: `Energia Solar Fotovoltaica (${solarOffsetPercent}% de abatimento)`,
        groupName: "Geração Própria",
        estimatedSavings: Math.round(simulationMetrics.solarGeneratedKwh * effectiveBaseRate)
      });
    }

    if (tarifaSocialActive) {
      list.push({
        id: "tarifa-social-item",
        label: "Desconto Progressivo da Tarifa Social (TSEE)",
        groupName: "Benefício Regulatório",
        estimatedSavings: simulationMetrics.socialDiscountBrl
      });
    }

    if (simulatedFlagKey !== currentFlagKey && simulationMetrics.flagCostDiff < 0) {
      list.push({
        id: "flag-relief",
        label: `Mudança de Bandeira para ${TARIFF_FLAGS[simulatedFlagKey].name}`,
        groupName: "Bandeira ANEEL",
        estimatedSavings: Math.abs(simulationMetrics.flagCostDiff)
      });
    }

    return list.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }, [
    activePresets,
    presetDefinitions,
    currentBaseline,
    effectiveBaseRate,
    acDailyHours,
    acTemperature,
    tvDailyHours,
    showerMinutes,
    solarOffsetPercent,
    simulationMetrics,
    tarifaSocialActive,
    simulatedFlagKey,
    currentFlagKey
  ]);

  // Toggle Preset
  const handleTogglePreset = (presetId: string) => {
    setActivePresets((prev) => ({
      ...prev,
      [presetId]: !prev[presetId]
    }));
  };

  // Reset Everything
  const handleResetAll = () => {
    setActivePresets({});
    setShowerMinutes(12);
    setAcDailyHours(4);
    setAcTemperature(23);
    setTvDailyHours(5);
    setTarifaSocialActive(false);
    setSolarOffsetPercent(0);
    setGlobalSavingsGoal(0);
    setSimulatedFlagKey(currentFlagKey);
  };

  // Save Simulation to History
  const handleSaveToHistory = () => {
    const activeActionsCount =
      Object.values(activePresets).filter(Boolean).length +
      (solarOffsetPercent > 0 ? 1 : 0) +
      (tarifaSocialActive ? 1 : 0);

    const description = simulationMetrics.isIncrease
      ? `Simulação: Acréscimo de +${formatBRL(simulationMetrics.absBrlDelta)}/mês (+${simulationMetrics.absKwhDelta} kWh). ${activeActionsCount} alteração(ões) simulada(s).`
      : simulationMetrics.isSavings
      ? `Simulação: Economia de -${formatBRL(simulationMetrics.absBrlDelta)}/mês (-${simulationMetrics.absKwhDelta} kWh). ${activeActionsCount} ação(ões) simulada(s).`
      : `Simulação: Fatura estável em ${formatBRL(simulationMetrics.finalSimulatedBrl)}/mês.`;

    const newDiagnosis: SavedDiagnosis = {
      id: `sim-${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "teste",
      originalDiagnosisId: savedDiagnosis?.id,
      input: {
        billValue: simulationMetrics.finalSimulatedBrl,
        monthlyKwh: simulationMetrics.finalSimulatedKwh,
        occupants: currentBaseline.occupants,
        appliances: simulatedAppliances,
        detailed: true,
        hasSafetyRisk: false
      },
      result: simulatedResult,
      simulation: {
        originalDiagnosisCreatedAt: savedDiagnosis?.createdAt || new Date().toISOString(),
        description
      }
    };

    if (onSaveSimulation) {
      onSaveSimulation(newDiagnosis);
      setSavedSuccessMessage("Simulação salva no seu Histórico com sucesso!");
      setTimeout(() => setSavedSuccessMessage(null), 4000);
    }
  };

  // Trigger Share / PDF Export
  const handleShare = () => {
    if (onShareSimulation) {
      const summaryTitle = simulationMetrics.isIncrease
        ? `Simulação de Aumento na Fatura (+${formatBRL(simulationMetrics.absBrlDelta)}/mês)`
        : `Simulação de Economia (${topRankedActions.length} ações)`;

      onShareSimulation({
        type: "simulation",
        scenario: {
          label: summaryTitle,
          summaryTitle: summaryTitle,
          monthlyKwh: simulationMetrics.finalSimulatedKwh,
          savingsKwh: simulationMetrics.isSavings ? simulationMetrics.absKwhDelta : -simulationMetrics.absKwhDelta,
          monthlyCost: simulationMetrics.finalSimulatedBrl,
          savingsBrl: simulationMetrics.isSavings ? simulationMetrics.absBrlDelta : -simulationMetrics.absBrlDelta,
          baseMonthlyBrl: simulationMetrics.baseBrl,
          baseMonthlyKwh: simulationMetrics.baseKwh,
          actionsCount: topRankedActions.length,
          changesSummary: topRankedActions.map(
            (act) => `${act.label}: impacto de ${formatBRL(act.estimatedSavings)}/mês`
          ),
        },
      });
    }
  };

  // Filtered Presets for Search
  const filteredPresets = useMemo(() => {
    return presetDefinitions.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.groupName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [presetDefinitions, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {savedSuccessMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-blue-600 text-white shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-blue-200 shrink-0" />
          <span>{savedSuccessMessage}</span>
        </div>
      )}

      {/* Header Section with Linear Typography */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 sm:pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Simulação (Cenários & Hipóteses)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Teste em tempo real o impacto financeiro de novos hábitos, mudanças nas bandeiras tarifárias da ANEEL, energia solar ou tarifa social na sua conta de luz.
          </p>
        </div>

        {/* Global Reset & Quick Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            id="btn-reset-simulator"
            onClick={handleResetAll}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Desmarcar todas as alterações e restaurar os hábitos originais"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>
        </div>
      </div>

      {/* Baseline Source Selector Strip */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-100 dark:border-blue-900/40">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Linha de Base da Simulação
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>{currentBaseline.label}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                • {formatNumber(currentBaseline.monthlyKwh)} kWh/mês · {formatBRL(currentBaseline.billValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Switcher Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="select-baseline-source" className="sr-only">
            Selecionar diagnóstico base
          </label>
          <div className="relative w-full md:w-auto">
            <select
              id="select-baseline-source"
              value={selectedBaselineId}
              onChange={(e) => setSelectedBaselineId(e.target.value)}
              className="w-full md:w-auto min-w-[280px] max-w-full px-3.5 py-2.5 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs transition appearance-none"
            >
              {allDiagnoses.map((diag, idx) => {
                const activeCount = extractSelectedAppliancesFromDiagnosis(diag).length;
                const dateStr = diag.createdAt ? new Date(diag.createdAt).toLocaleDateString("pt-BR") : "";
                const kwhStr = formatNumber(diag.result?.totalEstimated || diag.input?.monthlyKwh || 200);
                const title = idx === 0 ? "Meu Diagnóstico Mais Recente" : `Diagnóstico ${idx + 1}`;
                const datePart = dateStr ? `${dateStr} · ` : "";
                const applianceText = activeCount === 1 ? "aparelho" : "aparelhos";
                const label = `${title} (${datePart}${kwhStr} kWh · ${activeCount} ${applianceText})`;
                return (
                  <option key={diag.id} value={`diag-${diag.id}`}>
                    {label}
                  </option>
                );
              })}
              {billScans.map((billScan) => {
                const ref = billScan.bill.mes_referencia || "Escaneada";
                const kwh = formatNumber(billScan.bill.consumo_kwh || 200);
                const val = formatBRL(billScan.bill.valor_total || 0);
                const label = `Fatura ${ref} (${kwh} kWh · ${val})`;
                return (
                  <option key={billScan.id} value={`bill-${billScan.id}`}>
                    {label}
                  </option>
                );
              })}
              {allDiagnoses.length === 0 && billScans.length === 0 && (
                <option value="diag-default">
                  Diagnóstico Base (200 kWh/mês)
                </option>
              )}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {onNavigateToDiagnosis && (
            <button
              onClick={onNavigateToDiagnosis}
              className="hidden lg:inline-flex px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition whitespace-nowrap cursor-pointer border border-blue-200 dark:border-blue-900/40"
            >
              Novo Diagnóstico
            </button>
          )}
        </div>
      </div>

      {/* Prominent Real-time Results Banner at Top of Screen (Always Visible Without Scrolling) */}
      <div
        id="sim-prominent-results-banner"
        className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-xl border border-blue-500/30 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          {/* Values (Baseline vs Simulated) */}
          <div className="flex items-center gap-6 sm:gap-10">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Valor Atual (Linha de Base)
              </span>
              <div className="text-sm sm:text-base font-semibold text-slate-300">
                {formatBRL(simulationMetrics.baseBrl)}
                <span className="text-xs text-slate-400 font-normal">/mês</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            <div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  simulationMetrics.isIncrease
                    ? "text-amber-400"
                    : simulationMetrics.isSavings
                    ? "text-emerald-400"
                    : "text-blue-400"
                }`}
              >
                Novo Valor Simulado
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  simulationMetrics.isIncrease
                    ? "text-amber-400"
                    : simulationMetrics.isSavings
                    ? "text-emerald-400"
                    : "text-blue-400"
                }`}
              >
                {formatBRL(simulationMetrics.finalSimulatedBrl)}
                <span className="text-xs text-slate-300 font-medium ml-1">/mês</span>
              </div>
            </div>
          </div>

          {/* Impact Status Pill & Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {simulationMetrics.isIncrease ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-black flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>+{formatBRL(simulationMetrics.absBrlDelta)}/mês (+{simulationMetrics.percentDelta}%)</span>
              </div>
            ) : simulationMetrics.isSavings ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-black flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>-{formatBRL(simulationMetrics.absBrlDelta)}/mês (-{simulationMetrics.percentDelta}%)</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium">
                Sem variação (Padrão)
              </div>
            )}

            <button
              onClick={handleSaveToHistory}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
            <button
              onClick={handleResetAll}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Restaurar Padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
          </div>
        </div>

        {/* Consumption Bar & Projection Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {simulationMetrics.isIncrease ? "Acréscimo no Mês" : "Economia no Mês"}
            </span>
            <span
              className={`text-lg font-black ${
                simulationMetrics.isIncrease
                  ? "text-amber-400"
                  : simulationMetrics.isSavings
                  ? "text-emerald-400"
                  : "text-white"
              }`}
            >
              {simulationMetrics.isIncrease ? "+" : simulationMetrics.isSavings ? "-" : ""}
              {formatBRL(simulationMetrics.absBrlDelta)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {simulationMetrics.isIncrease ? "Acréscimo no Ano (12m)" : "Economia no Ano (12m)"}
            </span>
            <span className="text-lg font-black text-blue-300">
              {simulationMetrics.isIncrease ? "+" : simulationMetrics.isSavings ? "-" : ""}
              {formatBRL(simulationMetrics.annualBrlDelta)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex flex-col justify-center">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Consumo: <strong>{formatNumber(simulationMetrics.finalSimulatedKwh)} kWh</strong></span>
              <span className="text-slate-400 text-[11px]">Base: {formatNumber(simulationMetrics.baseKwh)} kWh</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                style={{
                  width: `${Math.max(
                    10,
                    Math.min(
                      100,
                      (simulationMetrics.finalSimulatedKwh / Math.max(1, simulationMetrics.baseKwh)) * 100
                    )
                  )}%`
                }}
                className={`h-full rounded-full transition-all duration-500 ${
                  simulationMetrics.isIncrease
                    ? "bg-amber-500"
                    : simulationMetrics.isSavings
                    ? "bg-emerald-500"
                    : "bg-blue-500"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Floating Real-time Bar for Instant View When Scrolled */}
      <div className="sticky top-16 sm:top-20 z-30 p-3 sm:p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-blue-500/40 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">
                Fatura Simulada
              </span>
              <span
                className={`text-base sm:text-xl font-black leading-tight ${
                  simulationMetrics.isIncrease
                    ? "text-amber-400"
                    : simulationMetrics.isSavings
                    ? "text-emerald-400"
                    : "text-blue-400"
                }`}
              >
                {formatBRL(simulationMetrics.finalSimulatedBrl)}
                <span className="text-[10px] text-slate-400 font-normal">/mês</span>
              </span>
            </div>
          </div>

          {/* Variação Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {simulationMetrics.isIncrease ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +{formatBRL(simulationMetrics.absBrlDelta)}/mês (+{simulationMetrics.percentDelta}%)
              </span>
            ) : simulationMetrics.isSavings ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                -{formatBRL(simulationMetrics.absBrlDelta)}/mês (-{simulationMetrics.percentDelta}%)
              </span>
            ) : (
              <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium">
                Sem variação
              </span>
            )}
          </div>

          <div className="hidden md:block text-xs text-slate-400">
            Consumo: <strong className="text-slate-200">{formatNumber(simulationMetrics.finalSimulatedKwh)} kWh</strong>
            <span className="text-slate-500 text-[11px] ml-1">
              (Antes: {formatNumber(simulationMetrics.baseKwh)} kWh)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveToHistory}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
          <button
            onClick={handleResetAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Restaurar Padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on the Left, Live Results Card on the Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Simulation Tabs & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Linear Mode Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
            <button
              id="tab-sim-habits"
              onClick={() => setActiveTab("habits")}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "habits"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Hábitos & Aparelhos</span>
            </button>

            <button
              id="tab-sim-flags"
              onClick={() => setActiveTab("flags")}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "flags"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Bandeiras ANEEL</span>
            </button>

            <button
              id="tab-sim-solar-social"
              onClick={() => setActiveTab("solar-social")}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "solar-social"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-yellow-500" />
              <span>Solar & Tarifa Social</span>
            </button>
          </div>

          {/* TAB 1: HABITS & APPLIANCES */}
          {activeTab === "habits" && (
            <div className="space-y-6">
              {/* Presets Catalog Search */}
              <div className="space-y-4">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar aparelho ou hábito (ex: chuveiro, ar, geladeira)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Retractable Accordion Panels per Appliance */}
                <div className="space-y-3.5">
                  {presetGroups
                    .filter((grp) => {
                      const matchesSearch =
                        !searchQuery.trim() ||
                        grp.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        grp.items.some(
                          (item) =>
                            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.desc.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      return matchesSearch;
                    })
                    .map((grp) => {
                      // Check if panel is open: default to false (closed) unless explicitly toggled or actively searching
                      const isPanelOpen = searchQuery.trim()
                        ? true
                        : openAppliancePanels[grp.group] ?? false;
                      const activeHabitsInGroup = grp.items.filter((item) => activePresets[item.id]);
                      const activeCount = activeHabitsInGroup.length;
                      const hasShowerSliders = grp.group === "chuveiro";
                      const hasAcSliders = grp.group === "ar-condicionado";
                      const hasTvSliders = grp.group === "televisao";

                      return (
                        <div
                          key={grp.group}
                          id={`appliance-panel-${grp.group}`}
                          className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                            activeCount > 0
                              ? "bg-blue-50/20 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-xs"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {/* Retractable Header */}
                          <div
                            onClick={() =>
                              setOpenAppliancePanels((prev) => ({
                                ...prev,
                                [grp.group]: !isPanelOpen
                              }))
                            }
                            className="p-4 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition ${
                                  activeCount > 0
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {grp.groupName.slice(0, 1).toUpperCase()}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                    {grp.groupName}
                                  </h4>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {grp.items.length} {grp.items.length === 1 ? "hábito" : "hábitos"}
                                  </span>
                                  {activeCount > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      {activeCount} {activeCount === 1 ? "ativo" : "ativos"}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
                                  {grp.applianceInput?.powerWatts ? `${grp.applianceInput.powerWatts}W nominal · ` : ""}
                                  Clique para {isPanelOpen ? "recolher" : "abrir opções e hábitos"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                {isPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Retractable Body */}
                          {isPanelOpen && (
                            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                              {/* Sliders for Top Consumers inside their respective equipment panel */}
                              {hasShowerSliders && (
                                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                      Tempo Médio de Banho por Pessoa
                                    </span>
                                    <div className="text-right">
                                      <span className="font-black text-blue-600 dark:text-blue-400">
                                        {showerMinutes} minutos
                                      </span>
                                      <span className="text-[10px] block font-medium">
                                        {showerMinutes < baseShowerMinutes ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            ↓ Redução de {baseShowerMinutes - showerMinutes} min (Base: {baseShowerMinutes} min)
                                          </span>
                                        ) : showerMinutes > baseShowerMinutes ? (
                                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                                            ↑ Aumento de {showerMinutes - baseShowerMinutes} min (Base: {baseShowerMinutes} min)
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">
                                            (Igual ao diagnóstico base: {baseShowerMinutes} min)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min={4}
                                    max={25}
                                    step={1}
                                    value={showerMinutes}
                                    onChange={(e) => setShowerMinutes(Number(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                  />
                                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                    <span>4 min (Rápido)</span>
                                    <span>{baseShowerMinutes} min (Seu Diagnóstico)</span>
                                    <span>25 min (Longo)</span>
                                  </div>
                                </div>
                              )}

                              {hasAcSliders && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                                  {/* AC Daily Hours Slider */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Wind className="w-3.5 h-3.5 text-blue-500" />
                                        Horas Ligado por Dia
                                      </span>
                                      <div className="text-right">
                                        <span className="font-black text-blue-600 dark:text-blue-400">
                                          {acDailyHours}h
                                        </span>
                                        <span className="text-[10px] block font-medium">
                                          {acDailyHours < baseAcHours ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              ↓ Redução de {Math.round((baseAcHours - acDailyHours) * 10) / 10}h (Base: {baseAcHours}h)
                                            </span>
                                          ) : acDailyHours > baseAcHours ? (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                                              ↑ Aumento de {Math.round((acDailyHours - baseAcHours) * 10) / 10}h (Base: {baseAcHours}h)
                                            </span>
                                          ) : (
                                            <span className="text-slate-400">(Igual à base: {baseAcHours}h)</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min={0}
                                      max={14}
                                      step={1}
                                      value={acDailyHours}
                                      onChange={(e) => setAcDailyHours(Number(e.target.value))}
                                      className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                      <span>0h (Off)</span>
                                      <span>{baseAcHours}h (Sua Base)</span>
                                      <span>14h (Contínuo)</span>
                                    </div>
                                  </div>

                                  {/* AC Temperature Slider */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                                        Temperatura Ajustada
                                      </span>
                                      <span className="font-black text-blue-600 dark:text-blue-400">
                                        {acTemperature}°C
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min={18}
                                      max={26}
                                      step={1}
                                      value={acTemperature}
                                      onChange={(e) => setAcTemperature(Number(e.target.value))}
                                      className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                      <span>18°C (Frio Intenso)</span>
                                      <span>23°C (Conforto)</span>
                                      <span>26°C (Econômico)</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {hasTvSliders && (
                                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      <Tv className="w-3.5 h-3.5 text-blue-500" />
                                      Horas de Televisão por Dia
                                    </span>
                                    <div className="text-right">
                                      <span className="font-black text-blue-600 dark:text-blue-400">
                                        {tvDailyHours}h por dia
                                      </span>
                                      <span className="text-[10px] block font-medium">
                                        {tvDailyHours < baseTvHours ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            ↓ Redução de {Math.round((baseTvHours - tvDailyHours) * 10) / 10}h (Base: {baseTvHours}h)
                                          </span>
                                        ) : tvDailyHours > baseTvHours ? (
                                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                                            ↑ Aumento de {Math.round((tvDailyHours - baseTvHours) * 10) / 10}h (Base: {baseTvHours}h)
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">(Igual à base: {baseTvHours}h)</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min={1}
                                    max={14}
                                    step={1}
                                    value={tvDailyHours}
                                    onChange={(e) => setTvDailyHours(Number(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                  />
                                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                    <span>1h (Mínimo)</span>
                                    <span>{baseTvHours}h (Sua Base)</span>
                                    <span>14h (Longo)</span>
                                  </div>
                                </div>
                              )}

                              {/* Habit Preset Cards for this Specific Appliance */}
                              <div className="grid grid-cols-1 gap-2.5">
                                {grp.items
                                  .filter((preset) => {
                                    if (!searchQuery.trim()) return true;
                                    return (
                                      preset.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      preset.desc.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                  })
                                  .map((preset) => {
                                    const isChecked = Boolean(activePresets[preset.id]);

                                    return (
                                      <div
                                        key={preset.id}
                                        id={`card-preset-${preset.id}`}
                                        onClick={() => handleTogglePreset(preset.id)}
                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                                          isChecked
                                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs"
                                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div
                                            className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 mt-0.5 transition ${
                                              isChecked
                                                ? "bg-blue-600 border-blue-600 text-white"
                                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                            }`}
                                          >
                                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          </div>

                                          <div className="space-y-0.5">
                                            <span
                                              className={`text-xs font-bold leading-tight block ${
                                                isChecked
                                                  ? "text-blue-950 dark:text-blue-200"
                                                  : "text-slate-900 dark:text-white"
                                              }`}
                                            >
                                              {preset.label}
                                            </span>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                              {preset.desc}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Info Button for Physics Explanation */}
                                        <button
                                          type="button"
                                          id={`btn-info-${preset.id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExplanatoryTopic({
                                              title: preset.label,
                                              physics: preset.physics,
                                              tip: preset.tip
                                            });
                                          }}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 shrink-0 cursor-pointer"
                                          title="Ver explicação física deste hábito"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANEEL TARIFF FLAGS */}
          {activeTab === "flags" && (
            <div className="space-y-6">
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Simulação de Bandeiras Tarifárias da ANEEL
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  As bandeiras tarifárias refletem o custo real da geração de energia no Brasil. Em meses de estiagem, usinas termelétricas fósseis mais caras são acionadas pela ANEEL, encarecendo a conta de todo o país.
                </p>

                {/* Flag Selection Matrix */}
                <div className="space-y-3 pt-2">
                  {Object.values(TARIFF_FLAGS).map((flag) => {
                    const isSelected = simulatedFlagKey === flag.key;
                    return (
                      <div
                        key={flag.key}
                        id={`btn-select-flag-${flag.key}`}
                        onClick={() => setSimulatedFlagKey(flag.key)}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? `${flag.colorClass} ring-2 ring-blue-500 shadow-sm`
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${flag.badgeClass}`}
                            >
                              {flag.name}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {flag.extraPer100Kwh === 0
                                ? "Sem custo extra"
                                : `+${formatBRL(flag.extraPer100Kwh)} por 100 kWh`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            {flag.desc}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {isSelected ? (
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Check className="w-4 h-4" />
                              Ativa na Simulação
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                              Simular esta bandeira
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Flag Impact Comparison Box */}
                {simulationMetrics.flagCostDiff !== 0 && (
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-blue-950 dark:text-blue-200">
                      <span className="font-bold">Impacto da Bandeira Tarifária:</span> Na bandeira{" "}
                      <strong>{TARIFF_FLAGS[simulatedFlagKey]?.name}</strong>, a variação regulatória pura na sua conta é de{" "}
                      <strong>
                        {simulationMetrics.flagCostDiff > 0 ? "+" : ""}
                        {formatBRL(simulationMetrics.flagCostDiff)}/mês
                      </strong>{" "}
                      ({simulationMetrics.flagCostDiff > 0 ? "+" : ""}
                      {formatBRL(simulationMetrics.flagCostDiff * 12)}/ano), mantendo exatamente os mesmos aparelhos ligados.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SOLAR & SOCIAL TARIFF */}
          {activeTab === "solar-social" && (
            <div className="space-y-6">
              {/* Tarifa Social (TSEE) Section */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Tarifa Social de Energia Elétrica (TSEE)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Lei Federal 10.438
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Famílias inscritas no CadÚnico (com renda per capita até meio salário mínimo ou com portadores de necessidade de aparelhos vitais) têm direito a descontos escalonados nas faixas de consumo.
                </p>

                {/* Toggle Card */}
                <div
                  id="btn-toggle-social-tariff"
                  onClick={() => setTarifaSocialActive(!tarifaSocialActive)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                    tarifaSocialActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      E se eu me cadastrar na Tarifa Social?
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Desconto de 65% (até 30 kWh), 40% (31 a 100 kWh) e 10% (101 a 220 kWh)
                    </span>
                  </div>

                  <div
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      tarifaSocialActive ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                        tarifaSocialActive ? "translate-x-5.5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                {tarifaSocialActive && (
                  <div className="p-3.5 rounded-2xl bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
                    <span>Desconto Social Estimado no seu Perfil:</span>
                    <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                      -{formatBRL(simulationMetrics.socialDiscountBrl)}/mês
                    </span>
                  </div>
                )}
              </div>

              {/* Distributed Solar Generation (Fotovoltaica) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Energia Solar Fotovoltaica (Geração Distribuída)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Marco Legal 14.300
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Painéis solares no telhado abatem o consumo medido em kWh através do sistema de créditos de compensação da distribuidora. Permanece obrigatória apenas a taxa de disponibilidade do fio da rede (mínimo de 30 kWh a 100 kWh) e a taxa de iluminação pública (COSIP).
                </p>

                {/* Solar Offset Selection Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Abatimento Solar Simulado</span>
                    <span className="text-amber-600 dark:text-amber-400 font-black">
                      {solarOffsetPercent === 0 ? "Sem energia solar" : `${solarOffsetPercent}% da conta`}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[0, 50, 75, 90, 95].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        id={`btn-solar-offset-${pct}`}
                        onClick={() => setSolarOffsetPercent(pct)}
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          solarOffsetPercent === pct
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {pct === 0 ? "Nenhum" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {solarOffsetPercent > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Energia Gerada pelos Painéis:</span>
                      <span>~{simulationMetrics.solarGeneratedKwh} kWh/mês</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      Mesmo com 95% de abatimento, a conta mínima residual fica em torno da taxa de conexão da distribuidora (~30 kWh monofásico + COSIP).
                    </p>
                  </div>
                )}
              </div>

              {/* Global Savings Target */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Meta Geral de Redução Familiar
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Defina um corte percentual global no consumo para planejar a economia coletiva da casa:
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {[0, 10, 20, 30].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      id={`btn-global-goal-${goal}`}
                      onClick={() => setGlobalSavingsGoal(goal)}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        globalSavingsGoal === goal
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {goal === 0 ? "Sem meta" : `-${goal}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Results, Impact Ranking & Export (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          {/* Main Results Dashboard Card */}
          <div className="p-6 rounded-3xl bg-slate-900 dark:bg-slate-950 text-white shadow-xl border border-slate-800 space-y-6">
            {/* Header: Before vs After */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Valor Atual na Linha de Base
                </span>
                <div className="text-sm font-semibold text-slate-400">
                  {formatBRL(simulationMetrics.baseBrl)}/mês
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    simulationMetrics.isIncrease
                      ? "text-amber-400"
                      : simulationMetrics.isSavings
                      ? "text-emerald-400"
                      : "text-blue-400"
                  }`}
                >
                  Novo Valor Simulado
                </span>
                <div
                  className={`text-2xl font-black ${
                    simulationMetrics.isIncrease
                      ? "text-amber-400"
                      : simulationMetrics.isSavings
                      ? "text-emerald-400"
                      : "text-blue-400"
                  }`}
                >
                  {formatBRL(simulationMetrics.finalSimulatedBrl)}
                  <span className="text-xs font-semibold text-slate-300">/mês</span>
                </div>
              </div>
            </div>

            {/* Impact Banner (Savings or Increase) */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  {simulationMetrics.isIncrease ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      Acréscimo na Fatura
                    </>
                  ) : simulationMetrics.isSavings ? (
                    <>
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      Economia no Seu Bolso
                    </>
                  ) : (
                    <>
                      <Sliders className="w-4 h-4 text-blue-400" />
                      Fatura Estável
                    </>
                  )}
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    simulationMetrics.isIncrease
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : simulationMetrics.isSavings
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {simulationMetrics.isIncrease ? "+" : simulationMetrics.isSavings ? "-" : ""}
                  {simulationMetrics.percentDelta}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div
                    className={`text-lg font-black ${
                      simulationMetrics.isIncrease
                        ? "text-amber-400"
                        : simulationMetrics.isSavings
                        ? "text-emerald-400"
                        : "text-white"
                    }`}
                  >
                    {simulationMetrics.isIncrease ? "+" : simulationMetrics.isSavings ? "-" : ""}
                    {formatBRL(simulationMetrics.absBrlDelta)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {simulationMetrics.isIncrease ? "a mais por mês" : "poupados por mês"}
                  </div>
                </div>

                <div>
                  <div className="text-lg font-black text-blue-300">
                    {simulationMetrics.isIncrease ? "+" : simulationMetrics.isSavings ? "-" : ""}
                    {formatBRL(simulationMetrics.annualBrlDelta)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {simulationMetrics.isIncrease ? "a mais no ano" : "acumulados no ano"}
                  </div>
                </div>
              </div>

              {/* Energy (kWh) Progress Bar */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Consumo: {formatNumber(simulationMetrics.finalSimulatedKwh)} kWh</span>
                  <span className="text-slate-400 font-medium">
                    Antes: {formatNumber(simulationMetrics.baseKwh)} kWh
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(
                        10,
                        Math.min(
                          100,
                          (simulationMetrics.finalSimulatedKwh / Math.max(1, simulationMetrics.baseKwh)) * 100
                        )
                      )}%`
                    }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      simulationMetrics.isIncrease
                        ? "bg-amber-500"
                        : simulationMetrics.isSavings
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Ranking of Top Impact Actions Active */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Ranking dos Maiores Impactos Ativos
                </span>
                <span className="text-[10px] text-slate-400">
                  {topRankedActions.length} ação(ões)
                </span>
              </div>

              {topRankedActions.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
                  Selecione hábitos ou ajuste os sliders para ver o ranking de quais ações geram mais impacto na fatura.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {topRankedActions.slice(0, 5).map((action, index) => (
                    <div
                      key={action.id}
                      className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-black text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-slate-200 truncate font-medium text-[11px]">
                          {action.label}
                        </span>
                      </div>
                      <span className="text-blue-400 font-bold shrink-0 whitespace-nowrap text-[11px]">
                        ~{formatBRL(action.estimatedSavings)}/mês
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons: Save to History & Share/PDF */}
            <div className="pt-2 space-y-2.5">
              <button
                id="btn-save-simulation-history"
                onClick={handleSaveToHistory}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg hover:shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Simulação no Histórico</span>
              </button>

              <button
                id="btn-share-simulation"
                onClick={handleShare}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>Exportar Relatório / PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Explanatory Educational Modal */}
      {explanatoryTopic && (
        <div
          id="simulation-explanation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setExplanatoryTopic(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  {explanatoryTopic.title}
                </h4>
              </div>
              <button
                id="btn-close-explanation-modal"
                onClick={() => setExplanatoryTopic(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] block">
                  A Física por trás da Economia
                </span>
                <p>{explanatoryTopic.physics}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <span className="font-bold block mb-0.5">Dica Prática:</span>
                <p>{explanatoryTopic.tip}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setExplanatoryTopic(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

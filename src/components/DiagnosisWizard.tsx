import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Info,
  TrendingDown,
  Printer,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Clock,
  Home,
  Users,
  Search,
  Lightbulb,
  Share2,
  Download,
  X,
  Sparkles,
  Gauge,
  Flame,
  Droplets,
  Sun,
  Snowflake,
  User,
  Tv,
  Wind,
  PieChart,
  Award,
  CheckSquare,
  Square,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Activity,
  ChevronRight,
} from "lucide-react";
import {
  ApplianceInput,
  ApplianceKey,
  BillScanRecord,
  DiagnosisInput,
  DiagnosisResult,
  LightingRoom,
  ShowerDetails,
  ShowerBatherProfile,
  ShowerTemperatureSetting,
  SafetyAnswers,
  UsageUnit,
  AccessibilitySettings,
  SavedDiagnosis,
} from "../types";
import { downloadPdfReport } from "../lib/pdfReportCompiler";
import { EnergyClassSelector } from "./EnergyClassSelector";
import {
  applianceCatalog,
  calculateDiagnosis,
  createLightingRoom,
  describeConsumptionDifference,
  estimateAppliance,
  formatBRL,
  formatNumber,
  lightingTechnologyOptions,
} from "../lib/energy";

const DIAGNOSIS_EXPLANATIONS: Record<
  string,
  { title: string; description: string; example?: string; tip?: string }
> = {
  duty_cycle: {
    title: "Fator de Utilização & Duty Cycle",
    description:
      "Aparelhos com termostato ou ciclos térmicos (como geladeira, freezer e ar-condicionado) não consomem a potência máxima o tempo todo. O motor liga para resfriar e desliga quando atinge a temperatura.",
    example:
      "Exemplo: Uma geladeira de 150 W ligada 24 horas por dia opera seu motor em torno de 45% a 65% do tempo. O Turn OFF calcula esse ciclo físico real.",
    tip: "Manter as borrachas de vedação limpas e não colocar alimentos quentes reduz diretamente o tempo de compressor acionado.",
  },
  btus: {
    title: "Capacidade Térmica de Ar-Condicionado (BTUs)",
    description:
      "BTU mede a capacidade de resfriamento. Um quarto pequeno (até 12m²) usa 9.000 BTUs; salas maiores exigem 12.000 a 18.000 BTUs ou mais.",
    example:
      "Aparelho subdimensionado (ex: 7.000 BTUs numa sala de 25m²) não atinge a temperatura, fazendo o compressor trabalhar 100% do tempo no limite máximo, gastando muito mais.",
    tip: "Aparelhos com tecnologia Inverter e Selo Procel A+++ economizam até 60% de energia em relação aos convencionais.",
  },
  confiabilidade: {
    title: "Índice de Confiabilidade dos Dados",
    description:
      "Mede a coerência matemática entre o consumo medido pela distribuidora na sua conta e a soma do consumo de todos os aparelhos cadastrados no assistente.",
    example:
      "• 85% a 100%: Cadastro fiel à realidade da residência.\n• Abaixo de 50%: Divergência alta — pode haver equipamentos não listados, horas superestimadas ou fuga de corrente.",
    tip: "Se a confiabilidade estiver baixa, revise as horas de uso de aparelhos de alto impacto ou confira se não esqueceu de marcar itens como freezer ou bomba d'água.",
  },
  eficiencia: {
    title: "Índice de Eficiência Energética",
    description:
      "Nota calculada a partir da consistência do consumo por habitante, ausência de riscos elétricos graves e aproveitamento consciente dos equipamentos.",
    example:
      "Pontuações altas mostram que a casa está protegida contra riscos elétricos e não desperdiça energia com hábitos de alto custo.",
    tip: "Resolva primeiro os pontos de perigo elétrico e adote as 2 ações prioritárias para aumentar seu índice.",
  },
  faixas_economia: {
    title: "Economia: Conservadora, Provável e Otimista",
    description:
      "Projeções fundamentadas em modelos físicos reais de uso residencial, sem promessas irreais:",
    example:
      "• Conservadora: Pequenas reduções garantidas (standby desligado e lâmpadas apagadas ao sair).\n• Provável: Ajuste disciplinado de rotina (banho 5 min mais curto e ar em 23°C/24°C).\n• Otimista: Soma de novos hábitos à substituição de lâmpadas antigas e aparelhos por Selo Procel A.",
    tip: "Mesmo a meta conservadora já gera alívio perceptível no bolso todos os meses.",
  },
};

const RISK_SIGNS = [
  "Tomadas ou plugues aquecendo com o uso",
  "Cheiro de queimado ou marcas escuras nas tomadas",
  "Faíscas ao ligar equipamentos ou plugar",
  "Fios descascados, danificados ou emendas expostas",
  "Disjuntor desarma com frequência no quadro",
  'Uso excessivo de adaptadores "benjamim" ou extensões em cadeia',
] as const;

const RISK_SIGN_RECOMMENDATIONS: Record<
  string,
  { title: string; recommendation: string }
> = {
  "Tomadas ou plugues aquecendo com o uso": {
    title: "Tomadas ou Plugues Aquecendo",
    recommendation:
      "Desligue imediatamente os aparelhos conectados a este ponto. O aquecimento revela mau contato nos bornes internos ou corrente acima da capacidade da tomada (ex.: plugue de 20A forçado em tomada de 10A). Chame um eletricista habilitado para reapertar os contatos ou substituir o módulo.",
  },
  "Cheiro de queimado ou marcas escuras nas tomadas": {
    title: "Cheiro de Queimado ou Marcas Escuras",
    recommendation:
      "Desarme imediatamente o disjuntor desse circuito no quadro e não volte a usar essa tomada. O escurecimento indica arco elétrico contínuo e carbonização do plástico, constituindo risco severo e imediato de princípio de incêndio.",
  },
  "Faíscas ao ligar equipamentos ou plugar": {
    title: "Faíscas ao Conectar Equipamentos",
    recommendation:
      "Faíscas frequentes ao plugar indicam folga mecânica ou desgaste severo das lâminas de contato internas da tomada. Substitua o conjunto da tomada por modelos certificados pelo Inmetro e evite conectar aparelhos de alta potência já ligados no botão.",
  },
  "Fios descascados, danificados ou emendas expostas": {
    title: "Fios Descascados ou Emendas Expostas",
    recommendation:
      "Risco gravíssimo de choque letal por contato direto, especialmente com crianças e animais domésticos. Não improvise com fita adesiva comum: acione um profissional para substituir o trecho danificado e refazer as emendas dentro de caixas de passagem usando conectores normatizados.",
  },
  "Disjuntor desarma com frequência no quadro": {
    title: "Disjuntor Desarmando com Frequência",
    recommendation:
      "Nunca aumente a amperagem do disjuntor sem antes redimensionar a bitola dos fios (isso pode causar incêndio oculto na parede). O desarme frequente aponta que o circuito está operando acima do limite seguro. Peça a um eletricista para redistribuir as cargas em circuitos independentes.",
  },
  'Uso excessivo de adaptadores "benjamim" ou extensões em cadeia': {
    title: 'Uso Excessivo de Adaptadores "Benjamim" / Extensões',
    recommendation:
      "Remova adaptadores em cascata. A soma das potências dos aparelhos conectados sobrecarrega a tomada individual e derrete o plástico interno. Ligue apenas um aparelho de potência média/alta por tomada e providencie novos pontos fixos com um profissional.",
  },
  // Fallback for previous single-quote data in local storage
  "Uso excessivo de adaptadores 'benjamim' ou extensões em cadeia": {
    title: 'Uso Excessivo de Adaptadores "Benjamim" / Extensões',
    recommendation:
      "Remova adaptadores em cascata. A soma das potências dos aparelhos conectados sobrecarrega a tomada individual e derrete o plástico interno. Ligue apenas um aparelho de potência média/alta por tomada e providencie novos pontos fixos com um profissional.",
  },
};

interface DiagnosisWizardProps {
  onSaveDiagnosis: (diagnosis: SavedDiagnosis) => void;
  onOpenSimulator: (diagnosis: SavedDiagnosis) => void;
  onExit?: () => void;
  billScans: BillScanRecord[];
  initialBillScan?: BillScanRecord | null;
  initialSavedDiagnosis?: SavedDiagnosis | null;
  settings: AccessibilitySettings;
  onFocusModeChange?: (active: boolean) => void;
  onShareDiagnosis?: (diagnosis: SavedDiagnosis) => void;
}

export const DiagnosisWizard: React.FC<DiagnosisWizardProps> = ({
  onSaveDiagnosis,
  onOpenSimulator,
  onExit,
  billScans,
  initialBillScan,
  initialSavedDiagnosis,
  settings,
  onFocusModeChange,
  onShareDiagnosis,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(
    initialSavedDiagnosis?.result ? 4 : 1,
  );
  const [currentDiagId, setCurrentDiagId] = useState<string | null>(
    initialSavedDiagnosis?.id || null,
  );
  const [isSaved, setIsSaved] = useState<boolean>(
    Boolean(initialSavedDiagnosis),
  );
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [explanatoryTopic, setExplanatoryTopic] = useState<{
    title: string;
    description: string;
    example?: string;
    tip?: string;
  } | null>(null);

  // Synchronize when a saved diagnosis is selected from History or externally
  useEffect(() => {
    if (initialSavedDiagnosis) {
      setCurrentDiagId(initialSavedDiagnosis.id);
      setIsSaved(true);
      if (initialSavedDiagnosis.input) {
        setBillValue(initialSavedDiagnosis.input.billValue ?? 220);
        setMonthlyKwh(initialSavedDiagnosis.input.monthlyKwh ?? 180);
        setOccupants(initialSavedDiagnosis.input.occupants ?? 3);
        if (
          initialSavedDiagnosis.input.appliances &&
          initialSavedDiagnosis.input.appliances.length > 0
        ) {
          setAppliances(initialSavedDiagnosis.input.appliances);
        }
        if (initialSavedDiagnosis.input.safety) {
          setSafety(initialSavedDiagnosis.input.safety);
        }
        setHasSafetyRisk(Boolean(initialSavedDiagnosis.input.hasSafetyRisk));
      }
      if (initialSavedDiagnosis.result) {
        setResult(initialSavedDiagnosis.result);
        setStep(4);
      }
    }
  }, [initialSavedDiagnosis]);

  // Garante que o event loop e o foco do app permaneçam ativos após qualquer impressão
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.style.pointerEvents = "";
      document.documentElement.style.pointerEvents = "";
      if (typeof window !== "undefined") {
        window.focus();
      }
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // Notify focus mode during questionnaire (steps 1-3)
  useEffect(() => {
    if (onFocusModeChange) {
      onFocusModeChange(step >= 1 && step <= 3);
    }
    return () => {
      if (onFocusModeChange) {
        onFocusModeChange(false);
      }
    };
  }, [step, onFocusModeChange]);

  // Step 1: Bill & Household
  const [billValue, setBillValue] = useState<number>(
    initialSavedDiagnosis?.input?.billValue ??
      (initialBillScan?.bill.valor_total || 220),
  );
  const [monthlyKwh, setMonthlyKwh] = useState<number>(
    initialSavedDiagnosis?.input?.monthlyKwh ??
      (initialBillScan?.bill.consumo_kwh || 180),
  );
  const [occupants, setOccupants] = useState<number>(
    initialSavedDiagnosis?.input?.occupants ?? 3,
  );
  const [selectedBillId, setSelectedBillId] = useState<string | null>(
    initialBillScan?.id || null,
  );

  // Step 2: Appliances Inventory
  const initialAppliances: ApplianceInput[] = useMemo(() => {
    return applianceCatalog.map((item) => ({
      id: item.key,
      key: item.key,
      label: item.label,
      present:
        item.key === "geladeira" ||
        item.key === "chuveiro" ||
        item.key === "iluminacao",
      quantity: 1,
      quantityUsed: 1,
      frequency:
        item.mode === "ciclica" ? 30 : item.key === "chuveiro" ? 30 : 20,
      hoursPerDay:
        item.key === "geladeira" ? 24 : item.key === "chuveiro" ? 0.6 : 3,
      usageUnit: "horas",
      powerWatts: item.defaultPower,
      source: "estimativa",
      utilizationFactor: item.defaultUtilizationFactor,
      mode: item.mode,
      inverterTechnology: false,
      lightingType: "led",
      lightingRooms:
        item.key === "iluminacao"
          ? [
              {
                ...createLightingRoom("room-1"),
                name: "Sala",
                lamps: { led: 2, fluorescente: 0, incandescente: 0 },
              },
              {
                ...createLightingRoom("room-2"),
                name: "Cozinha",
                lamps: { led: 2, fluorescente: 0, incandescente: 0 },
              },
              {
                ...createLightingRoom("room-3"),
                name: "Quartos",
                lamps: { led: 2, fluorescente: 0, incandescente: 0 },
              },
            ]
          : undefined,
      showerDetails:
        item.key === "chuveiro"
          ? {
              mode: "general",
              defaultSetting: "inverno",
              averageMinutesPerBath: 12,
              bathsPerDayPerPerson: 1,
              bathers: [
                {
                  id: "bather-1",
                  name: "Morador 1",
                  minutesPerBath: 12,
                  bathsPerDay: 1,
                  seasonSetting: "inverno",
                  frequency: 30,
                },
                {
                  id: "bather-2",
                  name: "Morador 2",
                  minutesPerBath: 10,
                  bathsPerDay: 1,
                  seasonSetting: "verao",
                  frequency: 30,
                },
                {
                  id: "bather-3",
                  name: "Morador 3",
                  minutesPerBath: 15,
                  bathsPerDay: 1,
                  seasonSetting: "inverno",
                  frequency: 30,
                },
              ],
            }
          : undefined,
    }));
  }, []);

  const [appliances, setAppliances] = useState<ApplianceInput[]>(() => {
    if (
      initialSavedDiagnosis?.input?.appliances &&
      initialSavedDiagnosis.input.appliances.length > 0
    ) {
      return initialSavedDiagnosis.input.appliances;
    }
    return initialAppliances;
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [lightingMode, setLightingMode] = useState<"general" | "rooms">(
    "general",
  );
  const [showerMode, setShowerMode] = useState<"general" | "bathers">(
    () => {
      const chuveiro = initialSavedDiagnosis?.input?.appliances?.find(
        (a) => a.key === "chuveiro",
      );
      return chuveiro?.showerDetails?.mode === "detailed" ? "bathers" : "general";
    },
  );

  // Sincroniza horas diárias do chuveiro com o total de moradores configurado no Passo 1
  useEffect(() => {
    if (initialSavedDiagnosis) return;
    setAppliances((prev) => {
      const ch = prev.find((a) => a.key === "chuveiro");
      if (!ch) return prev;
      const occ = Math.max(1, occupants);
      const isGeneral = (ch.showerDetails?.mode || "general") === "general";
      if (isGeneral) {
        const avgMins = ch.showerDetails?.averageMinutesPerBath || 12;
        const bathsPerDay = ch.showerDetails?.bathsPerDayPerPerson || 1;
        const targetHours = Math.round(((occ * avgMins * bathsPerDay) / 60) * 100) / 100;
        if (ch.hoursPerDay !== targetHours) {
          return prev.map((a) => (a.key === "chuveiro" ? { ...a, hoursPerDay: targetHours } : a));
        }
      }
      return prev;
    });
  }, [occupants, initialSavedDiagnosis]);

  // Step 3: Safety Checks
  const [safety, setSafety] = useState<SafetyAnswers>(
    initialSavedDiagnosis?.input?.safety ?? {
      grounding: "nao-sei",
      breakerCount: null,
      dr: "nao-sei",
      riskSigns: [],
    },
  );
  const [hasSafetyRisk, setHasSafetyRisk] = useState<boolean>(
    initialSavedDiagnosis?.input?.hasSafetyRisk ?? false,
  );

  // Step 4: Result state
  const [result, setResult] = useState<DiagnosisResult | null>(
    initialSavedDiagnosis?.result ?? null,
  );

  // Validations for Step 1 and Step 2
  const isStep1Valid =
    !isNaN(monthlyKwh) &&
    monthlyKwh >= 1 &&
    monthlyKwh <= 50000 &&
    !isNaN(billValue) &&
    billValue >= 0 &&
    !isNaN(occupants) &&
    occupants >= 1 &&
    occupants <= 30;

  const hasValidAppliance = useMemo(() => {
    return appliances.some(
      (a) =>
        a.present &&
        (a.hoursPerDay > 0 ||
          (a.lightingRooms && a.lightingRooms.length > 0) ||
          (a.showerDetails && (a.showerDetails.bathers?.length > 0 || (a.showerDetails.averageMinutesPerBath || 0) > 0))),
    );
  }, [appliances]);

  // Categories list
  const categories = [
    { id: "todos", label: "Todos" },
    { id: "climatizacao", label: "Climatização & Luz" },
    { id: "cozinha", label: "Cozinha" },
    { id: "aquecimento", label: "Banho & Térmicos" },
    { id: "limpeza", label: "Limpeza" },
    { id: "eletronicos", label: "Eletrônicos" },
    { id: "motores_outros", label: "Motores & Outros" },
  ];

  const filteredAppliances = useMemo(() => {
    return appliances.filter((a) => {
      const def = applianceCatalog.find((c) => c.key === a.key);
      const matchesCategory =
        categoryFilter === "todos" || def?.category === categoryFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term === "" ||
        a.label.toLowerCase().includes(term) ||
        (def?.description && def.description.toLowerCase().includes(term)) ||
        (def?.category && def.category.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [appliances, categoryFilter, searchTerm]);

  // Live Telemetry & Coherence Engine
  const liveEstimates = useMemo(() => {
    return appliances
      .filter((a) => a.present)
      .map((a) => estimateAppliance(a));
  }, [appliances]);

  const liveTotalEstimatedKwh = useMemo(() => {
    return liveEstimates.reduce((sum, item) => sum + item.monthlyKwh, 0);
  }, [liveEstimates]);

  const liveCoherenceRatio = useMemo(() => {
    if (!monthlyKwh || monthlyKwh <= 0) return 0;
    return Math.round((liveTotalEstimatedKwh / monthlyKwh) * 100);
  }, [liveTotalEstimatedKwh, monthlyKwh]);

  const liveTopAppliance = useMemo(() => {
    if (liveEstimates.length === 0) return null;
    return [...liveEstimates].sort((a, b) => b.monthlyKwh - a.monthlyKwh)[0];
  }, [liveEstimates]);

  const activeApplianceCount = useMemo(() => {
    return appliances.filter((a) => a.present).length;
  }, [appliances]);

  // Active count per category for pills
  const categoryActiveCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: 0 };
    categories.forEach((cat) => {
      if (cat.id !== "todos") counts[cat.id] = 0;
    });
    appliances.forEach((a) => {
      if (a.present) {
        counts.todos = (counts.todos || 0) + 1;
        const def = applianceCatalog.find((c) => c.key === a.key);
        if (def?.category && counts[def.category] !== undefined) {
          counts[def.category]++;
        }
      }
    });
    return counts;
  }, [appliances, categories]);

  // Step 3: Safety Score & Health Assessment
  const safetyAssessment = useMemo(() => {
    let score = 100;
    const signs = safety?.riskSigns || [];
    score -= signs.length * 20;
    if (safety?.grounding === "nao") score -= 20;
    else if (safety?.grounding === "nao-sei") score -= 10;
    if (safety?.dr === "nao") score -= 20;
    else if (safety?.dr === "nao-sei") score -= 10;
    score = Math.max(0, score);

    if (score >= 80) {
      return {
        score,
        level: "baixo" as const,
        label: "Instalação Segura e Conforme",
        description: "Sem indícios visíveis de sobrecarga ou risco de choque.",
        badgeColor: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800",
      };
    } else if (score >= 50) {
      return {
        score,
        level: "medio" as const,
        label: "Atenção: Vulnerabilidades Detectadas",
        description: "Recomenda-se revisão por eletricista habilitado.",
        badgeColor: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
      };
    } else {
      return {
        score,
        level: "critico" as const,
        label: "Risco Crítico Imediato",
        description: "Sinais claros de risco de incêndio ou choque elétrico grave.",
        badgeColor: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800",
      };
    }
  }, [safety]);

  // Step 4: Interactive Goal Checklist & Category Breakdown
  const [adoptedRecommendations, setAdoptedRecommendations] = useState<string[]>([]);
  const [quickSimShowerMinutes, setQuickSimShowerMinutes] = useState<number>(0); // 0 to 10 min reduction

  const toggleAdoptedRecommendation = (id: string) => {
    setAdoptedRecommendations((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const adoptedSavings = useMemo(() => {
    if (!result) return { kwh: 0, brl: 0, count: 0 };
    let totalKwh = 0;
    let count = 0;
    const recs = Array.isArray(result.recommendations) ? result.recommendations : [];
    recs.forEach((rec) => {
      if (adoptedRecommendations.includes(rec.id)) {
        const pKwh = Array.isArray(rec.potentialKwh) ? rec.potentialKwh : [0, 0];
        const avgKwh = ((pKwh[0] || 0) + (pKwh[1] || 0)) / 2;
        totalKwh += avgKwh;
        count += 1;
      }
    });
    return {
      kwh: Math.round(totalKwh),
      brl: totalKwh * (result.effectiveCostPerKwh || 0.88),
      count,
    };
  }, [adoptedRecommendations, result]);

  // Step 4: Home Efficiency Rating (A to E)
  const homeEfficiencyRating = useMemo(() => {
    if (!result) {
      return {
        grade: "C",
        label: "Consumo Médio",
        description: "Consumo residencial típico.",
        color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
        bg: "bg-amber-600",
        savingsRange: "15% a 25%",
      };
    }
    const kwhPerPerson = result.kwhPerPerson;
    if (kwhPerPerson <= 55) {
      return {
        grade: "A",
        label: "Alta Eficiência",
        description: "Consumo per capita excelente, muito consciente e bem controlado.",
        color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800",
        bg: "bg-emerald-600",
        savingsRange: "5% a 10%",
      };
    } else if (kwhPerPerson <= 85) {
      return {
        grade: "B",
        label: "Boa Eficiência",
        description: "Consumo equilibrado, condizente com hábitos saudáveis da residência.",
        color: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-800",
        bg: "bg-teal-600",
        savingsRange: "10% a 20%",
      };
    } else if (kwhPerPerson <= 130) {
      return {
        grade: "C",
        label: "Consumo Típico",
        description: "Margem clara de economia mensal sem perda de conforto na rotina.",
        color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800",
        bg: "bg-amber-600",
        savingsRange: "15% a 25%",
      };
    } else if (kwhPerPerson <= 180) {
      return {
        grade: "D",
        label: "Consumo Elevado",
        description: "Impacto acentuado de aparelhos de alto consumo contínuo ou resistivos.",
        color: "text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800",
        bg: "bg-amber-600",
        savingsRange: "25% a 35%",
      };
    } else {
      return {
        grade: "E",
        label: "Consumo Crítico",
        description: "Alta concentração de desperdício ou sobrecarga nos aparelhos.",
        color: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800",
        bg: "bg-rose-600",
        savingsRange: "30% a 40%",
      };
    }
  }, [result]);

  // Step 4: Category Breakdown
  const categoryBreakdown = useMemo(() => {
    if (!result) return [];
    const map: Record<string, { label: string; kwh: number; cost: number; count: number }> = {
      aquecimento: { label: "Aquecimento & Banho", kwh: 0, cost: 0, count: 0 },
      climatizacao: { label: "Climatização & Luz", kwh: 0, cost: 0, count: 0 },
      cozinha: { label: "Cozinha & Refrigeração", kwh: 0, cost: 0, count: 0 },
      eletronicos: { label: "Eletrônicos & TI", kwh: 0, cost: 0, count: 0 },
      limpeza: { label: "Lavagem & Limpeza", kwh: 0, cost: 0, count: 0 },
      motores_outros: { label: "Motores & Outros", kwh: 0, cost: 0, count: 0 },
    };

    const estimates = Array.isArray(result.estimates) ? result.estimates : [];
    estimates.forEach((est) => {
      const def = applianceCatalog.find((c) => c.key === est.key);
      const catKey = def?.category || "motores_outros";
      if (map[catKey]) {
        map[catKey].kwh += est.monthlyKwh;
        map[catKey].cost += est.monthlyKwh * (result.effectiveCostPerKwh || 0.88);
        map[catKey].count += 1;
      }
    });

    const total = Math.max(1, result.totalEstimated || 1);
    return Object.entries(map)
      .filter(([_, val]) => val.kwh > 0)
      .map(([key, val]) => ({
        key,
        label: val.label,
        kwh: val.kwh,
        cost: val.cost,
        count: val.count,
        pct: Math.round((val.kwh / total) * 100),
      }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [result]);

  // Import from saved bill
  const handleImportBill = (scan: BillScanRecord) => {
    setSelectedBillId(scan.id);
    if (scan.bill.consumo_kwh) setMonthlyKwh(scan.bill.consumo_kwh);
    if (scan.bill.valor_total) setBillValue(scan.bill.valor_total);
  };

  const updateAppliance = (
    key: ApplianceKey,
    patch: Partial<ApplianceInput>,
  ) => {
    setIsSaved(false);
    setAppliances((prev) =>
      prev.map((app) => (app.key === key ? { ...app, ...patch } : app)),
    );
  };

  // Run calculation and advance to Step 4
  const handleCalculate = () => {
    const activeBill = selectedBillId
      ? billScans.find((s) => s.id === selectedBillId)?.bill
      : undefined;

    const inputData: DiagnosisInput = {
      billValue: Math.max(0, billValue),
      monthlyKwh: Math.max(1, monthlyKwh),
      occupants: Math.max(1, occupants),
      appliances,
      detailed: true,
      hasSafetyRisk: hasSafetyRisk || safety.riskSigns.length > 0,
      safety,
    };

    const calculated = calculateDiagnosis(inputData, activeBill);
    setResult(calculated);
    setStep(4);

    const diagId = currentDiagId || `diag-${Date.now()}`;
    setCurrentDiagId(diagId);
    setIsSaved(true);

    // Auto-save immediately to history (preventing duplicates by reusing same ID)
    const autoSavedDiag: SavedDiagnosis = {
      id: diagId,
      createdAt: new Date().toISOString(),
      input: inputData,
      result: calculated,
      sourceBillScanId: selectedBillId || undefined,
      kind: "principal",
    };
    onSaveDiagnosis(autoSavedDiag);
  };

  const handleSave = () => {
    if (!result) return;
    const diagId = currentDiagId || `diag-${Date.now()}`;
    setCurrentDiagId(diagId);
    const diagnosisToSave: SavedDiagnosis = {
      id: diagId,
      createdAt: new Date().toISOString(),
      input: {
        billValue: Math.max(0, billValue),
        monthlyKwh: Math.max(1, monthlyKwh),
        occupants: Math.max(1, occupants),
        appliances,
        detailed: true,
        hasSafetyRisk: hasSafetyRisk || safety.riskSigns.length > 0,
        safety,
      },
      result,
      sourceBillScanId: selectedBillId || undefined,
      kind: "principal",
    };
    onSaveDiagnosis(diagnosisToSave);
    setIsSaved(true);
  };

  const handleSaveAndExit = () => {
    handleSave();
    if (onFocusModeChange) onFocusModeChange(false);
    if (onExit) {
      onExit();
    }
  };

  // Chart colors for Recharts
  const COLORS = [
    "#087F5B",
    "#0D9488",
    "#0284C7",
    "#6366F1",
    "#8B5CF6",
    "#D97706",
    "#DC2626",
    "#64748B",
  ];

  return (
    <div
      id="diagnosis-wizard-view"
      className="space-y-6 sm:space-y-8 animate-in fade-in duration-300"
    >
      {/* Top Navigation Bar: Back to Previous Step or Return to Home */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {step === 1 ? (
          <button
            id="btn-exit-diagnosis-top"
            type="button"
            onClick={() => {
              if (onFocusModeChange) onFocusModeChange(false);
              if (onExit) {
                onExit();
              }
            }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
            title="Voltar à tela Início"
          >
            <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Voltar ao Início</span>
          </button>
        ) : step === 4 ? (
          <button
            id="btn-exit-diagnosis-top"
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
            title="Voltar à Verificação de Segurança (Etapa 3)"
          >
            <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Voltar à Etapa 3 (Segurança)</span>
          </button>
        ) : (
          <button
            id="btn-exit-diagnosis-top"
            type="button"
            onClick={() =>
              setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))
            }
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
            title="Voltar à etapa anterior preservando os dados preenchidos"
          >
            <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Voltar à Etapa {step - 1}</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Assistente de Eficiência</span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-xs">
            Etapa {step} de 4
          </span>
        </div>
      </div>

      {/* Wizard Progress Stepper */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { num: 1, label: "Fatura & Lar", est: "~1 min", canClick: true },
            { num: 2, label: "Equipamentos", est: "~3 min", canClick: isStep1Valid },
            { num: 3, label: "Segurança", est: "~1 min", canClick: isStep1Valid && hasValidAppliance },
            { num: 4, label: "Relatório", est: "Resultado", canClick: !!result },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                disabled={!s.canClick}
                onClick={() => {
                  if (s.canClick && s.num !== step) {
                    if (s.num === 4 && !result) {
                      handleCalculate();
                    } else {
                      setStep(s.num as 1 | 2 | 3 | 4);
                    }
                  }
                }}
                className={`flex flex-col items-center gap-1.5 transition group ${
                  s.canClick ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
                title={s.canClick ? `Ir para Etapa ${s.num}: ${s.label}` : "Complete os passos anteriores"}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                    step === s.num
                      ? "bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105 ring-4 ring-teal-500/20"
                      : step > s.num
                        ? "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 group-hover:bg-teal-200 dark:group-hover:bg-teal-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200"
                  }`}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <div className="text-center">
                  <span
                    className={`block text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                      step === s.num
                        ? "text-teal-600 dark:text-teal-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                    {s.est}
                  </span>
                </div>
              </button>
              {idx < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full transition-colors ${
                    step > idx + 1
                      ? "bg-teal-500"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: BILL & HOUSEHOLD CONTEXT */}
      {step === 1 && (
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] flex items-center gap-2">
                <span>Etapa 1: Informações da Conta & Moradores</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Informe os dados da sua fatura e a composição da residência para calcular a tarifa real e calibrar o consumo.
              </p>
            </div>
          </div>

          {/* Import from past scanned bills button if available */}
          {billScans.length > 0 && (
            <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-3">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-teal-600" />
                Puxar dados de uma conta já escaneada:
              </span>
              <div className="flex flex-wrap gap-2">
                {billScans.slice(0, 4).map((scan) => (
                  <button
                    key={scan.id}
                    id={`btn-import-bill-${scan.id}`}
                    onClick={() => handleImportBill(scan)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      selectedBillId === scan.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {scan.bill.mes_referencia || "Fatura"} ·{" "}
                    {scan.bill.consumo_kwh ?? "—"} kWh (
                    {formatBRL(scan.bill.valor_total || 0)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Valor Médio da Fatura (R$)
              </label>
              <input
                id="input-wizard-bill-value"
                type="number"
                step="0.01"
                value={billValue === 0 ? "" : billValue}
                onChange={(e) =>
                  setBillValue(
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                placeholder="Ex: 240.00"
                className="w-full text-lg font-bold p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-teal-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Total a pagar da fatura de energia mais recente.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Consumo Mensal (kWh)
              </label>
              <input
                id="input-wizard-monthly-kwh"
                type="number"
                value={monthlyKwh === 0 ? "" : monthlyKwh}
                onChange={(e) =>
                  setMonthlyKwh(
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                placeholder="Ex: 180"
                className="w-full text-lg font-bold p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-teal-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Quantidade de quilowatts-hora faturados no mês.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Moradores na Residência
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOccupants((prev) => Math.max(1, prev - 1))}
                  className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center shrink-0"
                  title="Diminuir moradores"
                >
                  -
                </button>
                <input
                  id="input-wizard-occupants"
                  type="number"
                  min="1"
                  max="25"
                  value={occupants === 0 ? "" : occupants}
                  onChange={(e) =>
                    setOccupants(
                      e.target.value === ""
                        ? 0
                        : Math.max(0, Number(e.target.value)),
                    )
                  }
                  onBlur={() => {
                    if (!occupants || occupants < 1) setOccupants(1);
                  }}
                  placeholder="Ex: 3"
                  className="w-full text-center text-lg font-bold p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setOccupants((prev) => Math.min(25, (prev || 1) + 1))}
                  className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center shrink-0"
                  title="Aumentar moradores"
                >
                  +
                </button>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Para calcular consumo e custo per capita.
              </span>
            </div>
          </div>

          {/* Instant Household Telemetry Snapshot */}
          {monthlyKwh > 0 && billValue > 0 && (
            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Tarifa Efetiva</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatBRL(billValue / monthlyKwh)} / kWh
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Consumo por Morador</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {Math.round(monthlyKwh / Math.max(1, occupants))} kWh/mês
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Custo por Morador</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatBRL(billValue / Math.max(1, occupants))} / mês
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isStep1Valid && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Para continuar com segurança, informe um valor de conta a partir
                de R$ 10,00, consumo mensal entre 10 e 5.000 kWh e entre 1 e 30
                moradores.
              </span>
            </div>
          )}

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            {onExit ? (
              <button
                type="button"
                id="btn-wizard-step1-exit"
                onClick={() => {
                  if (onFocusModeChange) onFocusModeChange(false);
                  onExit();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Início
              </button>
            ) : (
              <div />
            )}
            <button
              id="btn-wizard-step1-next"
              disabled={!isStep1Valid}
              onClick={() => {
                if (isStep1Valid) setStep(2);
              }}
              className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 ${
                isStep1Valid
                  ? "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
              }`}
            >
              <span>Avançar para Aparelhos</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: APPLIANCES INVENTORY & LIGHTING ROOM BUILDER */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Live Adherence & Telemetry Sticky Banner */}
          <div className="sticky top-2 z-20 p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-teal-200 dark:border-teal-900/80 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Mapeamento em Tempo Real
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {activeApplianceCount} aparelho{activeApplianceCount !== 1 ? "s" : ""} ativo{activeApplianceCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {formatNumber(liveTotalEstimatedKwh)} kWh explicados de {formatNumber(monthlyKwh)} kWh da fatura ({liveCoherenceRatio}%)
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                    liveCoherenceRatio >= 75 && liveCoherenceRatio <= 125
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : liveCoherenceRatio < 75
                        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  {liveCoherenceRatio >= 75 && liveCoherenceRatio <= 125
                    ? "Excelente Aderência"
                    : liveCoherenceRatio < 75
                      ? "Faltam Aparelhos"
                      : "Soma Elevada"}
                </span>

                {liveTopAppliance && (
                  <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl font-medium">
                    <span className="text-slate-400">Vilão:</span>
                    <strong className="text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                      {liveTopAppliance.label}
                    </strong>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                      ({formatNumber(liveTopAppliance.monthlyKwh)} kWh)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Coherence Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    liveCoherenceRatio >= 75 && liveCoherenceRatio <= 125
                      ? "bg-emerald-500"
                      : liveCoherenceRatio < 75
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, liveCoherenceRatio)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>0 kWh</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Meta da Fatura: {formatNumber(monthlyKwh)} kWh
                </span>
                <span>{formatNumber(monthlyKwh * 1.3)} kWh+</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                  Etapa 2: Mapeamento Físico de Equipamentos
                </h2>
                <div className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span>
                    Marque os aparelhos presentes e informe as horas ou minutos de
                    uso diário. O aplicativo aplica o duty cycle físico real
                    (ciclos térmicos do compressor).
                  </span>
                  <button
                    type="button"
                    id="btn-help-duty-cycle"
                    onClick={() =>
                      setExplanatoryTopic(DIAGNOSIS_EXPLANATIONS.duty_cycle)
                    }
                    className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer ml-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />O que é Duty Cycle?
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input & Category Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-appliance"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar aparelho (ex: chuveiro, geladeira, ar, tv, lâmpada)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-teal-500 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter Pills with Live Counts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => {
                  const activeCount = categoryActiveCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      id={`btn-cat-${cat.id}`}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                        categoryFilter === cat.id
                          ? "bg-teal-600 text-white shadow-xs font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {activeCount > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            categoryFilter === cat.id
                              ? "bg-white text-teal-800"
                              : "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300"
                          }`}
                        >
                          {activeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Empty state for search */}
            {filteredAppliances.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Nenhum aparelho encontrado para "{searchTerm}".
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("todos");
                  }}
                  className="text-xs font-bold text-teal-600 hover:underline"
                >
                  Limpar filtros de busca
                </button>
              </div>
            )}

            {/* Appliances List */}
            <div className="space-y-4">
              {filteredAppliances.map((app) => {
                const def = applianceCatalog.find((c) => c.key === app.key);
                const isLighting = app.key === "iluminacao";
                const isShower = app.key === "chuveiro";
                const isEvCharger = app.key === "carro-eletrico";
                const isCyclic = app.mode === "ciclica";
                const estimate = estimateAppliance(app);
                const effectiveTariff = monthlyKwh > 0 ? billValue / monthlyKwh : 0.85;
                const estimatedCost = estimate.monthlyKwh * effectiveTariff;

                return (
                  <div
                    key={app.key}
                    id={`appliance-card-${app.key}`}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                      app.present
                        ? "bg-slate-50 dark:bg-slate-800/40 border-teal-500/50 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
                    }`}
                  >
                    {/* Header: Checkbox & Name */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          id={`check-app-${app.key}`}
                          type="checkbox"
                          checked={app.present}
                          onChange={(e) =>
                            updateAppliance(app.key, {
                              present: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              {app.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {def?.description}
                          </span>
                        </div>
                      </label>

                      {app.present && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <div className="text-right">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 block">
                              ~{formatNumber(estimate.monthlyKwh)} kWh/mês
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                              {formatBRL(estimatedCost)} / mês
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controls if Present */}
                    {app.present && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
                        {/* Lighting: Mode Switcher (General vs Room-by-room) */}
                        {isLighting ? (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded-2xl border border-teal-200 dark:border-teal-800">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-teal-600" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  Como prefere cadastrar as lâmpadas?
                                </span>
                              </div>
                              <div className="flex rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightingMode("general");
                                    // If not configured, set default general room
                                    if (
                                      !app.lightingRooms ||
                                      app.lightingRooms.length === 0 ||
                                      app.lightingRooms[0].id !== "geral"
                                    ) {
                                      updateAppliance("iluminacao", {
                                        lightingRooms: [
                                          {
                                            id: "geral",
                                            name: "Toda a Casa (Iluminação Geral)",
                                            frequency: 30,
                                            hoursPerDay: 5,
                                            lamps: {
                                              led: 8,
                                              fluorescente: 1,
                                              incandescente: 0,
                                            },
                                          },
                                        ],
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1 font-bold rounded-lg transition ${
                                    lightingMode === "general"
                                      ? "bg-teal-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                  }`}
                                >
                                  Geral da Casa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightingMode("rooms");
                                    if (
                                      app.lightingRooms &&
                                      app.lightingRooms[0]?.id === "geral"
                                    ) {
                                      updateAppliance("iluminacao", {
                                        lightingRooms: [
                                          {
                                            ...createLightingRoom("room-1"),
                                            name: "Sala",
                                            hoursPerDay: 5,
                                            lamps: {
                                              led: 3,
                                              fluorescente: 0,
                                              incandescente: 0,
                                            },
                                          },
                                          {
                                            ...createLightingRoom("room-2"),
                                            name: "Cozinha",
                                            hoursPerDay: 4,
                                            lamps: {
                                              led: 2,
                                              fluorescente: 0,
                                              incandescente: 0,
                                            },
                                          },
                                          {
                                            ...createLightingRoom("room-3"),
                                            name: "Quartos",
                                            hoursPerDay: 3,
                                            lamps: {
                                              led: 3,
                                              fluorescente: 0,
                                              incandescente: 0,
                                            },
                                          },
                                        ],
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1 font-bold rounded-lg transition ${
                                    lightingMode === "rooms"
                                      ? "bg-teal-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                  }`}
                                >
                                  Por Cômodo (Detalhado)
                                </button>
                              </div>
                            </div>

                            {/* Lighting Mode: General */}
                            {lightingMode === "general" ? (
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  Informe a média de lâmpadas de cada tecnologia
                                  instaladas em toda a residência e a média de
                                  horas de uso:
                                </div>
                                {(() => {
                                  const generalRoom = app
                                    .lightingRooms?.[0] || {
                                    id: "geral",
                                    name: "Toda a Casa",
                                    hoursPerDay: 5,
                                    frequency: 30,
                                    lamps: {
                                      led: 8,
                                      fluorescente: 1,
                                      incandescente: 0,
                                    },
                                  };
                                  return (
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                      <div>
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                          Média Horas/dia
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="24"
                                          value={
                                            generalRoom.hoursPerDay === 0
                                              ? ""
                                              : generalRoom.hoursPerDay
                                          }
                                          onChange={(e) => {
                                            const updated = [
                                              {
                                                ...generalRoom,
                                                hoursPerDay:
                                                  e.target.value === ""
                                                    ? 0
                                                    : Number(e.target.value),
                                              },
                                            ];
                                            updateAppliance("iluminacao", {
                                              lightingRooms: updated,
                                            });
                                          }}
                                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                          Dias/mês
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="30"
                                          value={
                                            generalRoom.frequency === 0
                                              ? ""
                                              : generalRoom.frequency
                                          }
                                          onChange={(e) => {
                                            const updated = [
                                              {
                                                ...generalRoom,
                                                frequency:
                                                  e.target.value === ""
                                                    ? 0
                                                    : Number(e.target.value),
                                              },
                                            ];
                                            updateAppliance("iluminacao", {
                                              lightingRooms: updated,
                                            });
                                          }}
                                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold block mb-1">
                                          Total LED (9W)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            generalRoom.lamps.led === 0
                                              ? ""
                                              : generalRoom.lamps.led
                                          }
                                          onChange={(e) => {
                                            const updated = [
                                              {
                                                ...generalRoom,
                                                lamps: {
                                                  ...generalRoom.lamps,
                                                  led:
                                                    e.target.value === ""
                                                      ? 0
                                                      : Math.max(
                                                          0,
                                                          Number(
                                                            e.target.value,
                                                          ),
                                                        ),
                                                },
                                              },
                                            ];
                                            updateAppliance("iluminacao", {
                                              lightingRooms: updated,
                                            });
                                          }}
                                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-teal-600"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block mb-1">
                                          Fluor. (15W)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            generalRoom.lamps.fluorescente === 0
                                              ? ""
                                              : generalRoom.lamps.fluorescente
                                          }
                                          onChange={(e) => {
                                            const updated = [
                                              {
                                                ...generalRoom,
                                                lamps: {
                                                  ...generalRoom.lamps,
                                                  fluorescente:
                                                    e.target.value === ""
                                                      ? 0
                                                      : Math.max(
                                                          0,
                                                          Number(
                                                            e.target.value,
                                                          ),
                                                        ),
                                                },
                                              },
                                            ];
                                            updateAppliance("iluminacao", {
                                              lightingRooms: updated,
                                            });
                                          }}
                                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-amber-600"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-red-600 dark:text-red-400 font-bold block mb-1">
                                          Incand. (60W)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            generalRoom.lamps.incandescente ===
                                            0
                                              ? ""
                                              : generalRoom.lamps.incandescente
                                          }
                                          onChange={(e) => {
                                            const updated = [
                                              {
                                                ...generalRoom,
                                                lamps: {
                                                  ...generalRoom.lamps,
                                                  incandescente:
                                                    e.target.value === ""
                                                      ? 0
                                                      : Math.max(
                                                          0,
                                                          Number(
                                                            e.target.value,
                                                          ),
                                                        ),
                                                },
                                              },
                                            ];
                                            updateAppliance("iluminacao", {
                                              lightingRooms: updated,
                                            });
                                          }}
                                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-red-600"
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              /* Lighting Mode: Room by room */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    Cômodos Cadastrados
                                  </span>
                                  <button
                                    id="btn-add-lighting-room"
                                    onClick={() => {
                                      const rooms = app.lightingRooms || [];
                                      updateAppliance("iluminacao", {
                                        lightingRooms: [
                                          ...rooms,
                                          createLightingRoom(
                                            `room-${Date.now()}`,
                                          ),
                                        ],
                                      });
                                    }}
                                    className="px-3 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-xs font-bold rounded-lg hover:bg-teal-200 transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Adicionar Cômodo
                                  </button>
                                </div>

                                {(app.lightingRooms || []).map((room, rIdx) => (
                                  <div
                                    key={room.id}
                                    className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <input
                                        type="text"
                                        value={room.name}
                                        onChange={(e) => {
                                          const nextRooms = [
                                            ...(app.lightingRooms || []),
                                          ];
                                          nextRooms[rIdx].name = e.target.value;
                                          updateAppliance("iluminacao", {
                                            lightingRooms: nextRooms,
                                          });
                                        }}
                                        className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-hidden"
                                      />
                                      {(app.lightingRooms || []).length > 1 && (
                                        <button
                                          onClick={() => {
                                            const nextRooms = (
                                              app.lightingRooms || []
                                            ).filter((_, i) => i !== rIdx);
                                            updateAppliance("iluminacao", {
                                              lightingRooms: nextRooms,
                                            });
                                          }}
                                          className="text-red-500 hover:text-red-700 p-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                      <div>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                          Horas/dia
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="24"
                                          value={
                                            room.hoursPerDay === 0
                                              ? ""
                                              : room.hoursPerDay
                                          }
                                          onChange={(e) => {
                                            const nextRooms = [
                                              ...(app.lightingRooms || []),
                                            ];
                                            nextRooms[rIdx].hoursPerDay =
                                              e.target.value === ""
                                                ? 0
                                                : Number(e.target.value);
                                            updateAppliance("iluminacao", {
                                              lightingRooms: nextRooms,
                                            });
                                          }}
                                          className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                          Dias/mês
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="30"
                                          value={
                                            room.frequency === 0
                                              ? ""
                                              : room.frequency
                                          }
                                          onChange={(e) => {
                                            const nextRooms = [
                                              ...(app.lightingRooms || []),
                                            ];
                                            nextRooms[rIdx].frequency =
                                              e.target.value === ""
                                                ? 0
                                                : Number(e.target.value);
                                            updateAppliance("iluminacao", {
                                              lightingRooms: nextRooms,
                                            });
                                          }}
                                          className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">
                                          LED (9W)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            room.lamps.led === 0
                                              ? ""
                                              : room.lamps.led
                                          }
                                          onChange={(e) => {
                                            const nextRooms = [
                                              ...(app.lightingRooms || []),
                                            ];
                                            nextRooms[rIdx].lamps.led =
                                              e.target.value === ""
                                                ? 0
                                                : Math.max(
                                                    0,
                                                    Number(e.target.value),
                                                  );
                                            updateAppliance("iluminacao", {
                                              lightingRooms: nextRooms,
                                            });
                                          }}
                                          className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-teal-600"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                                          Fluor. (15W)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            room.lamps.fluorescente === 0
                                              ? ""
                                              : room.lamps.fluorescente
                                          }
                                          onChange={(e) => {
                                            const nextRooms = [
                                              ...(app.lightingRooms || []),
                                            ];
                                            nextRooms[rIdx].lamps.fluorescente =
                                              e.target.value === ""
                                                ? 0
                                                : Math.max(
                                                    0,
                                                    Number(e.target.value),
                                                  );
                                            updateAppliance("iluminacao", {
                                              lightingRooms: nextRooms,
                                            });
                                          }}
                                          className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-amber-600"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold block">
                                          Incand. (60W)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            room.lamps.incandescente === 0
                                              ? ""
                                              : room.lamps.incandescente
                                          }
                                          onChange={(e) => {
                                            const nextRooms = [
                                              ...(app.lightingRooms || []),
                                            ];
                                            nextRooms[
                                              rIdx
                                            ].lamps.incandescente =
                                              e.target.value === ""
                                                ? 0
                                                : Math.max(
                                                    0,
                                                    Number(e.target.value),
                                                  );
                                            updateAppliance("iluminacao", {
                                              lightingRooms: nextRooms,
                                            });
                                          }}
                                          className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-red-600"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : isShower ? (
                          /* Dedicated Shower Module: General House Average vs Detailed per Resident Bather */
                          <div className="space-y-4">
                            {/* Mode Switcher */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-teal-50/60 dark:bg-teal-950/20 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800/60">
                              <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  Como prefere cadastrar o perfil de banho da sua residência?
                                </span>
                              </div>
                              <div className="flex rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowerMode("general");
                                    const currentDetails = app.showerDetails || {
                                      mode: "general",
                                      defaultSetting: "inverno",
                                      averageMinutesPerBath: 12,
                                      bathsPerDayPerPerson: 1,
                                      bathers: []
                                    };
                                    const avgMinutes = currentDetails.averageMinutesPerBath || 12;
                                    const bathsPerDay = currentDetails.bathsPerDayPerPerson || 1;
                                    const totalDailyMins = (occupants * avgMinutes * bathsPerDay);
                                    updateAppliance("chuveiro", {
                                      hoursPerDay: Math.round((totalDailyMins / 60) * 100) / 100,
                                      frequency: 30,
                                      showerDetails: {
                                        ...currentDetails,
                                        mode: "general"
                                      }
                                    });
                                  }}
                                  className={`px-3 py-1 font-bold rounded-lg transition ${
                                    showerMode === "general"
                                      ? "bg-teal-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                  }`}
                                >
                                  Média Geral da Casa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowerMode("bathers");
                                    const currentDetails = app.showerDetails;
                                    let bathers = currentDetails?.bathers || [];
                                    if (bathers.length === 0) {
                                      bathers = Array.from({ length: Math.max(1, occupants) }, (_, i) => ({
                                        id: `bather-${i + 1}`,
                                        name: `Morador ${i + 1}`,
                                        minutesPerBath: currentDetails?.averageMinutesPerBath || 12,
                                        bathsPerDay: currentDetails?.bathsPerDayPerPerson || 1,
                                        seasonSetting: currentDetails?.defaultSetting || "inverno",
                                        frequency: 30,
                                      }));
                                    }
                                    const totalDailyMinutes = bathers.reduce(
                                      (acc, b) => acc + (b.minutesPerBath * (b.bathsPerDay || 1)),
                                      0
                                    );
                                    updateAppliance("chuveiro", {
                                      hoursPerDay: Math.max(0.1, Math.round((totalDailyMinutes / 60) * 100) / 100),
                                      frequency: 30,
                                      showerDetails: {
                                        ...(currentDetails || { defaultSetting: "inverno" }),
                                        mode: "detailed",
                                        bathers
                                      }
                                    });
                                  }}
                                  className={`px-3 py-1 font-bold rounded-lg transition ${
                                    showerMode === "bathers"
                                      ? "bg-teal-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                  }`}
                                >
                                  Detalhado por Morador ({app.showerDetails?.bathers?.length || occupants} pess.)
                                </button>
                              </div>
                            </div>

                            {showerMode === "general" ? (
                              <div className="space-y-4">
                                {/* Chave mais usual da residência */}
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                                      Posição da Chave Seletora Mais Usual na Casa
                                    </label>
                                    <span className="text-[11px] text-slate-400">Regula a potência da resistência e a quentura da água</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentDetails = app.showerDetails || {
                                          mode: "general",
                                          defaultSetting: "inverno",
                                          averageMinutesPerBath: 12,
                                          bathsPerDayPerPerson: 1,
                                          bathers: []
                                        };
                                        updateAppliance("chuveiro", {
                                          showerDetails: {
                                            ...currentDetails,
                                            defaultSetting: "inverno"
                                          }
                                        });
                                      }}
                                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                                        (app.showerDetails?.defaultSetting || "inverno") === "inverno"
                                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-bold shadow-xs"
                                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                      }`}
                                    >
                                      <Snowflake className="w-4 h-4 text-blue-500 shrink-0" />
                                      <div>
                                        <div className="font-bold text-xs">Inverno / Muito Quente</div>
                                        <div className="text-[10px] text-slate-400">100% da potência elétrica da resistência</div>
                                      </div>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentDetails = app.showerDetails || {
                                          mode: "general",
                                          defaultSetting: "verao",
                                          averageMinutesPerBath: 12,
                                          bathsPerDayPerPerson: 1,
                                          bathers: []
                                        };
                                        updateAppliance("chuveiro", {
                                          showerDetails: {
                                            ...currentDetails,
                                            defaultSetting: "verao"
                                          }
                                        });
                                      }}
                                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                                        app.showerDetails?.defaultSetting === "verao" || app.showerDetails?.defaultSetting === "morno"
                                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs"
                                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                      }`}
                                    >
                                      <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                                      <div>
                                        <div className="font-bold text-xs">Verão / Morno</div>
                                        <div className="text-[10px] text-slate-400">65% da potência (~35% economia direta)</div>
                                      </div>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentDetails = app.showerDetails || {
                                          mode: "general",
                                          defaultSetting: "frio",
                                          averageMinutesPerBath: 12,
                                          bathsPerDayPerPerson: 1,
                                          bathers: []
                                        };
                                        updateAppliance("chuveiro", {
                                          showerDetails: {
                                            ...currentDetails,
                                            defaultSetting: "frio"
                                          }
                                        });
                                      }}
                                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                                        app.showerDetails?.defaultSetting === "frio"
                                          ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-xs"
                                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                      }`}
                                    >
                                      <Droplets className="w-4 h-4 text-teal-500 shrink-0" />
                                      <div>
                                        <div className="font-bold text-xs">Frio / Desligado</div>
                                        <div className="text-[10px] text-slate-400">0% potência (água natural sem aquecimento)</div>
                                      </div>
                                    </button>
                                  </div>
                                </div>

                                {/* Inputs Grid: Tempo de Banho, Banhos/dia, Potência, Quantidade */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  {/* Tempo Médio de Banho por Pessoa */}
                                  <div className="col-span-2 sm:col-span-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                        Tempo Médio / Banho
                                      </label>
                                      <span className="font-black text-teal-600 dark:text-teal-400 text-xs">
                                        {app.showerDetails?.averageMinutesPerBath || 12} min
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      min="1"
                                      max="60"
                                      value={app.showerDetails?.averageMinutesPerBath || 12}
                                      onChange={(e) => {
                                        const mins = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                                        const currentDetails = app.showerDetails || {
                                          mode: "general",
                                          defaultSetting: "inverno",
                                          averageMinutesPerBath: 12,
                                          bathsPerDayPerPerson: 1,
                                          bathers: []
                                        };
                                        const baths = currentDetails.bathsPerDayPerPerson || 1;
                                        const totalHours = ((occupants * mins * baths) / 60);
                                        updateAppliance("chuveiro", {
                                          hoursPerDay: Math.round(totalHours * 100) / 100,
                                          showerDetails: {
                                            ...currentDetails,
                                            averageMinutesPerBath: mins
                                          }
                                        });
                                      }}
                                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white mb-1.5"
                                    />
                                    <input
                                      type="range"
                                      min={4}
                                      max={30}
                                      step={1}
                                      value={app.showerDetails?.averageMinutesPerBath || 12}
                                      onChange={(e) => {
                                        const mins = Number(e.target.value);
                                        const currentDetails = app.showerDetails || {
                                          mode: "general",
                                          defaultSetting: "inverno",
                                          averageMinutesPerBath: 12,
                                          bathsPerDayPerPerson: 1,
                                          bathers: []
                                        };
                                        const baths = currentDetails.bathsPerDayPerPerson || 1;
                                        const totalHours = ((occupants * mins * baths) / 60);
                                        updateAppliance("chuveiro", {
                                          hoursPerDay: Math.round(totalHours * 100) / 100,
                                          showerDetails: {
                                            ...currentDetails,
                                            averageMinutesPerBath: mins
                                          }
                                        });
                                      }}
                                      className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                    />
                                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                                      <span>8 min</span>
                                      <span>12 min</span>
                                      <span>20 min</span>
                                    </div>
                                  </div>

                                  {/* Banhos por Dia por Pessoa */}
                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                      Banhos / Morador / Dia
                                    </label>
                                    <select
                                      value={app.showerDetails?.bathsPerDayPerPerson || 1}
                                      onChange={(e) => {
                                        const baths = Number(e.target.value);
                                        const currentDetails = app.showerDetails || {
                                          mode: "general",
                                          defaultSetting: "inverno",
                                          averageMinutesPerBath: 12,
                                          bathsPerDayPerPerson: 1,
                                          bathers: []
                                        };
                                        const mins = currentDetails.averageMinutesPerBath || 12;
                                        const totalHours = ((occupants * mins * baths) / 60);
                                        updateAppliance("chuveiro", {
                                          hoursPerDay: Math.round(totalHours * 100) / 100,
                                          showerDetails: {
                                            ...currentDetails,
                                            bathsPerDayPerPerson: baths
                                          }
                                        });
                                      }}
                                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                                    >
                                      <option value={1}>1 banho por dia</option>
                                      <option value={2}>2 banhos por dia</option>
                                      <option value={3}>3 banhos por dia</option>
                                    </select>
                                    <span className="text-[10px] text-slate-400 block mt-1">
                                      {occupants} moradores na casa
                                    </span>
                                  </div>

                                  {/* Potência do Chuveiro (W) */}
                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                      Potência Nominal (W)
                                    </label>
                                    <input
                                      type="number"
                                      value={app.powerWatts === 0 ? "" : app.powerWatts}
                                      onChange={(e) =>
                                        updateAppliance("chuveiro", {
                                          powerWatts: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)),
                                          source: "placa"
                                        })
                                      }
                                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                                    />
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {[5500, 6800, 7500].map((w) => (
                                        <button
                                          key={w}
                                          type="button"
                                          onClick={() => updateAppliance("chuveiro", { powerWatts: w, source: "placa" })}
                                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition ${
                                            app.powerWatts === w
                                              ? "bg-teal-600 text-white"
                                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                          }`}
                                        >
                                          {w}W
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Quantidade de Chuveiros na Casa */}
                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                      Qtd. de Chuveiros
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={app.quantity || 1}
                                      onChange={(e) => {
                                        const q = Math.max(1, Number(e.target.value) || 1);
                                        updateAppliance("chuveiro", {
                                          quantity: q,
                                          quantityUsed: Math.min(app.quantityUsed || 1, q)
                                        });
                                      }}
                                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-1">
                                      {app.quantity && app.quantity > 1 ? `${app.quantity} banheiros com ducha` : "1 chuveiro instalado"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Modo Detalhado por Morador */
                              <div className="space-y-3.5">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Cada pessoa tem preferências distintas de tempo e temperatura do banho. Configure o hábito individual de cada um:
                                </p>

                                {/* Bathers List */}
                                <div className="space-y-2.5">
                                  {(app.showerDetails?.bathers || []).map((bather, bIdx) => {
                                    const showerPower = app.powerWatts || 5500;
                                    const mult = bather.seasonSetting === "verao" ? 0.65 : bather.seasonSetting === "frio" ? 0.0 : 1.0;
                                    const bDailyHours = (bather.minutesPerBath * (bather.bathsPerDay || 1)) / 60;
                                    const bKwh = Math.round(((showerPower * mult) / 1000) * bDailyHours * (bather.frequency || 30) * 10) / 10;
                                    const effectiveRate = monthlyKwh > 0 ? billValue / monthlyKwh : 0.85;
                                    const bCost = Math.round(bKwh * effectiveRate * 100) / 100;

                                    return (
                                      <div
                                        key={bather.id || `bather-${bIdx}`}
                                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3"
                                      >
                                        {/* Bather Header */}
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 flex-1 max-w-xs">
                                            <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xs shrink-0">
                                              {bIdx + 1}
                                            </div>
                                            <input
                                              type="text"
                                              value={bather.name}
                                              onChange={(e) => {
                                                const nextBathers = [...(app.showerDetails?.bathers || [])];
                                                nextBathers[bIdx] = { ...bather, name: e.target.value };
                                                updateAppliance("chuveiro", {
                                                  showerDetails: {
                                                    ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                    mode: "detailed",
                                                    bathers: nextBathers
                                                  }
                                                });
                                              }}
                                              className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-teal-500 outline-none w-full"
                                              placeholder={`Morador ${bIdx + 1}`}
                                            />
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                                              ~{formatNumber(bKwh)} kWh/mês ({formatBRL(bCost)})
                                            </span>
                                            {(app.showerDetails?.bathers?.length || 0) > 1 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextBathers = (app.showerDetails?.bathers || []).filter((_, i) => i !== bIdx);
                                                  const totalDailyMins = nextBathers.reduce(
                                                    (acc, b) => acc + (b.minutesPerBath * (b.bathsPerDay || 1)),
                                                    0
                                                  );
                                                  updateAppliance("chuveiro", {
                                                    hoursPerDay: Math.max(0.1, Math.round((totalDailyMins / 60) * 100) / 100),
                                                    showerDetails: {
                                                      ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                      mode: "detailed",
                                                      bathers: nextBathers
                                                    }
                                                  });
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 transition"
                                                title="Remover banhista"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Bather Controls Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                          {/* Tempo do banho com slider */}
                                          <div>
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                              <span>Tempo de Banho</span>
                                              <span className="font-bold text-teal-600 dark:text-teal-400">{bather.minutesPerBath} min</span>
                                            </div>
                                            <input
                                              type="range"
                                              min={4}
                                              max={30}
                                              step={1}
                                              value={bather.minutesPerBath}
                                              onChange={(e) => {
                                                const mins = Number(e.target.value);
                                                const nextBathers = [...(app.showerDetails?.bathers || [])];
                                                nextBathers[bIdx] = { ...bather, minutesPerBath: mins };
                                                const totalDailyMins = nextBathers.reduce(
                                                  (acc, b) => acc + (b.minutesPerBath * (b.bathsPerDay || 1)),
                                                  0
                                                );
                                                updateAppliance("chuveiro", {
                                                  hoursPerDay: Math.max(0.1, Math.round((totalDailyMins / 60) * 100) / 100),
                                                  showerDetails: {
                                                    ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                    mode: "detailed",
                                                    bathers: nextBathers
                                                  }
                                                });
                                              }}
                                              className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                                            />
                                          </div>

                                          {/* Banhos por dia */}
                                          <div>
                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                              Banhos por Dia
                                            </span>
                                            <div className="flex gap-1">
                                              {[1, 2, 3].map((count) => (
                                                <button
                                                  key={count}
                                                  type="button"
                                                  onClick={() => {
                                                    const nextBathers = [...(app.showerDetails?.bathers || [])];
                                                    nextBathers[bIdx] = { ...bather, bathsPerDay: count };
                                                    const totalDailyMins = nextBathers.reduce(
                                                      (acc, b) => acc + (b.minutesPerBath * (b.bathsPerDay || 1)),
                                                      0
                                                    );
                                                    updateAppliance("chuveiro", {
                                                      hoursPerDay: Math.max(0.1, Math.round((totalDailyMins / 60) * 100) / 100),
                                                      showerDetails: {
                                                        ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                        mode: "detailed",
                                                        bathers: nextBathers
                                                      }
                                                    });
                                                  }}
                                                  className={`flex-1 py-1 rounded-lg font-bold text-xs transition ${
                                                    bather.bathsPerDay === count
                                                      ? "bg-teal-600 text-white shadow-xs"
                                                      : "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400"
                                                  }`}
                                                >
                                                  {count}x
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Chave que este morador usa */}
                                          <div>
                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                              Chave Usada por Esta Pessoa
                                            </span>
                                            <div className="flex gap-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextBathers = [...(app.showerDetails?.bathers || [])];
                                                  nextBathers[bIdx] = { ...bather, seasonSetting: "inverno" };
                                                  updateAppliance("chuveiro", {
                                                    showerDetails: {
                                                      ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                      mode: "detailed",
                                                      bathers: nextBathers
                                                    }
                                                  });
                                                }}
                                                className={`flex-1 py-1 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                                                  bather.seasonSetting === "inverno"
                                                    ? "bg-blue-600 text-white shadow-xs"
                                                    : "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400"
                                                }`}
                                                title="Inverno (100% de potência)"
                                              >
                                                <Snowflake className="w-3 h-3" />
                                                <span>Inverno</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextBathers = [...(app.showerDetails?.bathers || [])];
                                                  nextBathers[bIdx] = { ...bather, seasonSetting: "verao" };
                                                  updateAppliance("chuveiro", {
                                                    showerDetails: {
                                                      ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                      mode: "detailed",
                                                      bathers: nextBathers
                                                    }
                                                  });
                                                }}
                                                className={`flex-1 py-1 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                                                  bather.seasonSetting === "verao" || bather.seasonSetting === "morno"
                                                    ? "bg-amber-500 text-white shadow-xs"
                                                    : "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400"
                                                }`}
                                                title="Verão (65% de potência)"
                                              >
                                                <Sun className="w-3 h-3" />
                                                <span>Verão</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextBathers = [...(app.showerDetails?.bathers || [])];
                                                  nextBathers[bIdx] = { ...bather, seasonSetting: "frio" };
                                                  updateAppliance("chuveiro", {
                                                    showerDetails: {
                                                      ...(app.showerDetails || { defaultSetting: "inverno" }),
                                                      mode: "detailed",
                                                      bathers: nextBathers
                                                    }
                                                  });
                                                }}
                                                className={`flex-1 py-1 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                                                  bather.seasonSetting === "frio"
                                                    ? "bg-teal-600 text-white shadow-xs"
                                                    : "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400"
                                                }`}
                                                title="Frio / Desligado (0% de potência)"
                                              >
                                                <Droplets className="w-3 h-3" />
                                                <span>Frio</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Add Bather Button & Power settings */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentBathers = app.showerDetails?.bathers || [];
                                      const nextIndex = currentBathers.length + 1;
                                      const newBather: ShowerBatherProfile = {
                                        id: `bather-${Date.now()}`,
                                        name: `Morador ${nextIndex}`,
                                        minutesPerBath: 12,
                                        bathsPerDay: 1,
                                        seasonSetting: "inverno",
                                        frequency: 30
                                      };
                                      const nextBathers = [...currentBathers, newBather];
                                      const totalDailyMins = nextBathers.reduce(
                                        (acc, b) => acc + (b.minutesPerBath * (b.bathsPerDay || 1)),
                                        0
                                      );
                                      updateAppliance("chuveiro", {
                                        hoursPerDay: Math.max(0.1, Math.round((totalDailyMins / 60) * 100) / 100),
                                        showerDetails: {
                                          ...(app.showerDetails || { defaultSetting: "inverno" }),
                                          mode: "detailed",
                                          bathers: nextBathers
                                        }
                                      });
                                    }}
                                    className="px-3.5 py-2 rounded-xl border border-dashed border-teal-500/80 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Adicionar Banhista / Visita Frequente
                                  </button>

                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 font-medium">Potência do Chuveiro:</span>
                                    <input
                                      type="number"
                                      value={app.powerWatts || 5500}
                                      onChange={(e) => updateAppliance("chuveiro", { powerWatts: Math.max(0, Number(e.target.value)), source: "placa" })}
                                      className="w-20 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-center"
                                    />
                                    <span className="text-slate-400">Watts</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard Appliance Inputs */
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                            {/* Quantity */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                Quantidade
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={app.quantity === 0 ? "" : app.quantity}
                                onChange={(e) => {
                                  const q =
                                    e.target.value === ""
                                      ? 0
                                      : Number(e.target.value);
                                  updateAppliance(app.key, {
                                    quantity: q,
                                    quantityUsed: Math.min(
                                      app.quantityUsed,
                                      q || 1,
                                    ),
                                  });
                                }}
                                onBlur={() => {
                                  if (!app.quantity || app.quantity < 1) {
                                    updateAppliance(app.key, {
                                      quantity: 1,
                                      quantityUsed: Math.min(
                                        app.quantityUsed,
                                        1,
                                      ),
                                    });
                                  }
                                }}
                                className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Simultaneous Use */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                Em uso simultâneo
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={app.quantity || 1}
                                value={
                                  app.quantityUsed === 0 ? "" : app.quantityUsed
                                }
                                onChange={(e) => {
                                  const qUsed =
                                    e.target.value === ""
                                      ? 0
                                      : Number(e.target.value);
                                  updateAppliance(app.key, {
                                    quantityUsed: qUsed,
                                  });
                                }}
                                onBlur={() => {
                                  if (
                                    !app.quantityUsed ||
                                    app.quantityUsed < 1
                                  ) {
                                    updateAppliance(app.key, {
                                      quantityUsed: 1,
                                    });
                                  } else if (
                                    app.quantityUsed > (app.quantity || 1)
                                  ) {
                                    updateAppliance(app.key, {
                                      quantityUsed: app.quantity || 1,
                                    });
                                  }
                                }}
                                className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Duration per day (Hours or Minutes Switcher) */}
                            <div className="col-span-2">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                  {isCyclic
                                    ? "Horas/dia disponível"
                                    : "Tempo de uso/dia"}
                                </label>
                                <div className="flex text-[10px] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
                                  <button
                                    onClick={() => {
                                      if (app.usageUnit === "minutos") {
                                        updateAppliance(app.key, {
                                          usageUnit: "horas",
                                          hoursPerDay:
                                            Math.round(
                                              (app.hoursPerDay / 60) * 10,
                                            ) / 10,
                                        });
                                      }
                                    }}
                                    className={`px-1.5 py-0.5 font-bold ${
                                      app.usageUnit !== "minutos"
                                        ? "bg-teal-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                                    }`}
                                  >
                                    Horas
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (app.usageUnit !== "minutos") {
                                        updateAppliance(app.key, {
                                          usageUnit: "minutos",
                                          hoursPerDay: Math.round(
                                            app.hoursPerDay * 60,
                                          ),
                                        });
                                      }
                                    }}
                                    className={`px-1.5 py-0.5 font-bold ${
                                      app.usageUnit === "minutos"
                                        ? "bg-teal-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                                    }`}
                                  >
                                    Minutos
                                  </button>
                                </div>
                              </div>
                              <input
                                type="number"
                                step={app.usageUnit === "minutos" ? "1" : "0.1"}
                                min="0"
                                max={app.usageUnit === "minutos" ? 1440 : 24}
                                value={
                                  app.hoursPerDay === 0 ? "" : app.hoursPerDay
                                }
                                onChange={(e) =>
                                  updateAppliance(app.key, {
                                    hoursPerDay:
                                      e.target.value === ""
                                        ? 0
                                        : Math.max(0, Number(e.target.value)),
                                  })
                                }
                                className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Days / Month */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                                  Dias/mês
                                </label>
                              </div>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={app.frequency === 0 ? "" : app.frequency}
                                onChange={(e) =>
                                  updateAppliance(app.key, {
                                    frequency:
                                      e.target.value === ""
                                        ? 0
                                        : Math.min(
                                            30,
                                            Math.max(0, Number(e.target.value)),
                                          ),
                                  })
                                }
                                className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Power (Watts) */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                Potência (W) <span className="font-normal text-[10px] ml-1 text-slate-400">(Ajustável)</span>
                              </label>
                              <input
                                type="number"
                                value={
                                  app.powerWatts === 0 ? "" : app.powerWatts
                                }
                                onChange={(e) =>
                                  updateAppliance(app.key, {
                                    powerWatts:
                                      e.target.value === ""
                                        ? 0
                                        : Math.max(0, Number(e.target.value)),
                                    source: "placa",
                                  })
                                }
                                onBlur={() => {
                                  if (!app.powerWatts || app.powerWatts < 1) {
                                    updateAppliance(app.key, { powerWatts: 1 });
                                  }
                                }}
                                className={`w-full p-2 rounded-xl bg-white dark:bg-slate-800 border font-bold text-slate-900 dark:text-white ${
                                  app.source === "placa"
                                    ? "border-teal-500 text-teal-700 dark:text-teal-300"
                                    : "border-slate-300 dark:border-slate-700"
                                }`}
                              />
                            </div>

                            {/* Quick Presets for Carregador de Carro Elétrico */}
                            {isEvCharger && (
                              <div className="col-span-2 sm:col-span-4 lg:col-span-6 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-2 mt-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Potências Comuns de Carregador Residencial / Wallbox:
                                  </span>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {[
                                      { w: 3500, label: "3.500W (16A Mono · Lento)" },
                                      { w: 7000, label: "7.000W (32A Mono · Padrão)" },
                                      { w: 11000, label: "11.000W (16A Trifásico)" },
                                      { w: 22000, label: "22.000W (32A Trifásico)" },
                                    ].map((item) => (
                                      <button
                                        key={item.w}
                                        type="button"
                                        onClick={() =>
                                          updateAppliance("carro-eletrico", {
                                            powerWatts: item.w,
                                            source: "placa",
                                          })
                                        }
                                        className={`text-[10px] px-2 py-1 rounded-lg font-bold transition ${
                                          app.powerWatts === item.w
                                            ? "bg-teal-600 text-white shadow-xs"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Nota física: Reduzir a corrente (ex: de 32A para 16A) reduz a potência pela metade e dobra proporcionalmente o tempo de recarga para repor a mesma energia na bateria (E = P × t). A redução do efeito Joule na fiação predial poupa apenas ~R$ 1 a R$ 2,50/mês. O benefício da corrente moderada é segurança elétrica e proteção térmica da instalação.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Seletor de Classe de Eficiência Energética (Inmetro / Procel) - Expande ao clicar */}
                        {app.key !== "iluminacao" && app.key !== "chuveiro" && (
                          <EnergyClassSelector
                            value={
                              app.efficiencyClass ||
                              (app.inverterTechnology ? "A+++" : "A")
                            }
                            onChange={(newClass) =>
                              updateAppliance(app.key, {
                                efficiencyClass: newClass,
                                inverterTechnology:
                                  newClass === "A+++" ||
                                  newClass === "A++" ||
                                  newClass === "A+",
                              })
                            }
                            theme="teal"
                            compact
                            applianceKey={app.key}
                            idPrefix={`diag-${app.key}`}
                            label="Classe do equipamento"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!hasValidAppliance && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Selecione ao menos um aparelho presente com tempo de uso para
                  calcular o consumo da casa.
                </span>
              </div>
            )}

            <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                id="btn-wizard-step2-back"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Voltar aos Dados Iniciais</span>
              </button>
              <button
                id="btn-wizard-step2-next"
                disabled={!hasValidAppliance}
                onClick={() => {
                  if (hasValidAppliance) setStep(3);
                }}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 ${
                  hasValidAppliance
                    ? "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                }`}
              >
                <span>Avançar para Segurança</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: ELECTRICAL SAFETY AUDIT */}
      {step === 3 && (
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          {/* Real-Time Safety Score Bar */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              safetyAssessment.level === "critico"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                : safetyAssessment.level === "medio"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-800 text-amber-950 dark:text-amber-100"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-xs ${
                  safetyAssessment.level === "critico"
                    ? "bg-rose-600 text-white"
                    : safetyAssessment.level === "medio"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                }`}
              >
                {safetyAssessment.score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Índice de Segurança Elétrica
                  </span>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      safetyAssessment.level === "critico"
                        ? "bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200"
                        : safetyAssessment.level === "medio"
                          ? "bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200"
                          : "bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    {safetyAssessment.label}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {safetyAssessment.level === "critico"
                    ? "Existem pontos com potencial de superaquecimento ou choque que exigem atenção prioritária."
                    : safetyAssessment.level === "medio"
                      ? "Instalação funcional, mas ausência de proteção residual ou aterramento reduz a proteção dos equipamentos e moradores."
                      : "Instalação sem anomalias aparentes informadas. Padrão adequado para avançar ao diagnóstico."}
                </p>
              </div>
            </div>

            {/* Quick Button to Clear/Confirm all safe */}
            <button
              type="button"
              id="btn-safety-all-clear"
              onClick={() => {
                setSafety({
                  riskSigns: [],
                  grounding: "sim",
                  dr: "sim",
                  breakerCount: safety.breakerCount || 6,
                });
                setHasSafetyRisk(false);
              }}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold shrink-0 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tudo em Ordem (Nenhum Risco)
            </button>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 text-red-900 dark:text-red-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm sm:text-base">
                Norma NBR 5410: Economizar Nunca Deve Arriscar Sua Vida
              </h3>
              <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                Observe sem tocar em fios e sem abrir o quadro de distribuição. Se houver qualquer sinal de perigo, a prioridade máxima é proteger sua família antes de buscar economia.
              </p>
            </div>
          </div>

          {/* Risk Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sinais Visíveis de Risco na Instalação (Marque se perceber algum):
              </h3>
              {safety.riskSigns.length > 0 && (
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {safety.riskSigns.length} risco{safety.riskSigns.length > 1 ? "s" : ""} marcado{safety.riskSigns.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RISK_SIGNS.map((sign, idx) => {
                const isSelected = safety.riskSigns.includes(sign);
                return (
                  <button
                    key={idx}
                    id={`btn-risk-sign-${idx}`}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? safety.riskSigns.filter((s) => s !== sign)
                        : [...safety.riskSigns, sign];
                      setSafety({ ...safety, riskSigns: next });
                      setHasSafetyRisk(next.length > 0);
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                      isSelected
                        ? "bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-red-600 border-red-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                      {sign}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grounding & DR Presence Question */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Sua casa possui Aterramento Elétrico (Fio Terra no pino do
                meio)?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "sim" as const, label: "Sim" },
                  { id: "nao" as const, label: "Não" },
                  { id: "nao-sei" as const, label: "Não sei" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    id={`btn-safety-grounding-${opt.id}`}
                    onClick={() => setSafety({ ...safety, grounding: opt.id })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      safety.grounding === opt.id
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Existe Dispositivo DR (com botão "TESTE" no quadro)?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "sim" as const, label: "Sim" },
                  { id: "nao" as const, label: "Não" },
                  { id: "nao-sei" as const, label: "Não sei" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    id={`btn-safety-dr-${opt.id}`}
                    onClick={() => setSafety({ ...safety, dr: opt.id })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      safety.dr === opt.id
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              id="btn-wizard-step3-back"
              onClick={() => setStep(2)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-200 transition flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Aparelhos
            </button>
            <button
              id="btn-wizard-calculate"
              onClick={handleCalculate}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current shrink-0" />
              <span>Gerar Relatório Completo</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DIAGNOSIS REPORT CONSOLIDATED */}
      {step === 4 && result && (
        <div
          id="diagnosis-report-printable"
          className="space-y-8 animate-in fade-in duration-300"
        >
          {/* Header Summary Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Relatório Técnico de Eficiência Energética
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] mt-1">
                  Resultado do Diagnóstico
                </h2>
                <p className="text-xs text-slate-500">
                  Realizado em {new Date().toLocaleDateString("pt-BR")} ·
                  Residência de {occupants} pessoas
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-share-diagnosis-main"
                  onClick={() => {
                    if (onShareDiagnosis && result) {
                      const diagToShare: SavedDiagnosis = {
                        id: currentDiagId || `diag-${Date.now()}`,
                        createdAt: new Date().toISOString(),
                        input: {
                          billValue: Math.max(10, billValue),
                          monthlyKwh: Math.max(10, monthlyKwh),
                          occupants: Math.max(1, occupants),
                          appliances,
                          detailed: true,
                          hasSafetyRisk:
                            hasSafetyRisk || safety.riskSigns.length > 0,
                          safety,
                        },
                        result,
                        sourceBillScanId: selectedBillId || undefined,
                        kind: "principal",
                      };
                      onShareDiagnosis(diagToShare);
                    }
                  }}
                  className="px-4 py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-xl border border-teal-200 dark:border-teal-800 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </button>
                <button
                  id="btn-print-diagnosis"
                  onClick={() => {
                    try {
                      window.print();
                    } catch (err) {
                      console.warn("Impressão nativa cancelada ou indisponível:", err);
                    } finally {
                      setTimeout(() => {
                        document.body.style.pointerEvents = "";
                        document.documentElement.style.pointerEvents = "";
                        if (typeof window !== "undefined") window.focus();
                      }, 500);
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  id="btn-save-diagnosis-main"
                  onClick={handleSave}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSaved
                      ? "bg-teal-700 opacity-95"
                      : "bg-teal-600 hover:bg-teal-700"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaved
                    ? "Diagnóstico Salvo no Histórico"
                    : "Salvar no Histórico"}
                </button>
                <button
                  id="btn-export-pdf"
                  disabled={isExportingPdf}
                  onClick={async () => {
                    if (result && !isExportingPdf) {
                      setIsExportingPdf(true);
                      try {
                        const diagToExport: SavedDiagnosis = {
                          id: currentDiagId || `diag-${Date.now()}`,
                          createdAt: new Date().toISOString(),
                          input: {
                            billValue: Math.max(10, billValue),
                            monthlyKwh: Math.max(10, monthlyKwh),
                            occupants: Math.max(1, occupants),
                            appliances,
                            detailed: true,
                            hasSafetyRisk:
                              hasSafetyRisk || safety.riskSigns.length > 0,
                            safety,
                          },
                          result,
                          sourceBillScanId: selectedBillId || undefined,
                          kind: "principal",
                        };
                        await downloadPdfReport({ type: "diagnosis", diagnosis: diagToExport });
                      } catch (err) {
                        console.error("Erro ao exportar PDF:", err);
                      } finally {
                        setIsExportingPdf(false);
                        if (typeof window !== "undefined") window.focus();
                      }
                    }
                  }}
                  className={`px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer no-print whitespace-nowrap ${
                    isExportingPdf ? "opacity-75 cursor-wait" : ""
                  }`}
                >
                  <Download className={`w-4 h-4 ${isExportingPdf ? "animate-pulse" : ""}`} />
                  {isExportingPdf ? "Baixando PDF..." : "Baixar PDF"}
                </button>
              </div>
            </div>

            {/* Critical Safety Notice if triggered */}
            {result.safetyAlert && (
              <div className="p-5 sm:p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 space-y-4">
                <div className="flex items-center gap-2.5 text-red-700 dark:text-red-400 font-bold text-base">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>
                    Alerta de Segurança Elétrica: Riscos e Anomalias
                    Identificadas
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-red-950 dark:text-red-200/90 leading-relaxed">
                  Foram identificados pontos de risco na instalação elétrica que
                  exigem atenção imediata para prevenir acidentes, choques e
                  princípios de incêndio. Confira as orientações específicas
                  para cada item detectado:
                </p>

                {/* Specific Recommendations for Each Marked Risk */}
                <div className="space-y-3 pt-2">
                  {safety.riskSigns &&
                    safety.riskSigns.map((sign, idx) => {
                      const item = RISK_SIGN_RECOMMENDATIONS[sign];
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-200 dark:border-red-900/60 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs sm:text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                            <span>{item?.title || sign}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                            {item?.recommendation ||
                              "Solicite a inspeção imediata de um eletricista habilitado para este ponto."}
                          </p>
                        </div>
                      );
                    })}

                  {/* Grounding specific alert */}
                  {(safety.grounding === "nao" ||
                    safety.grounding === "nao-sei") && (
                    <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-300 dark:border-amber-900/60 shadow-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Ausência ou Incerteza de Aterramento (Fio Terra)
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                        Chuveiros elétricos, máquinas de lavar e aparelhos com
                        partes metálicas exigem aterramento efetivo. Sem o fio
                        terra ligado à haste de aterramento, qualquer fuga de
                        corrente no aparelho pode passar pelo corpo do morador
                        em vez de ser descarregada com segurança no solo.
                      </p>
                    </div>
                  )}

                  {/* DR specific alert */}
                  {(safety.dr === "nao" || safety.dr === "nao-sei") && (
                    <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-300 dark:border-amber-900/60 shadow-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Quadro sem Dispositivo DR (Diferencial Residual)
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                        O Dispositivo DR (obrigatório pela norma NBR 5410 em
                        áreas úmidas) desliga o circuito em milissegundos ao
                        detectar corrente escapando para a terra ou para o corpo
                        de alguém. Sua instalação no quadro é a proteção mais
                        eficaz contra choques elétricos graves.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-red-200 dark:border-red-800/80 text-[11px] text-red-800 dark:text-red-300 font-medium">
                  Orientação geral: Nunca tente resolver desarmes aumentando o
                  disjuntor sem antes trocar os fios para uma bitola compatível.
                  Contrate sempre um eletricista habilitado.
                </div>
              </div>
            )}

            {/* Confidence & Coherence Evaluation */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-teal-600" />
                    Confiabilidade da Estimativa:{" "}
                    <span
                      className={`uppercase font-black ${
                        result.confidence === "alta"
                          ? "text-teal-600"
                          : result.confidence === "média"
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {result.confidence} ({result.confidenceScore}%)
                    </span>
                  </span>
                  <button
                    type="button"
                    id="btn-help-confiabilidade"
                    onClick={() =>
                      setExplanatoryTopic(DIAGNOSIS_EXPLANATIONS.confiabilidade)
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer ml-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Como é calculada?
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {describeConsumptionDifference(
                    result.totalEstimated,
                    monthlyKwh,
                    settings.simpleLanguage,
                  )}
                </p>
              </div>
              <button
                id="btn-re-edit-diagnosis"
                onClick={() => setStep(2)}
                className="self-start sm:self-auto text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Revisar Aparelhos
              </button>
            </div>

            {/* Household Efficiency Rating Badge (Procel / Inmetro Style) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shadow-md border-2 border-white/20 ${homeEfficiencyRating.bg}`}
                  >
                    <span className="text-2xl font-black leading-none">{homeEfficiencyRating.grade}</span>
                    <span className="text-[9px] uppercase tracking-tighter opacity-80">Classe</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-widest text-slate-300 font-bold">
                        Índice de Eficiência Residencial
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${homeEfficiencyRating.bg} text-white`}>
                        {homeEfficiencyRating.label}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black font-['Space_Grotesk'] mt-0.5">
                      Residência {homeEfficiencyRating.label}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      {homeEfficiencyRating.description}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 bg-white/10 p-3.5 rounded-2xl border border-white/10">
                  <span className="text-[11px] text-slate-300 block font-medium">Potencial de Economia Viável</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-['Space_Grotesk']">
                    Até {homeEfficiencyRating.savingsRange}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    sem perda de conforto
                  </span>
                </div>
              </div>

              {/* Procel Grade Scale Indicator */}
              <div className="grid grid-cols-5 gap-1.5 pt-2">
                {[
                  { grade: "A", label: "Excelente", color: "bg-emerald-600" },
                  { grade: "B", label: "Eficiente", color: "bg-teal-500" },
                  { grade: "C", label: "Típico", color: "bg-amber-500" },
                  { grade: "D", label: "Atenção", color: "bg-amber-600" },
                  { grade: "E", label: "Crítico", color: "bg-rose-600" },
                ].map((item) => {
                  const isCurrent = homeEfficiencyRating.grade === item.grade;
                  return (
                    <div
                      key={item.grade}
                      className={`p-2 rounded-xl text-center transition-all ${
                        isCurrent
                          ? `${item.color} text-white ring-2 ring-white shadow-md scale-105`
                          : "bg-white/10 text-slate-400 opacity-60"
                      }`}
                    >
                      <span className="text-sm font-black block">{item.grade}</span>
                      <span className="text-[9px] font-semibold hidden sm:block truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500">Consumo Faturado</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                  {formatNumber(monthlyKwh)}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    kWh
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {formatBRL(billValue)}/mês
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500">
                  Estimativa Aparelhos
                </span>
                <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-['Space_Grotesk']">
                  {formatNumber(result.totalEstimated)}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    kWh
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {result.estimates.length} itens ativos
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500">Tarifa Efetiva</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                  {formatBRL(result.effectiveCostPerKwh)}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    /kWh
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Custo marginal médio
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500">
                  Por Morador ({occupants} pess.)
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                  {formatNumber(result.kwhPerPerson)}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    kWh
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {formatBRL(result.costPerPerson)}/morador
                </p>
              </div>
            </div>

            {/* Visual Chart: Ranking dos Aparelhos (Versão Original Limpa) */}
            {result.topContributors.length > 0 && (
              <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Ranking de Consumo por Aparelho
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Distribuição estimada das maiores parcelas de energia da residência ({formatNumber(result.totalEstimated)} kWh totais)
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-1 rounded-full shrink-0">
                    {result.topContributors.length} aparelhos
                  </span>
                </div>

                {/* Ranking de Aparelhos em Barras Horizontais Conforme Regra de Identidade e Legibilidade */}
                <div className="space-y-3 pt-2">
                  {result.topContributors.slice(0, 6).map((c, idx) => {
                    const totalKwh = Math.max(1, result.totalEstimated);
                    const pct = Math.round((c.monthlyKwh / totalKwh) * 100);
                    const cost = c.monthlyKwh * result.effectiveCostPerKwh;
                    return (
                      <div
                        key={c.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 transition-all hover:border-teal-400 dark:hover:border-teal-500"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-teal-600/15 text-teal-700 dark:text-teal-300 font-black text-[11px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              {c.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-x-2.5 gap-y-1 self-start sm:self-auto shrink-0 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {formatNumber(c.monthlyKwh)} kWh/mês
                            </span>
                            <span className="text-xs font-black text-teal-700 dark:text-teal-400">
                              {formatBRL(cost)}/mês
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800/60 shrink-0">
                              {pct}% do total
                            </span>
                          </div>
                        </div>

                        {/* Barra Horizontal Elegante em Tom Teal/Esmeralda */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Functional Category Breakdown Cards */}
            {categoryBreakdown.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Distribuição do Consumo por Setor da Casa
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Onde sua energia está concentrada
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.key}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {cat.label}
                        </span>
                        <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                          {cat.pct}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, cat.pct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>{formatNumber(cat.kwh)} kWh/mês</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {formatBRL(cat.cost)}/mês
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Savings Potential Box (No double counting) */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-500/15 via-teal-500/10 to-transparent border border-teal-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                  <TrendingDown className="w-5 h-5" />
                  Potencial de Economia Mensal Calibrado (Sem Dupla Contagem)
                </div>
                <button
                  type="button"
                  id="btn-help-faixas-economia"
                  onClick={() =>
                    setExplanatoryTopic(DIAGNOSIS_EXPLANATIONS.faixas_economia)
                  }
                  className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-300 font-bold hover:underline cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Entenda as Faixas
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                As faixas abaixo representam a economia que sua residência pode
                atingir ajustando os hábitos nos maiores consumidores,
                respeitando o limite físico conservador de até 35% da fatura:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 block">
                    Conservador
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {Array.isArray(result.savings?.conservative)
                      ? `${result.savings.conservative[0]}–${result.savings.conservative[1]} kWh`
                      : "10–20 kWh"}
                  </div>
                  <span className="text-xs text-teal-600 font-semibold">
                    {Array.isArray(result.savings?.conservative)
                      ? `${formatBRL(result.savings.conservative[0] * (result.effectiveCostPerKwh || 0.88))} – ${formatBRL(result.savings.conservative[1] * (result.effectiveCostPerKwh || 0.88))}/mês`
                      : "Economia mensal"}
                  </span>
                </div>

                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-400 dark:border-teal-700">
                  <span className="text-[11px] text-teal-800 dark:text-teal-300 font-bold block">
                    Provável (Recomendado)
                  </span>
                  <div className="text-lg font-black text-teal-800 dark:text-teal-200">
                    {Array.isArray(result.savings?.probable)
                      ? `${result.savings.probable[0]}–${result.savings.probable[1]} kWh`
                      : "15–30 kWh"}
                  </div>
                  <span className="text-xs text-teal-700 dark:text-teal-300 font-bold">
                    {Array.isArray(result.savings?.probable)
                      ? `${formatBRL(result.savings.probable[0] * (result.effectiveCostPerKwh || 0.88))} – ${formatBRL(result.savings.probable[1] * (result.effectiveCostPerKwh || 0.88))}/mês`
                      : "Economia recomendada"}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 block">
                    Otimista (Com Trocas)
                  </span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {Array.isArray(result.savings?.optimistic)
                      ? `${result.savings.optimistic[0]}–${result.savings.optimistic[1]} kWh`
                      : "25–50 kWh"}
                  </div>
                  <span className="text-xs text-teal-600 font-semibold">
                    {Array.isArray(result.savings?.optimistic)
                      ? `${formatBRL(result.savings.optimistic[0] * (result.effectiveCostPerKwh || 0.88))} – ${formatBRL(result.savings.optimistic[1] * (result.effectiveCostPerKwh || 0.88))}/mês`
                      : "Economia máxima"}
                  </span>
                </div>
              </div>
            </div>

            {/* Prioritized Recommendations List & Interactive Action Plan */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Plano de Ação Interativo: Recomendações Prioritárias
                  </h3>
                  <p className="text-xs text-slate-500">
                    Clique em "Adotar Ação" para simular o alívio imediato no seu bolso
                  </p>
                </div>

                {/* Adopted Counter Badge */}
                {adoptedSavings.count > 0 && (
                  <div className="p-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {adoptedSavings.count} ação{adoptedSavings.count > 1 ? "ões" : ""} adotada{adoptedSavings.count > 1 ? "s" : ""}:
                      {" "}
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                        ~{adoptedSavings.kwh} kWh/mês economizados ({formatBRL(adoptedSavings.brl)}/mês a menos)
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {result.recommendations.map((rec, idx) => {
                  const isAdopted = adoptedRecommendations.includes(rec.id);

                  return (
                    <div
                      key={rec.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-2 ${
                        isAdopted
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              isAdopted
                                ? "bg-emerald-600 text-white"
                                : "bg-teal-600 text-white"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            {rec.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                            Economia: ~{rec.potentialKwh[0]} a {rec.potentialKwh[1]} kWh/mês
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleAdoptedRecommendation(rec.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isAdopted
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                : "bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isAdopted ? "Adotada" : "Adotar Ação"}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                        {settings.simpleLanguage ? rec.actionSimple : rec.action}
                      </p>

                      <div className="flex flex-wrap gap-3 pl-8 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          <strong>Por que importa:</strong>{" "}
                          {settings.simpleLanguage ? rec.whySimple : rec.why}
                        </span>
                        <span>·</span>
                        <span>
                          <strong>Investimento:</strong> {rec.cost}
                        </span>
                        <span>·</span>
                        <span>
                          <strong>Esforço:</strong> {rec.effort}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Navigation / Next Steps */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  id="btn-wizard-back-from-report"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar e Ajustar Aparelhos
                </button>
                <button
                  id="btn-wizard-restart"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center whitespace-nowrap"
                >
                  Reiniciar Diagnóstico
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  id="btn-wizard-finish-exit"
                  onClick={() => {
                    if (onFocusModeChange) onFocusModeChange(false);
                    if (onExit) {
                      onExit();
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Concluir diagnóstico e voltar ao Início"
                >
                  <Check className="w-4 h-4" />
                  Concluir e Voltar ao Início
                </button>
                <button
                  id="btn-wizard-open-simulator"
                  onClick={() => {
                    const diag: SavedDiagnosis = {
                      id: `diag-${Date.now()}`,
                      createdAt: new Date().toISOString(),
                      input: {
                        billValue,
                        monthlyKwh,
                        occupants,
                        appliances,
                        detailed: true,
                        hasSafetyRisk,
                        safety,
                      },
                      result,
                      kind: "principal",
                    };
                    onOpenSimulator(diag);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Sliders className="w-4 h-4" />
                  Abrir na Simulação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Educational Modal */}
      {explanatoryTopic && (
        <div
          id="diagnosis-help-modal-backdrop"
          className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-start justify-center pt-12 pb-16 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExplanatoryTopic(null);
          }}
        >
          <div
            id="diagnosis-help-modal"
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-800 p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-base">
                <Lightbulb className="w-5 h-5" />
                <h3>{explanatoryTopic.title}</h3>
              </div>
              <button
                id="btn-close-diagnosis-help"
                onClick={() => setExplanatoryTopic(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {explanatoryTopic.description}
            </p>

            {explanatoryTopic.example && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {explanatoryTopic.example}
              </div>
            )}

            {explanatoryTopic.tip && (
              <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>{explanatoryTopic.tip}</span>
              </div>
            )}

            <button
              id="btn-understand-diagnosis-help"
              onClick={() => setExplanatoryTopic(null)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

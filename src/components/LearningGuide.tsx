import React, { useState, useMemo, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Zap,
  Gauge,
  CheckCircle2,
  AlertCircle,
  Clock,
  Home,
  ShieldCheck,
  Award,
  Flame,
  Tv,
  ArrowRight,
  Calculator,
  FileText,
  HeartHandshake,
  Users,
  Scale,
  Sparkles,
  Search,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingDown,
  Info,
  Check,
} from "lucide-react";
import { AccessibilitySettings, SavedDiagnosis, BillScanRecord } from "../types";
import { AdSlot } from "./AdSlot";
import { formatBRL, formatNumber } from "../lib/energy";

interface LearningGuideProps {
  settings: AccessibilitySettings;
  diagnoses?: SavedDiagnosis[];
  billScans?: BillScanRecord[];
}

// Bandeiras Tarifárias ANEEL (Valores Homologados vigentes)
const BANDEIRAS_INFO = [
  {
    id: "verde",
    name: "Bandeira Verde",
    ratePerKwh: 0,
    ratePer100Kwh: 0,
    color: "bg-emerald-500",
    border: "border-emerald-500",
    badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300",
    desc: "Condições hidrológicas favoráveis. Sem acréscimo tarifário na conta de luz.",
    meaning: "Nível ótimo dos reservatórios das usinas hidrelétricas. Não é necessário acionar usinas termelétricas caras.",
  },
  {
    id: "amarela",
    name: "Bandeira Amarela",
    ratePerKwh: 0.01885,
    ratePer100Kwh: 1.885,
    color: "bg-amber-400",
    border: "border-amber-400",
    badge: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
    desc: "Acréscimo de R$ 1,885 a cada 100 kWh consumidos.",
    meaning: "Condições de geração menos favoráveis. O Sistema Interligado Nacional aciona primeiras termelétricas de apoio.",
  },
  {
    id: "vermelha1",
    name: "Bandeira Vermelha - Patamar 1",
    ratePerKwh: 0.04463,
    ratePer100Kwh: 4.463,
    color: "bg-red-500",
    border: "border-red-500",
    badge: "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300",
    desc: "Acréscimo de R$ 4,463 a cada 100 kWh consumidos.",
    meaning: "Condições hidrológicas críticas. Custos de geração térmica mais caros repassados diretamente à fatura.",
  },
  {
    id: "vermelha2",
    name: "Bandeira Vermelha - Patamar 2",
    ratePerKwh: 0.07877,
    ratePer100Kwh: 7.877,
    color: "bg-red-700",
    border: "border-red-700",
    badge: "bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200",
    desc: "Acréscimo de R$ 7,877 a cada 100 kWh consumidos.",
    meaning: "Seca severa exigindo a operação contínua de usinas termelétricas a óleo combustível e gás natural.",
  },
  {
    id: "escassez",
    name: "Bandeira Escassez Hídrica",
    ratePerKwh: 0.1420,
    ratePer100Kwh: 14.20,
    color: "bg-rose-900",
    border: "border-rose-900",
    badge: "bg-rose-200 dark:bg-rose-950 text-rose-950 dark:text-rose-200",
    desc: "Acréscimo de R$ 14,20 a cada 100 kWh consumidos.",
    meaning: "Regime emergencial extraordinário acionado em crises climáticas extremas para cobrir os custos de importação e termelétricas emergenciais.",
  },
];

// Glossário de Termos Elétricos
const GLOSSARY_TERMS = [
  {
    term: "Quilowatt-hora (kWh)",
    simple: "A unidade de medida cobrada na sua conta de luz. Equivale a 1.000 Watts funcionando por 1 hora.",
    technical: "Unidade de energia elétrica correspondente ao trabalho realizado por uma potência constante de um quilowatt durante uma hora (1 kWh = 3,6 × 10⁶ Joules).",
  },
  {
    term: "Potência (Watts - W)",
    simple: "A força ou voracidade com que o aparelho puxa energia da tomada para funcionar.",
    technical: "Taxa de conversão de energia elétrica em trabalho (calor, movimento ou luz) por unidade de tempo (1 Watt = 1 Joule por segundo).",
  },
  {
    term: "Tarifa de Energia (TE)",
    simple: "A parte da conta que paga quem gera os elétrons nas usinas (hidrelétricas, solares, eólicas).",
    technical: "Valor monetário unitário (R$/kWh) destinado a remunerar os custos de geração de energia elétrica e compra de contratos regulados.",
  },
  {
    term: "Tarifa de Uso da Distribuição (TUSD)",
    simple: "A parte da conta que paga a manutenção dos postes, fios, transformadores e equipes de socorro na rua.",
    technical: "Tarifa regulada pela ANEEL que remunera a infraestrutura física de transporte da energia até o ponto de entrega da unidade consumidora.",
  },
  {
    term: "Bandeiras Tarifárias",
    simple: "Cores (Verde, Amarela, Vermelha) que avisam se gerar energia no Brasil naquele mês está barato ou caro.",
    technical: "Mecanismo regulatório que sinaliza mensalmente aos consumidores os custos reais da geração de energia elétrica a partir da matriz hidrotérmica.",
  },
  {
    term: "COSIP / CIP",
    simple: "Contribuição paga na conta que vai diretamente para a Prefeitura iluminar praças e ruas da cidade.",
    technical: "Contribuição para Custeio do Serviço de Iluminação Pública, tributo municipal previsto no art. 149-A da Constituição Federal.",
  },
  {
    term: "Efeito Joule",
    simple: "O aquecimento natural dos fios e resistências quando a corrente elétrica passa por eles.",
    technical: "Fenômeno físico no qual a passagem de corrente elétrica através de um condutor dissipa energia na forma de calor devido à resistência do material.",
  },
  {
    term: "Inverter",
    simple: "Tecnologia inteligente em motores e compressores que não liga e desliga de soco, mantendo velocidade suave e contínua.",
    technical: "Circuito eletrônico inversor de frequência que modula dinamicamente a rotação do compressor conforme a carga térmica necessária, evitando surtos de corrente de partida.",
  },
];

export const LearningGuide: React.FC<LearningGuideProps> = ({
  settings,
  diagnoses = [],
  billScans = [],
}) => {
  const [activeTab, setActiveTab] = useState<
    "calculator" | "flags" | "meter" | "bill" | "rights" | "glossary"
  >("calculator");

  // Pocket calculator state
  const [calcWatts, setCalcWatts] = useState<number>(1000);
  const [calcHours, setCalcHours] = useState<number>(2);
  const [calcDays, setCalcDays] = useState<number>(30);
  const [calcTariff, setCalcTariff] = useState<number>(0.94);

  const pocketMonthlyKwh = (calcWatts / 1000) * calcHours * calcDays;
  const pocketMonthlyCost = pocketMonthlyKwh * calcTariff;

  // Auto-detecção do consumo mensal do usuário a partir de diagnóstico ou leitura de conta
  const detectedConsumption = useMemo(() => {
    // 1. Verificar leitura de conta mais recente com consumo válido
    const validBills = billScans.filter((b) => (b.bill?.consumo_kwh ?? 0) > 0);
    const latestBill = validBills.length > 0
      ? [...validBills].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.scannedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.scannedAt || 0).getTime();
          return timeB - timeA;
        })[0]
      : null;

    // 2. Verificar diagnóstico mais recente com consumo válido
    const validDiags = diagnoses.filter(
      (d) => (d.input?.monthlyKwh ?? 0) > 0 || (d.result?.totalEstimated ?? 0) > 0,
    );
    const latestDiag = validDiags.length > 0
      ? [...validDiags].sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        })[0]
      : null;

    if (latestBill && latestDiag) {
      const billTime = new Date(latestBill.createdAt || latestBill.scannedAt || 0).getTime();
      const diagTime = new Date(latestDiag.createdAt || 0).getTime();
      if (billTime >= diagTime) {
        return {
          kwh: Math.round(latestBill.bill.consumo_kwh!),
          source: `última fatura lida (${latestBill.bill.mes_referencia || "recente"})`,
          type: "fatura" as const,
        };
      } else {
        const kwh = Math.round(latestDiag.input?.monthlyKwh || latestDiag.result?.totalEstimated || 0);
        return {
          kwh,
          source: "último diagnóstico residencial",
          type: "diagnostico" as const,
        };
      }
    } else if (latestBill) {
      return {
        kwh: Math.round(latestBill.bill.consumo_kwh!),
        source: `última fatura lida (${latestBill.bill.mes_referencia || "recente"})`,
        type: "fatura" as const,
      };
    } else if (latestDiag) {
      const kwh = Math.round(latestDiag.input?.monthlyKwh || latestDiag.result?.totalEstimated || 0);
      return {
        kwh,
        source: "último diagnóstico residencial",
        type: "diagnostico" as const,
      };
    }

    return null;
  }, [diagnoses, billScans]);

  // Bandeira simulation state - pré-preenchido com consumo detectado quando existir
  const [simKwh, setSimKwh] = useState<number>(() => {
    return detectedConsumption?.kwh ?? 180;
  });

  const [selectedFlag, setSelectedFlag] = useState<string>("amarela");

  // Se o consumo detectado for atualizado ou carregado após montar o componente, sincroniza automaticamente
  useEffect(() => {
    if (detectedConsumption?.kwh && detectedConsumption.kwh > 0) {
      setSimKwh(detectedConsumption.kwh);
    }
  }, [detectedConsumption]);

  const currentFlagObj = BANDEIRAS_INFO.find((b) => b.id === selectedFlag) || BANDEIRAS_INFO[0];
  const flagExtraMonthly = (simKwh / 100) * currentFlagObj.ratePer100Kwh;
  const flagExtraYearly = flagExtraMonthly * 12;

  // Glossário search filter
  const [glossaryQuery, setGlossaryQuery] = useState("");

  const filteredGlossary = useMemo(() => {
    return GLOSSARY_TERMS.filter(
      (item) =>
        item.term.toLowerCase().includes(glossaryQuery.toLowerCase()) ||
        item.simple.toLowerCase().includes(glossaryQuery.toLowerCase()) ||
        item.technical.toLowerCase().includes(glossaryQuery.toLowerCase()),
    );
  }, [glossaryQuery]);

  // Meter Reading interactive simulator state
  const [meterPrevious, setMeterPrevious] = useState<number>(14620);
  const [meterCurrent, setMeterCurrent] = useState<number>(14820);
  const meterDiffKwh = Math.max(0, meterCurrent - meterPrevious);
  const meterEstimatedCost = meterDiffKwh * calcTariff;

  return (
    <div id="learning-guide-view" className="space-y-8 animate-in fade-in duration-300">
      {/* Header com Identidade Visual Educativa e Moderna */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800/80">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Aprender & Compreender
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight text-balance">
              Guia Prático de Eficiência & Cidadania Energética
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed text-pretty mt-1">
              {settings.simpleLanguage
                ? "Entenda como a luz é cobrada, como calcular qualquer aparelho e aprenda a ler o relógio da sua casa sem complicação."
                : "Fundamentos didáticos sobre o setor elétrico brasileiro, simuladores de consumo e bandeiras tarifárias da ANEEL, direitos do consumidor e auditoria da fatura."}
            </p>
          </div>
        </div>

        {/* Abas Horizontais com Navegação Linear Suave */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar">
          {[
            { id: "calculator", label: "Calculadora de Bolso", icon: Calculator },
            { id: "flags", label: "Bandeiras Tarifárias", icon: Sliders },
            { id: "meter", label: "Leitura do Relógio", icon: Gauge },
            { id: "bill", label: "Estrutura da Conta", icon: FileText },
            { id: "rights", label: "Direitos do Consumidor", icon: Scale },
            { id: "glossary", label: "Glossário de Termos", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-blue-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ABA 1: CALCULADORA DE BOLSO (SEM PRESETS DE SIMULAÇÃO RÁPIDA) */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Calculadora de Bolso: Quanto Custa Qualquer Aparelho?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fórmula oficial:{" "}
                    <code className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      (Potência em Watts × Horas/dia × Dias) ÷ 1000 = kWh
                    </code>
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 self-start sm:self-auto">
                Cálculo em Reais & kWh
              </span>
            </div>

            {/* Inputs Numéricos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Potência do Aparelho (Watts)
                </label>
                <input
                  id="input-pocket-watts"
                  type="number"
                  min="0"
                  max="15000"
                  value={calcWatts || ""}
                  onChange={(e) =>
                    setCalcWatts(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Consulte a etiqueta do fabricante
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Horas Ligado por Dia
                </label>
                <input
                  id="input-pocket-hours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={calcHours || ""}
                  onChange={(e) =>
                    setCalcHours(
                      e.target.value === ""
                        ? 0
                        : Math.min(24, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">Ex: 2 horas por dia</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Dias Ligado no Mês
                </label>
                <input
                  id="input-pocket-days"
                  type="number"
                  min="0"
                  max="30"
                  value={calcDays || ""}
                  onChange={(e) =>
                    setCalcDays(
                      e.target.value === ""
                        ? 0
                        : Math.min(30, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">Ex: 30 dias no mês</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Tarifa com Impostos (R$/kWh)
                </label>
                <input
                  id="input-pocket-tariff"
                  type="number"
                  step="0.01"
                  min="0"
                  value={calcTariff || ""}
                  onChange={(e) =>
                    setCalcTariff(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                  }
                  placeholder="0.94"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Média no Brasil ~R$ 0,94/kWh
                </span>
              </div>
            </div>

            {/* Painel de Resultados do Aparelho */}
            <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Consumo Mensal Calculado:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-['Space_Grotesk']">
                  {formatNumber(pocketMonthlyKwh)} kWh/mês
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Custo Estimado na Sua Conta:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                  {formatBRL(pocketMonthlyCost)}/mês
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ou {formatBRL(pocketMonthlyCost * 12)} por ano acumulado
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: SIMULADOR DAS BANDEIRAS TARIFÁRIAS DA ANEEL COM SELEÇÃO AUTOMÁTICA DE CONSUMO */}
      {activeTab === "flags" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Sliders className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Simulador de Impacto das Bandeiras Tarifárias da ANEEL
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                As bandeiras sinalizam o custo da geração de energia no Brasil. Veja na ponta do lápis quanto a sua conta sobe em cada cor:
              </p>
            </div>

            {/* Aviso de Detecção Automática de Consumo */}
            {detectedConsumption ? (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                  <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Consumo mensal selecionado automaticamente:{" "}
                    <strong>{detectedConsumption.kwh} kWh</strong> (a partir de {detectedConsumption.source}).
                  </span>
                </div>
                {simKwh !== detectedConsumption.kwh && (
                  <button
                    type="button"
                    onClick={() => setSimKwh(detectedConsumption.kwh)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline shrink-0 cursor-pointer"
                  >
                    Restaurar {detectedConsumption.kwh} kWh
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Dica: Quando você realiza um Diagnóstico Residencial ou escaneia uma Conta de Luz, o seu consumo real é preenchido aqui automaticamente.
                </span>
              </div>
            )}

            {/* Seletor de Bandeiras */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {BANDEIRAS_INFO.map((bandeira) => {
                const isSelected = selectedFlag === bandeira.id;
                return (
                  <button
                    key={bandeira.id}
                    type="button"
                    onClick={() => setSelectedFlag(bandeira.id)}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full ${bandeira.color} shrink-0`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {bandeira.name.replace("Bandeira ", "")}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      {bandeira.ratePer100Kwh === 0
                        ? "Sem acréscimo"
                        : `+R$ ${bandeira.ratePer100Kwh.toFixed(2)}/100 kWh`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider de Consumo Residencial */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Consumo Mensal Simulado:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="1500"
                    value={simKwh}
                    onChange={(e) => setSimKwh(Math.max(0, Number(e.target.value)))}
                    className="w-20 text-right p-1.5 text-xs font-black rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-slate-500">kWh</span>
                </div>
              </div>

              <input
                type="range"
                min="30"
                max="800"
                step="5"
                value={simKwh}
                onChange={(e) => setSimKwh(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="flex justify-between text-[11px] text-slate-400 font-medium px-0.5">
                <span>50 kWh</span>
                <span>180 kWh (Média BR)</span>
                <span>350 kWh</span>
                <span>800 kWh</span>
              </div>
            </div>

            {/* Painel com o Impacto Calculado */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-900 border border-blue-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${currentFlagObj.badge}`}>
                  {currentFlagObj.name}
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-pretty pt-1">
                  {currentFlagObj.meaning}
                </p>
              </div>

              <div className="sm:text-right space-y-0.5 shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Acréscimo Adicional na Sua Conta:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                  +{formatBRL(flagExtraMonthly)}/mês
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  ou +{formatBRL(flagExtraYearly)} por ano se mantida
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: COMO LER O RELÓGIO MEDIDOR (TREINO INTERATIVO) */}
      {activeTab === "meter" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Gauge className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Como Ler o Relógio de Luz da Sua Casa (Auditoria Própria)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                Aprenda a anotar os números e simule a diferença entre a leitura anterior e a de hoje para saber quanto você gastou:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Medidor Digital LCD */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
                    1. Medidor Eletrônico Digital (Display LCD)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    Mais Moderno
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 font-mono text-center text-xl font-black tracking-widest text-indigo-800 dark:text-indigo-300">
                  014820 kWh
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  Basta anotar os dígitos inteiros da tela. O consumo do período é a subtração do valor que você anotou hoje pelo valor da última fatura.
                </p>
              </div>

              {/* Medidor Ciclométrico / Ponteiros */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                    2. Medidor Eletromecânico (4 Reloginhos)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                    Tradicional
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-around font-mono text-xs font-bold text-amber-900 dark:text-amber-300">
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-400">Milhar (x1000)</span>
                    <span className="text-base font-black">1</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-400">Centena (x100)</span>
                    <span className="text-base font-black">4</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-400">Dezena (x10)</span>
                    <span className="text-base font-black">8</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-400">Unidade (x1)</span>
                    <span className="text-base font-black">2</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  <strong>Regra de Ouro:</strong> Leia sempre da esquerda para a direita. Se o ponteiro estiver entre dois números, <strong>anote sempre o menor</strong> (ex: entre 3 e 4, anote 3).
                </p>
              </div>
            </div>

            {/* Simulador Interativo de Leitura */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Simule Seu Consumo com as Leituras do Seu Medidor
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Leitura Anterior (está na sua última fatura)
                  </label>
                  <input
                    type="number"
                    value={meterPrevious}
                    onChange={(e) => setMeterPrevious(Number(e.target.value))}
                    className="w-full text-sm font-bold p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Leitura Atual (o que está no seu relógio hoje)
                  </label>
                  <input
                    type="number"
                    value={meterCurrent}
                    onChange={(e) => setMeterCurrent(Number(e.target.value))}
                    className="w-full text-sm font-bold p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Consumo no Período:</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {meterDiffKwh} kWh consumidos
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] text-slate-400 font-semibold block">Custo Estimado no Período:</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatBRL(meterEstimatedCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: ESTRUTURA DA FATURA & TERMOS ESSENCIAIS */}
      {activeTab === "bill" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  <FileText className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  O Que Cada Linha da Sua Fatura Significa
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                A conta de luz é padronizada pelas normas da ANEEL. Conheça para onde vai cada Real pago:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Tarifa de Energia (TE)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Geração (~35%)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  Remunera as usinas que geram eletricidade (hidrelétricas, fazendas solares, parques eólicos e termelétricas).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Tarifa de Distribuição (TUSD)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Postes e Fios (~30%)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  Paga os cabos, postes, transformadores da concessionária e as viaturas de emergência 24h na rua.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Impostos (ICMS, PIS, COFINS)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                    Governo (~25% a 30%)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  O ICMS vai para os cofres do seu Estado. O PIS e a COFINS vão para o Governo Federal.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Iluminação Pública (COSIP / CIP)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Prefeitura Municipal
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  Arrecadada pela distribuidora e repassada integralmente à Prefeitura da sua cidade para manter as lâmpadas das vias públicas acesas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: DIREITOS DO CONSUMIDOR E INTERESSE SOCIAL */}
      {activeTab === "rights" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Scale className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Seus Direitos como Consumidor de Energia (ANEEL)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                A energia elétrica é serviço público essencial. Conheça as leis federais e normas que protegem a sua residência:
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                    Tarifa Social de Energia Elétrica (TSEE) — Gratuidade até 80 kWh/mês
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                    Famílias no CadÚnico com renda de até meio salário mínimo per capita têm isenção de 100% no consumo de até 80 kWh/mês (Lei nº 15.235/2025). Acima desse limite, paga-se apenas a diferença excedente.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-200">
                    Proibição de Corte em Sextas-Feiras e Vésperas de Feriado
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                    Pela Lei Federal nº 14.015/2020, a distribuidora <strong>não pode cortar o fornecimento</strong> na sexta-feira, sábado, domingo ou em véspera de feriado. O corte só é legal após aviso prévio de 15 dias corridos.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                    Ressarcimento de Eletrodomésticos Queimados por Picos de Energia
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                    Se oscilações da rede ou raios queimarem sua geladeira ou TV, você tem até 90 dias para solicitar o conserto ou indenização diretamente nos canais da distribuidora (Resolução Normativa ANEEL nº 1.000/2021).
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
                <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Proteção Prioritária para Usuários de Aparelhos de Sobrevida Médica
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                    Casas com pessoas que usam respiradores ou concentradores de oxigênio podem se cadastrar na distribuidora como unidade prioritária, tendo direito a aviso prévio em manutenções e gerador emergencial em caso de panes prolongadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 6: GLOSSÁRIO DE TERMOS DO SETOR ELÉTRICO */}
      {activeTab === "glossary" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Glossário Descomplicado da Eletricidade
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                Termos técnicos explicados em bom português para ninguém ficar com dúvidas:
              </p>
            </div>

            {/* Pesquisa no Glossário */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar termo elétrico..."
                value={glossaryQuery}
                onChange={(e) => setGlossaryQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {item.term}
                  </h4>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-pretty">
                  <strong>O que é:</strong> {settings.simpleLanguage ? item.simple : item.technical}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner de apoio no rodapé */}
      <AdSlot placement="learning-footer" />
    </div>
  );
};

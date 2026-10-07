import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Zap,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Scale,
  RefreshCw,
  Share2,
  Info,
  X,
  Award,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { EnergyClassSelector } from "./EnergyClassSelector";
import {
  applianceCatalog as APPLIANCE_DEFINITIONS,
  calculateEquipmentPayback,
  getPaybackTimelineStep,
  ENERGY_EFFICIENCY_CLASSES,
  EnergyEfficiencyClass,
  EnergyClassDefinition,
  formatBRL,
  formatNumber,
} from "../lib/energy";
import { AccessibilitySettings, SavedDiagnosis, BillScanRecord } from "../types";
import { detectTariffFromHistory, DetectedTariffInfo } from "../lib/tariff";

interface EquipmentPaybackSimulatorProps {
  settings: AccessibilitySettings;
  diagnoses?: SavedDiagnosis[];
  billScans?: BillScanRecord[];
  defaultTariff?: number;
  onSharePayback?: (payload: {
    equipmentName: string;
    investmentBrl: number;
    monthlySavingsBrl: number;
    annualSavingsBrl: number;
    paybackMonths: number;
    viable: boolean;
  }) => void;
}

const PAYBACK_EXPLANATIONS = {
  payback: {
    title: "O que é Tempo de Payback?",
    description:
      "Payback Simples é o tempo (em meses ou anos) necessário para que a economia gerada na sua conta de luz pague integralmente o preço investido no produto novo.",
    example:
      "Exemplo: Se você paga R$ 2.400 em um equipamento Inverter que reduz sua fatura em R$ 100 todo mês, o payback é: R$ 2.400 ÷ R$ 100 = 24 meses (2 anos). A partir do 25º mês, todo o dinheiro economizado vira alívio financeiro limpo no bolso!",
    tip: "Aparelhos duram em média de 8 a 12 anos. Um payback de até 3 ou 4 anos representa excelente viabilidade financeira.",
  },
  procel: {
    title: "Diferença entre Selo Procel A e Modelos Convencionais",
    description:
      "O Selo Procel identifica os modelos que passam nos testes mais rigorosos do Inmetro. Modelos Inverter contam com compressores inteligentes que modulam a rotação do motor em vez de ligar e desligar continuamente, reduzindo até 40% a 65% da energia gasta.",
    example:
      "Enquanto um modelo antigo ou de categoria D consome muita energia em cada partida de motor, um modelo Selo Procel A+++ opera de forma linear, estável e silenciosa.",
    tip: "Sempre compare o consumo informado na etiqueta do Inmetro (kWh/mês ou kWh/ano) antes de comprar.",
  },
};

export const EquipmentPaybackSimulator: React.FC<EquipmentPaybackSimulatorProps> = ({
  settings,
  diagnoses = [],
  billScans = [],
  defaultTariff,
  onSharePayback,
}) => {
  const [explanatoryTopic, setExplanatoryTopic] = useState<{
    title: string;
    description: string;
    example?: string;
    tip?: string;
  } | null>(null);

  // Detecção inteligente da tarifa a partir do histórico de diagnósticos e faturas
  const detectedTariffInfo: DetectedTariffInfo = useMemo(() => {
    return detectTariffFromHistory(billScans, diagnoses);
  }, [billScans, diagnoses]);

  // Tarifa editável pelo usuário (iniciada com a tarifa detectada ou padrão)
  const [tariffKwhBrl, setTariffKwhBrl] = useState<number>(() => {
    return defaultTariff && defaultTariff > 0
      ? defaultTariff
      : detectedTariffInfo.rate;
  });

  const [hasManuallyEditedTariff, setHasManuallyEditedTariff] = useState(false);

  // Sincronizar quando a tarifa detectada mudar (se o usuário não editou manualmente)
  useEffect(() => {
    if (!hasManuallyEditedTariff && detectedTariffInfo.rate > 0) {
      setTariffKwhBrl(detectedTariffInfo.rate);
    }
  }, [detectedTariffInfo, hasManuallyEditedTariff]);

  // Current equipment form state
  const [selectedApplianceKey, setSelectedApplianceKey] = useState<string>("ar-condicionado");
  const [currentEquipmentName, setCurrentEquipmentName] = useState<string>(
    "Ar-Condicionado Tradicional (12.000 BTU)",
  );
  const [currentPowerWatts, setCurrentPowerWatts] = useState<number>(1400);
  const [currentHoursPerDay, setCurrentHoursPerDay] = useState<number>(8);
  const [currentDaysPerMonth, setCurrentDaysPerMonth] = useState<number>(30);
  const [currentEfficiencyClass, setCurrentEfficiencyClass] = useState<EnergyEfficiencyClass>("D");

  // New equipment form state
  const [newPriceBrl, setNewPriceBrl] = useState<number>(2499);
  const [newPowerWatts, setNewPowerWatts] = useState<number>(1400);
  const [newHoursPerDay, setNewHoursPerDay] = useState<number>(8);
  const [newDaysPerMonth, setNewDaysPerMonth] = useState<number>(30);
  const [newEfficiencyClass, setNewEfficiencyClass] = useState<EnergyEfficiencyClass>("A+++");

  // When appliance type changes, auto-populate reference power from definitions
  const handleApplianceChange = (key: string) => {
    setSelectedApplianceKey(key);
    const def = APPLIANCE_DEFINITIONS.find((a) => a.key === key);
    if (def) {
      setCurrentEquipmentName(`Meu(Minha) ${def.label}`);
      setCurrentPowerWatts(def.defaultPower);
      setNewPowerWatts(def.defaultPower); // Potência nominal de mesma capacidade; o ganho de eficiência é regido pela classe Inmetro/Procel
    }
  };

  // Perform calculation
  const result = useMemo(() => {
    return calculateEquipmentPayback({
      applianceKey: selectedApplianceKey,
      currentPowerWatts,
      currentHoursPerDay,
      currentDaysPerMonth,
      newPriceBrl,
      newPowerWatts,
      newHoursPerDay,
      newDaysPerMonth,
      tariffKwhBrl,
      currentEfficiencyClass,
      newEfficiencyClass,
    });
  }, [
    selectedApplianceKey,
    currentPowerWatts,
    currentHoursPerDay,
    currentDaysPerMonth,
    newPriceBrl,
    newPowerWatts,
    newHoursPerDay,
    newDaysPerMonth,
    tariffKwhBrl,
    currentEfficiencyClass,
    newEfficiencyClass,
  ]);

  // Marcas dinâmicas e proporcionais para o eixo temporal do gráfico (2 em 2 meses até 1 ano, 4 em 4 até 3 anos, 6 em 6 até 6 anos, 12 em 12 acima)
  const timelineMonthTicks = useMemo(() => {
    if (!result.timeline || result.timeline.length === 0) return [];
    const maxM = Math.max(...result.timeline.map((t) => t.month), 24);
    const step = getPaybackTimelineStep(result.paybackMonths, maxM);
    const ticks: number[] = [];
    for (let m = 0; m <= Math.ceil(maxM); m += step) {
      ticks.push(m);
    }
    if (ticks.length > 0 && ticks[ticks.length - 1] < maxM) {
      ticks.push(ticks[ticks.length - 1] + step);
    }
    return ticks;
  }, [result.timeline, result.paybackMonths]);

  // Viability assessment
  const paybackStatus = useMemo(() => {
    if (!result.viable || result.monthlyBrlSaved <= 0) {
      return {
        label: "Investimento Sem Economia Elétrica",
        desc: "O novo equipamento consome igual ou mais que o anterior nas horas e classes informadas.",
        color: "red",
      };
    }
    if (result.paybackMonths <= 12) {
      return {
        label: "Excelente Retorno (Menos de 1 Ano)",
        desc: "O aparelho se paga muito rapidamente apenas com a economia na conta de luz.",
        color: "emerald",
      };
    }
    if (result.paybackMonths <= 24) {
      return {
        label: "Ótimo Investimento (1 a 2 Anos)",
        desc: "Retorno consistente dentro da vida útil do equipamento com ganho financeiro contínuo.",
        color: "emerald",
      };
    }
    if (result.paybackMonths <= 48) {
      return {
        label: "Retorno Médio a Longo Prazo (2 a 4 Anos)",
        desc: "Viável se o equipamento for durável e mantido em uso contínuo por vários anos.",
        color: "amber",
      };
    }
    return {
      label: "Retorno Acima de 4 Anos",
      desc: "O valor da aquisição é alto em relação à economia mensal obtida. Avalie se outros benefícios (conforto, garantia) justificam a compra.",
      color: "slate",
    };
  }, [result]);

  return (
    <div id="payback-simulator-view" className="space-y-8 animate-in fade-in duration-300">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
            <ShoppingBag className="w-3.5 h-3.5" />
            Decisão Inteligente de Compra
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] text-balance">
            Simulador de Compra & Tempo de Payback
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed text-pretty">
            {settings.simpleLanguage
              ? "Quer trocar um aparelho antigo por um novo mais moderno? Coloque o preço e o consumo para descobrir em quantos meses a economia na conta de luz paga o produto novo."
              : "Calcule o tempo de retorno do investimento (Payback Simples) e o ponto de equilíbrio financeiro ao substituir eletrodomésticos antigos por modelos de alta eficiência energética (Selo Procel A / Inverter)."}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              id="btn-help-payback-concept"
              onClick={() => setExplanatoryTopic(PAYBACK_EXPLANATIONS.payback)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              Como funciona o Payback?
            </button>
            <button
              type="button"
              id="btn-help-procel-concept"
              onClick={() => setExplanatoryTopic(PAYBACK_EXPLANATIONS.procel)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              Por que Selo Procel A / Inverter?
            </button>
          </div>
        </div>

        {onSharePayback && (
          <button
            id="btn-share-payback"
            onClick={() => {
              onSharePayback({
                equipmentName: `${currentEquipmentName} → Novo (${result.newClassDef.code})`,
                investmentBrl: newPriceBrl,
                monthlySavingsBrl: result.monthlyBrlSaved,
                annualSavingsBrl: result.annualBrlSaved,
                paybackMonths: result.paybackMonths,
                viable: result.viable,
              });
            }}
            className="self-start px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar Análise
          </button>
        )}
      </div>

      {/* Explanatory Topic Modal */}
      {explanatoryTopic && (
        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2 relative">
          <button
            onClick={() => setExplanatoryTopic(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            {explanatoryTopic.title}
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-pretty">
            {explanatoryTopic.description}
          </p>
          {explanatoryTopic.example && (
            <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              {explanatoryTopic.example}
            </p>
          )}
          {explanatoryTopic.tip && (
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
              💡 Dica: {explanatoryTopic.tip}
            </p>
          )}
        </div>
      )}

      {/* Faixa de Configuração da Tarifa com Detecção Automática (Fatura ou Diagnóstico) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block sm:inline">
                Tarifa de Energia Considerada:
              </span>{" "}
              <span className="text-slate-500 dark:text-slate-400">
                (R$/kWh com impostos e encargos)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 shadow-2xs">
              <span className="text-xs font-bold text-slate-500">R$</span>
              <input
                id="input-payback-tariff"
                type="number"
                step="0.001"
                min="0.10"
                max="3.00"
                value={tariffKwhBrl || ""}
                onChange={(e) => {
                  setHasManuallyEditedTariff(true);
                  setTariffKwhBrl(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)));
                }}
                className="w-20 text-center font-bold text-xs bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
              />
              <span className="text-xs font-bold text-slate-500">/kWh</span>
            </div>

            {hasManuallyEditedTariff && (
              <button
                type="button"
                onClick={() => {
                  setHasManuallyEditedTariff(false);
                  setTariffKwhBrl(detectedTariffInfo.rate);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                title="Restaurar tarifa detectada automaticamente"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar (R$ {detectedTariffInfo.rate.toFixed(3)})
              </button>
            )}
          </div>
        </div>

        {/* Badge da Fonte de Tarifa & Atalhos Regionais */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            {detectedTariffInfo.type !== "padrao" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Tarifa identificada automaticamente a partir de{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {detectedTariffInfo.source}
                  </strong>
                  .
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>
                  Usando a média nacional ANEEL (~R$ 0,94/kWh). Você pode digitar o valor da sua distribuidora.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Input Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Equipamento Atual (Antigo) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Aparelho Atual (Em Uso)
                </h3>
                <p className="text-xs text-slate-500">O que você já possui em casa hoje</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Linha de Base
            </span>
          </div>

          <div className="space-y-4">
            {/* Appliance Selector from Catalog */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Tipo de Aparelho (Catálogo Oficial)
              </label>
              <select
                id="select-payback-appliance"
                value={selectedApplianceKey}
                onChange={(e) => handleApplianceChange(e.target.value)}
                className="w-full text-xs font-semibold p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
              >
                {APPLIANCE_DEFINITIONS.map((app) => (
                  <option key={app.key} value={app.key}>
                    {app.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Nome ou Descrição do Aparelho Atual
              </label>
              <input
                id="input-current-name"
                type="text"
                value={currentEquipmentName}
                onChange={(e) => setCurrentEquipmentName(e.target.value)}
                className="w-full text-xs font-semibold p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
              />
            </div>

            {/* Seletor de Classe Energética - Aparelho Atual (Expande ao clicar) */}
            <EnergyClassSelector
              value={currentEfficiencyClass}
              onChange={setCurrentEfficiencyClass}
              applianceKey={selectedApplianceKey}
              theme="amber"
              idPrefix="current-app"
              label="Classe do equipamento atual"
            />

            {/* Power Watts, Hours, Days for Current Appliance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Potência Atual (W)</span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  id="input-current-watts"
                  type="number"
                  min="0"
                  max="15000"
                  value={currentPowerWatts || ""}
                  onChange={(e) =>
                    setCurrentPowerWatts(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Uso Atual (h/dia)</span>
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                </label>
                <input
                  id="input-current-hours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={currentHoursPerDay || ""}
                  onChange={(e) =>
                    setCurrentHoursPerDay(
                      e.target.value === "" ? 0 : Math.min(24, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Dias / Mês</span>
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  id="input-current-days"
                  type="number"
                  min="0"
                  max="30"
                  value={currentDaysPerMonth || ""}
                  onChange={(e) =>
                    setCurrentDaysPerMonth(
                      e.target.value === "" ? 0 : Math.min(30, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>
            </div>

            {/* Current Consumption Subtotal Box */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-medium">
                  Consumo Mensal Atual
                </span>
                <span className="text-lg font-black text-amber-950 dark:text-amber-100">
                  {formatNumber(result.currentMonthlyKwh)} kWh/mês
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-medium">
                  Custo Mensal Atual
                </span>
                <span className="text-lg font-black text-amber-950 dark:text-amber-100">
                  {formatBRL(result.currentMonthlyCost)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Novo Aparelho Eficiente */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>Novo Equipamento Pretendido</span>
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Modelo eficiente / Procel A / Inverter
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Alternativa Eficiente
            </span>
          </div>

          <div className="space-y-4">
            {/* Price of New Equipment */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span>Preço do Novo Aparelho na Loja (R$)*</span>
                  <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                </label>
                <input
                  id="input-new-price"
                  type="number"
                  min="0"
                  step="10"
                  value={newPriceBrl || ""}
                  onChange={(e) =>
                    setNewPriceBrl(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                  }
                  placeholder="0"
                  className="w-full text-sm font-black p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 focus:outline-indigo-500"
                />
              </div>
            </div>

            {/* Seletor de Classe Energética - Aparelho Novo (Expande ao clicar) */}
            <EnergyClassSelector
              value={newEfficiencyClass}
              onChange={setNewEfficiencyClass}
              applianceKey={selectedApplianceKey}
              theme="indigo"
              idPrefix="new-app"
              label="Classe do novo equipamento"
            />

            {/* Power Watts, Hours, Days for New Appliance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Potência Nova (W)</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                </label>
                <input
                  id="input-new-watts"
                  type="number"
                  min="0"
                  max="15000"
                  value={newPowerWatts || ""}
                  onChange={(e) =>
                    setNewPowerWatts(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Novo Uso (h/dia)</span>
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                </label>
                <input
                  id="input-new-hours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={newHoursPerDay || ""}
                  onChange={(e) =>
                    setNewHoursPerDay(
                      e.target.value === "" ? 0 : Math.min(24, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Dias / Mês</span>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                </label>
                <input
                  id="input-new-days"
                  type="number"
                  min="0"
                  max="30"
                  value={newDaysPerMonth || ""}
                  onChange={(e) =>
                    setNewDaysPerMonth(
                      e.target.value === "" ? 0 : Math.min(30, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="w-full text-sm font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>
            </div>

            {/* New Consumption Subtotal Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 block font-medium">
                  Novo Consumo Previsto
                </span>
                <span className="text-lg font-black text-indigo-950 dark:text-indigo-100">
                  {formatNumber(result.newMonthlyKwh)} kWh/mês
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 block font-medium">
                  Novo Custo Mensal
                </span>
                <span className="text-lg font-black text-indigo-950 dark:text-indigo-100">
                  {formatBRL(result.newMonthlyCost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Faixa Comparativa de Salto de Eficiência entre Classes */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Salto de Eficiência Tecnológica (Etiqueta Inmetro / Procel)
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                +{result.classSavingsPercent}% de rendimento de ciclo
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 text-pretty">
              Transição da <strong>{result.currentClassDef.code}</strong> ({result.currentClassDef.badgeText}) para a <strong>{result.newClassDef.code}</strong> ({result.newClassDef.badgeText}). A modernização do motor, isolamento térmico e compressores modulares reduz perdas drásticas de energia.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Atual</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded ${result.currentClassDef.badgeBg}`}>
              {result.currentClassDef.code}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Novo</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded ${result.newClassDef.badgeBg}`}>
              {result.newClassDef.code}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Payback Results Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Economia Mensal em R$ */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold block">Economia Mensal na Conta</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
            {formatBRL(result.monthlyBrlSaved)}/mês
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Redução de {formatNumber(result.monthlyKwhSaved)} kWh todos os meses
          </p>
        </div>

        {/* Economia Anual Acumulada */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold block">Economia Acumulada em 1 Ano</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
            {formatBRL(result.annualBrlSaved)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {formatBRL(result.annualBrlSaved * 3)} poupados em 3 anos
          </p>
        </div>

        {/* Tempo de Payback */}
        <div className="p-5 rounded-3xl bg-indigo-600 text-white shadow-md space-y-1 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-100 font-semibold">
              Tempo Estimado de Payback (Retorno do Investimento)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              {paybackStatus.label}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black font-['Space_Grotesk']">
              {result.viable ? `${result.paybackMonths} Meses` : "Sem retorno"}
            </span>
            {result.viable && result.paybackYears > 0.9 && (
              <span className="text-sm text-indigo-200 font-medium">
                (cerca de {result.paybackYears} {result.paybackYears === 1 ? "ano" : "anos"})
              </span>
            )}
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed pt-1 text-pretty">
            {paybackStatus.desc}
          </p>
        </div>
      </div>

      {/* Break-Even Timeline Chart com margem superior ajustada para não cortar */}
      {result.viable && result.timeline.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Gráfico do Ponto de Equilíbrio (Quando a Economia "Paga" o Aparelho)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                A linha verde (Economia Acumulada) cruza a linha tracejada (Preço de Compra) no mês de Payback. A partir dali, é alívio financeiro líquido no seu bolso.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center self-center sm:self-auto shrink-0 shadow-xs">
              Ponto de corte: Mês {result.paybackMonths}
            </div>
          </div>

          {/* Container com altura expandida e margem superior ajustada para nunca cortar o topo */}
          <div className="h-80 sm:h-84 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={result.timeline}
                margin={{ top: 28, right: 30, left: 15, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#94a3b8" />
                <XAxis
                  dataKey="month"
                  type="number"
                  domain={[0, timelineMonthTicks[timelineMonthTicks.length - 1] || "dataMax"]}
                  ticks={timelineMonthTicks}
                  interval={0}
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => {
                    if (v === 0) return "0m";
                    if (v >= 12 && v % 12 === 0) {
                      const anos = v / 12;
                      return `${v}m (${anos}a)`;
                    }
                    return `${v}m`;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => `R$ ${v}`}
                  tickLine={false}
                  tickMargin={6}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatBRL(Number(value)),
                    name === "cumulativeSavings"
                      ? "Economia Acumulada"
                      : name === "investmentCost"
                      ? "Preço de Compra do Aparelho"
                      : "Saldo Líquido",
                  ]}
                  labelFormatter={(label) => {
                    const m = Number(label);
                    if (m === 0) return "Mês 0 (Momento da Compra)";
                    if (m >= 12) {
                      const anos = Math.floor(m / 12);
                      const restos = Math.round((m % 12) * 10) / 10;
                      const txtAno = anos === 1 ? "1 ano" : `${anos} anos`;
                      const txtMes = restos > 0 ? ` e ${restos}m` : "";
                      return `Mês ${m} (${txtAno}${txtMes})`;
                    }
                    return `Mês ${m}`;
                  }}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    color: "#0f172a",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) =>
                    value === "cumulativeSavings"
                      ? "Economia Acumulada na Conta (R$)"
                      : value === "investmentCost"
                      ? "Custo de Compra (R$)"
                      : "Saldo Líquido (R$)"
                  }
                />
                <ReferenceLine
                  x={result.paybackMonths}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: `Payback: ${result.paybackMonths}m`,
                    position: "top",
                    dy: -8,
                    fill: "#059669",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />
                <Line
                  type="linear"
                  dataKey="cumulativeSavings"
                  name="cumulativeSavings"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#059669" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="linear"
                  dataKey="investmentCost"
                  name="investmentCost"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

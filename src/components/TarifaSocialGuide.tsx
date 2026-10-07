import React, { useState, useMemo, useEffect } from "react";
import {
  HeartHandshake,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  FileCheck,
  Building,
  ArrowRight,
  TrendingDown,
  Info,
  DollarSign,
  Zap,
  RefreshCw,
  FileText,
  Sparkles,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  calculateTseeDiscount,
  formatBRL,
  formatNumber,
} from "../lib/energy";
import {
  AccessibilitySettings,
  SavedDiagnosis,
  BillScanRecord,
  AppTab,
} from "../types";

interface TarifaSocialGuideProps {
  settings: AccessibilitySettings;
  diagnoses?: SavedDiagnosis[];
  billScans?: BillScanRecord[];
  onNavigateToTab?: (tabId: AppTab) => void;
}

const TarifaSocialGuideComponent: React.FC<TarifaSocialGuideProps> = ({
  settings,
  diagnoses = [],
  billScans = [],
  onNavigateToTab,
}) => {
  // Detect recent data from scan or diagnosis
  const latestBill = billScans.length > 0 ? billScans[0].bill : null;
  const latestDiag = diagnoses.length > 0 ? diagnoses[0] : null;

  const defaultDetectedKwh = useMemo(() => {
    if (latestBill && latestBill.consumo_kwh > 0) {
      return Math.round(latestBill.consumo_kwh);
    }
    if (latestDiag && latestDiag.result?.totalEstimated > 0) {
      return Math.round(latestDiag.result.totalEstimated);
    }
    return 130;
  }, [latestBill, latestDiag]);

  const defaultDetectedTariff = useMemo(() => {
    if (latestBill && latestBill.consumo_kwh && latestBill.consumo_kwh > 0) {
      if (latestBill.valor_total && latestBill.valor_total > 0) {
        return Number((latestBill.valor_total / latestBill.consumo_kwh).toFixed(2));
      }
      if (latestBill.tarifa_te && latestBill.tarifa_tusd) {
        return Number((latestBill.tarifa_te + latestBill.tarifa_tusd).toFixed(2));
      }
    }
    if (latestDiag && latestDiag.result?.effectiveCostPerKwh > 0) {
      return Number(latestDiag.result.effectiveCostPerKwh.toFixed(2));
    }
    return 0.85;
  }, [latestBill, latestDiag]);

  const isTarifaSocialOnBill = Boolean(latestBill?.tarifa_social_identificada);

  // Simulation State
  const [testKwh, setTestKwh] = useState<number>(defaultDetectedKwh);
  const [baseTariff, setBaseTariff] = useState<number>(defaultDetectedTariff);

  // Keep synced if user inputs changed in diagnosis or scan
  useEffect(() => {
    if (defaultDetectedKwh > 0) {
      setTestKwh(defaultDetectedKwh);
    }
    if (defaultDetectedTariff > 0) {
      setBaseTariff(defaultDetectedTariff);
    }
  }, [defaultDetectedKwh, defaultDetectedTariff]);

  // Interactive Eligibility Quiz State
  const [quizCadUnico, setQuizCadUnico] = useState<"sim" | "nao" | "nao-sei" | null>(null);
  const [quizRenda, setQuizRenda] = useState<"baixa" | "media-suporte" | "acima" | null>(null);
  const [quizBpc, setQuizBpc] = useState<"sim" | "nao" | null>(null);
  const [quizTitularCpf, setQuizTitularCpf] = useState<"sim" | "nao" | "outro" | null>(null);

  // Document checklist state
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    nis: false,
    cpf: false,
    conta: false,
    comprovante: false,
    laudo: false,
  });

  // Open/Close FAQ items
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Calculate results using the official national standard rule (100% free up to 80 kWh)
  const tseeCalc = useMemo(() => {
    return calculateTseeDiscount(testKwh, baseTariff);
  }, [testKwh, baseTariff]);

  // Evaluate quiz eligibility
  const eligibilityEvaluation = useMemo(() => {
    if (quizCadUnico === null && quizRenda === null && quizBpc === null) {
      return null;
    }

    const hasBpc = quizBpc === "sim";
    const hasCadUnico = quizCadUnico === "sim";
    const lowIncome = quizRenda === "baixa" || quizRenda === "media-suporte";

    if (hasBpc || (hasCadUnico && lowIncome)) {
      if (quizTitularCpf === "nao" || quizTitularCpf === "outro") {
        return {
          status: "attention_titular",
          title: "Você é Elegível, mas Atenção ao Titular da Conta",
          badge: "Quase Pronto",
          badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
          message:
            "Sua família atende aos critérios do governo! Porém, a conta de luz precisa estar no mesmo CPF de quem tem o benefício (CadÚnico ou BPC). Solicite a troca de titularidade na distribuidora ou informe seu NIS.",
          nextStep: "Ligue para a concessionária e passe a conta para o seu nome com o NIS.",
        };
      }
      return {
        status: "eligible",
        title: "Alta Probabilidade de Ter Direito à Tarifa Social!",
        badge: "Direito Reconhecido",
        badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300",
        message:
          "Sua família preenche todos os requisitos estabelecidos pela Lei Federal e ANEEL. Se a fatura ainda não tem o desconto, entre em contato imediatamente com a distribuidora informando o seu NIS ou NB.",
        nextStep: "Verifique na sua fatura se o campo 'Subclasse: Residencial Baixa Renda' já consta. Se não constar, solicite a ativação.",
      };
    }

    if (quizCadUnico === "nao" || quizCadUnico === "nao-sei") {
      if (lowIncome) {
        return {
          status: "need_cadunico",
          title: "Passo 1: Fazer o Cadastro no CadÚnico (CRAS)",
          badge: "Procure o CRAS",
          badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300",
          message:
            "Sua renda se enquadra nas regras, mas para receber a Tarifa Social é obrigatório estar inscrito no Cadastro Único e com os dados atualizados nos últimos 2 anos.",
          nextStep: "Agende um atendimento no CRAS (Centro de Referência de Assistência Social) do seu bairro levando documentos de todos os moradores.",
        };
      }
    }

    if (quizRenda === "acima" && !hasBpc) {
      return {
        status: "not_eligible",
        title: "Renda Acima do Teto Social",
        badge: "Não Enquadrado",
        badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
        message:
          "Pelas regras vigentes, o benefício é restrito a famílias com renda por pessoa de até meio salário mínimo (ou até 3 salários com uso de suporte vital). Você pode economizar aplicando as dicas do Diagnóstico Residencial.",
        nextStep: "Use a aba 'Diagnóstico' para identificar os aparelhos que mais consomem e economizar sem depender do benefício.",
      };
    }

    return {
      status: "pending",
      title: "Responda às Perguntas Acima",
      badge: "Em Análise",
      badgeColor: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300",
      message: "Selecione as opções da avaliação para descobrir sua situação cadastral perante a lei.",
      nextStep: "Conclua as perguntas acima.",
    };
  }, [quizCadUnico, quizRenda, quizBpc, quizTitularCpf]);

  const toggleDoc = (key: string) => {
    setCheckedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const faqItems = [
    {
      q: "Moro em casa alugada. Posso receber a Tarifa Social?",
      a: "Sim! O direito à Tarifa Social pertence à família moradora, e não ao imóvel. Para ter o desconto, você deve solicitar a transferência da titularidade da conta de luz para o CPF da pessoa da família cadastrada no CadÚnico ou vincular o seu NIS à unidade consumidora.",
    },
    {
      q: "A Tarifa Social zera 100% da conta ou eu ainda pago alguma coisa?",
      a: "Pela nova Lei 15.235/2025, o consumo de até 80 kWh/mês é 100% gratuito (isenção da tarifa de energia). Contudo, a conta ainda pode conter a Contribuição de Iluminação Pública (CIP/COSIP), que é uma taxa municipal e não tem isenção federal, além de eventuais juros ou parcelamentos anteriores.",
    },
    {
      q: "Preciso renovar o benefício da Tarifa Social todo ano?",
      a: "O benefício é mantido enquanto o seu Cadastro Único estiver atualizado. Por lei, o CadÚnico deve ser atualizado obrigatoriamente a cada 2 anos no CRAS da sua cidade, ou sempre que houver mudança de endereço, nascimento ou alteração de renda na família.",
    },
    {
      q: "O que acontece se o meu consumo ultrapassar o limite?",
      a: "O benefício não é cancelado! Você apenas pagará o valor integral exclusivamente sobre os quilowatts-hora que ultrapassarem o limite gratuito. Exemplo: se você consumir 120 kWh na regra dos 80 kWh, os primeiros 80 kWh saem de graça e você só paga pelos 40 kWh excedentes.",
    },
    {
      q: "Quem tem energia solar (geração própria) pode ter Tarifa Social?",
      a: "Sim, os benefícios são compatíveis. Se a residência for de baixa renda e inscrita no CadÚnico, os créditos de energia solar compensam a parcela restante, podendo reduzir ainda mais o custo final.",
    },
  ];

  return (
    <div
      id="tarifa-social-view"
      className="space-y-8 animate-in fade-in duration-300 pb-12"
    >
      {/* Header Banner */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-800">
            <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
            Cidadania & Direito Social
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Gratuidade até 80 kWh/mês
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight">
              Tarifa Social de Energia Elétrica (TSEE)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed pt-1 text-pretty">
              {settings.simpleLanguage
                ? "A Tarifa Social é uma ajuda do governo na conta de luz para famílias que mais precisam. Você pode ter até 80 kWh totalmente de graça todos os meses."
                : "Programa do governo que concede abatimentos e gratuidade na conta de luz para famílias inscritas no CadÚnico ou que recebem o BPC."}
            </p>
          </div>

          {onNavigateToTab && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateToTab("scanner")}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Conferir na Fatura
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      {latestBill && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            isTarifaSocialOnBill
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100"
              : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isTarifaSocialOnBill
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {isTarifaSocialOnBill ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">
                  {isTarifaSocialOnBill
                    ? "Benefício Identificado na Sua Fatura!"
                    : "Dados Carregados da Sua Conta Recente"}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isTarifaSocialOnBill
                      ? "bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200"
                      : "bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200"
                  }`}
                >
                  {isTarifaSocialOnBill ? "Tarifa Social Ativa" : "Oportunidade"}
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed text-pretty">
                {isTarifaSocialOnBill
                  ? `Sua conta recente (${latestBill.consumo_kwh} kWh) já possui a Tarifa Social aplicada. O simulador abaixo mostra o valor que você deixa de pagar todo mês.`
                  : `Seu consumo lido foi de ${latestBill.consumo_kwh} kWh a R$ ${defaultDetectedTariff.toFixed(2)}/kWh. Se tiver CadÚnico ou BPC, você pode reduzir essa conta.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setTestKwh(defaultDetectedKwh);
                setBaseTariff(defaultDetectedTariff);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              Resetar para Valores da Fatura
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Simulator Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              Simulador Oficial de Desconto da Tarifa Social
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
              Descubra quanto sua família economiza na conta todos os meses conforme as regras vigentes
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800/80 self-start sm:self-auto">
            <Award className="w-3.5 h-3.5" />
            Gratuidade até 80 kWh/mês
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consumo em kWh */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Consumo Mensal na Fatura (kWh)
              </label>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {testKwh <= 80
                  ? "Dentro da gratuidade federal (100% isento)"
                  : testKwh <= 220
                  ? "Dentro do teto de benefício"
                  : "Consumo acima de 220 kWh"}
              </span>
            </div>

            <div className="relative">
              <input
                id="input-tsee-kwh"
                type="number"
                min="0"
                max="1500"
                value={testKwh || ""}
                onChange={(e) =>
                  setTestKwh(
                    e.target.value === ""
                      ? 0
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                placeholder="0"
                className="w-full text-lg font-black p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-rose-500 font-['Space_Grotesk']"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                kWh/mês
              </span>
            </div>
          </div>

          {/* Tarifa Base (R$/kWh) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Tarifa da Concessionária (R$/kWh)
              </label>
            </div>

            <div className="relative">
              <input
                id="input-tsee-tariff"
                type="number"
                step="0.01"
                min="0"
                value={baseTariff || ""}
                onChange={(e) =>
                  setBaseTariff(
                    e.target.value === ""
                      ? 0
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                placeholder="0.85"
                className="w-full text-lg font-black p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-rose-500 font-['Space_Grotesk']"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                R$/kWh
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-pretty">
              Tarifa residencial média com tributos inclusos (TE + TUSD + ICMS + PIS/COFINS).
            </p>
          </div>
        </div>

        {/* Results Cards Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Sem Tarifa Social */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">
              Sem Tarifa Social
            </span>
            <div className="text-2xl font-black text-slate-700 dark:text-slate-300 font-['Space_Grotesk']">
              {formatBRL(tseeCalc.standardCost)}
              <span className="text-xs text-slate-400 font-normal">/mês</span>
            </div>
            <p className="text-[11px] text-slate-400">Cobrança integral sem benefício</p>
          </div>

          {/* Com Tarifa Social */}
          <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 space-y-1">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
              Com Tarifa Social Aplicada
            </span>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-['Space_Grotesk']">
              {formatBRL(tseeCalc.tseeCost)}
              <span className="text-xs text-rose-500 font-normal">/mês</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
              Conta reduzida em {tseeCalc.discountPercentage}%
            </p>
          </div>

          {/* Economia Mensal */}
          <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-1">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
              Economia Todo Mês
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-['Space_Grotesk']">
              {formatBRL(tseeCalc.totalDiscountValue)}
              <span className="text-xs text-emerald-500 font-normal">/mês</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              Valor poupado na sua renda
            </p>
          </div>

          {/* Economia Acumulada em 1 Ano */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-md space-y-1">
            <span className="text-xs text-rose-100 font-semibold block">
              Economia em 1 Ano (12 meses)
            </span>
            <div className="text-2xl font-black font-['Space_Grotesk']">
              {formatBRL(tseeCalc.annualSavings)}
            </div>
            <p className="text-[11px] text-rose-100">
              Dinheiro que fica com a sua família
            </p>
          </div>
        </div>

        {/* Visual Discount Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Proporção da Fatura Poupada
            </span>
            <span className="font-black text-rose-600 dark:text-rose-400">
              {tseeCalc.discountPercentage}% de Desconto Médio Efetivo
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
            <div
              style={{ width: `${Math.min(100, Math.max(0, tseeCalc.discountPercentage))}%` }}
              className="h-full bg-rose-600 transition-all duration-500"
            />
            <div
              style={{ width: `${Math.max(0, 100 - tseeCalc.discountPercentage)}%` }}
              className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
              Economizado: {formatBRL(tseeCalc.totalDiscountValue)} ({tseeCalc.discountPercentage}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              A pagar: {formatBRL(tseeCalc.tseeCost)} ({100 - tseeCalc.discountPercentage}%)
            </span>
          </div>
        </div>

        {/* Tier Breakdown Detailed Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Como o Desconto Funciona no Seu Consumo ({testKwh} kWh)
            </h4>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              Até 80 kWh 100% gratuito
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tseeCalc.tierBreakdown.map((tier, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition ${
                  tier.discountPercent > 0
                    ? "bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800/80 shadow-xs"
                    : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tier.tier}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      tier.discountPercent === 100
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                        : tier.discountPercent > 0
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {tier.discountPercent === 100
                      ? "100% Grátis"
                      : tier.discountPercent > 0
                      ? `${tier.discountPercent}% Desc.`
                      : "Sem Desc."}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Consumo nesta faixa:</span>
                    <strong className="text-slate-900 dark:text-white font-['Space_Grotesk']">
                      {tier.kwhInTier} kWh
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto concedido:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
                      - {formatBRL(tier.discountValue)}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                    <span>Valor residual a pagar:</span>
                    <strong className="text-slate-900 dark:text-white font-['Space_Grotesk']">
                      {formatBRL(tier.costInTier)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Eligibility Quiz (Descubra se tem direito) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Avaliador de Elegibilidade: Você tem Direito?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
              Responda às 4 perguntas rápidas abaixo para conferir seu enquadramento na lei
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Pergunta 1: CadÚnico */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-snug">
              1. Sua família está inscrita no Cadastro Único (CadÚnico)?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "sim", label: "Sim, ativa" },
                { val: "nao", label: "Não possuo" },
                { val: "nao-sei", label: "Não tenho certeza" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setQuizCadUnico(opt.val as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center ${
                    quizCadUnico === opt.val
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pergunta 2: Renda por pessoa */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-snug">
              2. Qual a renda mensal de cada pessoa da família?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { val: "baixa", label: "Até 1/2 salário mínimo (R$ 706)" },
                { val: "media-suporte", label: "Até 3 salários (c/ suporte vital)" },
                { val: "acima", label: "Acima desse valor" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setQuizRenda(opt.val as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center leading-tight ${
                    quizRenda === opt.val
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pergunta 3: BPC/LOAS */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-snug">
              3. Alguém na residência recebe o BPC/LOAS (idoso 65+ ou pessoa com deficiência)?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "sim", label: "Sim, recebe BPC" },
                { val: "nao", label: "Não recebe" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setQuizBpc(opt.val as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center ${
                    quizBpc === opt.val
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pergunta 4: Titularidade da conta */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-snug">
              4. A conta de luz está no CPF de quem possui o CadÚnico/BPC?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "sim", label: "Sim, mesmo CPF" },
                { val: "nao", label: "Não, outro morador" },
                { val: "outro", label: "Nome do proprietário" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setQuizTitularCpf(opt.val as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center leading-tight ${
                    quizTitularCpf === opt.val
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Quiz Result Banner */}
        {eligibilityEvaluation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl border ${eligibilityEvaluation.badgeColor} space-y-2`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {eligibilityEvaluation.title}
              </span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-white/70 dark:bg-slate-900/70">
                {eligibilityEvaluation.badge}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-pretty">
              {eligibilityEvaluation.message}
            </p>
            <div className="pt-1 text-xs font-semibold flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span>Próximo passo: {eligibilityEvaluation.nextStep}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Step by Step Guide & Document Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Como Solicitar Passo a Passo */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-base">
            <Building className="w-5 h-5" />
            Como Solicitar e Garantir o Desconto
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div className="space-y-0.5">
                <strong className="text-slate-900 dark:text-white block">
                  Atualize o CadÚnico no CRAS
                </strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                  O cadastro deve ter sido feito ou atualizado nos últimos 2 anos. Leve documentos de todos os que moram na casa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div className="space-y-0.5">
                <strong className="text-slate-900 dark:text-white block">
                  Cadastramento Automático por CPF
                </strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                  Pela Lei 14.203, a distribuidora deve cruzar os CPFs automaticamente todo mês. Se a conta estiver no seu nome, o benefício é ativado sem precisar sair de casa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div className="space-y-0.5">
                <strong className="text-slate-900 dark:text-white block">
                  Se Não Vier Automático: Ligue para a Distribuidora
                </strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                  Ligue no 0800, WhatsApp ou vá à agência da sua concessionária (Enel, Cemig, CPFL, Equatorial, Neoenergia, etc.) e informe o seu NIS e o código do cliente da conta.
                </p>
              </div>
            </div>
          </div>

          {/* Official Hotlines */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
              MDS / CadÚnico: <strong>Disque 121</strong> (gratuito)
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
              ANEEL (Reclamações): <strong>Disque 167</strong>
            </div>
          </div>
        </div>

        {/* Document Checklist Interativo */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
              <FileCheck className="w-5 h-5 text-rose-600" />
              Documentos Obrigatórios para Levar
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Marque o que já separou
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: "nis",
                title: "NIS (Número de Identificação Social) ou NB (Número do BPC)",
                desc: "Pode ser consultado no app 'Meu CadÚnico' ou no cartão do benefício.",
              },
              {
                id: "cpf",
                title: "Documento oficial com foto (RG, CNH ou Carteira de Trabalho) e CPF",
                desc: "Do responsável familiar e de todos os moradores do domicílio.",
              },
              {
                id: "conta",
                title: "Conta de Luz recente da residência",
                desc: "Necessário conter o 'Código do Cliente' ou 'Número da Instalação'.",
              },
              {
                id: "comprovante",
                title: "Comprovante de residência atualizado",
                desc: "Caso a conta de luz ainda não esteja no nome do titular do CadÚnico.",
              },
              {
                id: "laudo",
                title: "Relatório ou Laudo Médico emitido pelo SUS (se aplicável)",
                desc: "Exclusivo para famílias que demandam uso continuado de aparelhos elétricos de suporte à vida.",
              },
            ].map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => toggleDoc(doc.id)}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                  checkedDocs[doc.id]
                    ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center mt-0.5 shrink-0 transition ${
                    checkedDocs[doc.id]
                      ? "bg-rose-600 border-rose-600 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  }`}
                >
                  {checkedDocs[doc.id] && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="space-y-0.5">
                  <span
                    className={`font-bold text-xs block ${
                      checkedDocs[doc.id] ? "line-through text-slate-500" : ""
                    }`}
                  >
                    {doc.title}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-pretty">
                    {doc.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ Accordion) */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
          <HelpCircle className="w-5 h-5 text-rose-600" />
          Perguntas Frequentes sobre a Tarifa Social
        </div>

        <div className="space-y-2">
          {faqItems.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 text-pretty"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TarifaSocialGuide = React.memo(TarifaSocialGuideComponent);

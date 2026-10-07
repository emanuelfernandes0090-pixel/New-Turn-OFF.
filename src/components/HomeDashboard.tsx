import React from "react";
import {
  Zap,
  FileText,
  Sliders,
  CheckSquare,
  Gift,
  BookOpen,
  History,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Users,
  Target,
  ShieldAlert,
  Sparkles,
  HeartHandshake,
  ExternalLink,
} from "lucide-react";
import {
  AccessibilitySettings,
  AppTab,
  BillScanRecord,
  SavedDiagnosis,
} from "../types";
import { TurnOffLogo } from "./Logo";
import {
  calculateEfficiencyIndex,
  formatBRL,
  formatNumber,
} from "../lib/energy";

interface HomeDashboardProps {
  onNavigate?: (tab: AppTab) => void;
  onSelectTab?: (tab: string) => void;
  onOpenTutorial?: () => void;
  diagnoses?: SavedDiagnosis[];
  billScans?: BillScanRecord[];
  completedActions?: string[];
  settings: AccessibilitySettings;
}

const HomeDashboardComponent: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onSelectTab,
  onOpenTutorial,
  diagnoses = [],
  billScans = [],
  completedActions = [],
  settings,
}) => {
  const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
  const safeBillScans = Array.isArray(billScans) ? billScans : [];
  const safeCompleted = Array.isArray(completedActions) ? completedActions : [];

  const latestDiagnosis = safeDiagnoses[0] || null;
  const latestBill = safeBillScans[0] || null;

  const handleNav = (tabKey: string) => {
    let targetTab: AppTab = "home";
    if (tabKey === "diagnostico" || tabKey === "diagnosis") targetTab = "diagnosis";
    else if (tabKey === "leitor" || tabKey === "scanner") targetTab = "scanner";
    else if (tabKey === "simulador" || tabKey === "simulator") targetTab = "simulator";
    else if (tabKey === "payback") targetTab = "payback";
    else if (tabKey === "plano") targetTab = "diagnosis";
    else if (tabKey === "history" || tabKey === "historico") targetTab = "history";
    else if (tabKey === "beneficios" || tabKey === "tarifa-social") targetTab = "tarifa-social";
    else if (tabKey === "seguranca" || tabKey === "safety") targetTab = "safety";
    else if (tabKey === "aprender" || tabKey === "learn") targetTab = "learn";
    else if (tabKey === "home") targetTab = "home";

    if (onNavigate) {
      onNavigate(targetTab);
    }
    if (onSelectTab) {
      onSelectTab(tabKey);
    }
  };

  const efficiencyScore = latestDiagnosis?.result
    ? calculateEfficiencyIndex({
        confidenceScore: latestDiagnosis.result.confidenceScore || 70,
        safetyAlert: !!latestDiagnosis.result.safetyAlert,
        recommendationCount: latestDiagnosis.result.recommendations?.length || 0,
        completedRecommendations: safeCompleted.length,
        goalReached: latestBill?.goalProgress?.reached,
      })
    : 35;

  const quickCards = [
    {
      id: "diagnostico",
      title: "Diagnóstico Energético",
      desc: "Mapeie equipamentos, horas de uso e descubra onde a energia é gasta.",
      icon: Zap,
      color: "bg-emerald-600 text-white",
      badge: latestDiagnosis ? "Atualizar" : "Novo",
    },
    {
      id: "leitor",
      title: "Leitor de Conta",
      desc: "Escaneie sua fatura por foto, PDF ou texto com validação rigorosa.",
      icon: FileText,
      color: "bg-orange-600 text-white",
      badge: safeBillScans.length > 0 ? `${safeBillScans.length} lidas` : "Escanear",
    },
    {
      id: "simulador",
      title: "Simulação",
      desc: "Simule novos hábitos em aparelhos com ações práticas e impacto em tempo real.",
      icon: Sliders,
      color: "bg-sky-500 text-white",
      badge: "Interativo",
    },
    {
      id: "payback",
      title: "Simulador de Payback",
      desc: "Calcule em quantos meses a compra de um aparelho novo com Selo Procel A se paga.",
      icon: CheckSquare,
      color: "bg-purple-600 text-white",
      badge: "Economia Real",
    },
    {
      id: "seguranca",
      title: "Segurança Elétrica",
      desc: "Aprenda a identificar 6 sinais de risco, mitos e verdades e proteja sua família.",
      icon: ShieldAlert,
      color: "bg-red-600 text-white",
      badge: "Prioridade Máxima",
    },
    {
      id: "aprender",
      title: "Guia de Aprendizado",
      desc: "Entenda o medidor de energia, cálculo do kWh e dicas práticas por cômodo.",
      icon: BookOpen,
      color: "bg-blue-600 text-white",
      badge: "Educativo",
    },
    {
      id: "beneficios",
      title: "Tarifa Social (TSEE)",
      desc: "Regra vigente de gratuidade até 80 kWh para famílias cadastradas no CadÚnico.",
      icon: Gift,
      color: "bg-pink-600 text-white",
      badge: "Até 80 kWh grátis",
    },
    {
      id: "historico",
      title: "Histórico & Exportação",
      desc: "Consulte diagnósticos e faturas anteriores, gere backups e compartilhe relatórios.",
      icon: History,
      color: "bg-amber-500 text-white",
      badge: `${safeDiagnoses.length + safeBillScans.length} salvos`,
    },
  ];

  return (
    <div id="home-dashboard" className="space-y-8 animate-in fade-in duration-300">
      {/* Safety Alert Banner if present */}
      {latestDiagnosis?.result?.safetyAlert && (
        <div className="p-4 sm:p-5 rounded-3xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 flex items-start gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base flex items-center gap-2">
              Alerta Crítico: Segurança Elétrica Prioritária
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-red-800 dark:text-red-300">
              Foram registrados sinais como tomada quente, cheiro de queimado ou falta de aterramento/DR.
              <strong> Economizar nunca deve colocar sua família em risco.</strong> Não aumente disjuntores nem faça emendas caseiras. Interrompa o uso do ponto com sinal de aquecimento e consulte um profissional eletricista qualificado.
            </p>
          </div>
        </div>
      )}

      {/* Hero Overview Banner */}
      <div id="home-hero-card" className="rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Background circuit glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <TurnOffLogo size={46} withBadge={true} />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold tracking-wider uppercase border border-emerald-500/30">
                <Zap className="w-3.5 h-3.5" />
                Diagnóstico Residencial Consciente
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-['Space_Grotesk'] leading-tight">
              Entenda exatamente onde sua energia é gasta e reduza com segurança.
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl leading-relaxed">
              {settings.simpleLanguage
                ? "Veja quais aparelhos puxam mais força, simule mudanças nos hábitos e descubra se tem direito ao desconto da Tarifa Social."
                : "Aplicativo desenvolvido pelo projeto GT-02 do 3º Técnico em Sistemas de Energia Renovável da EEEP Dom Walfrido Teixeira Vieira. Cálculos físicos com duty cycle real, leitura de faturas e segurança elétrica em primeiro lugar."}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                id="btn-hero-new-diagnosis"
                onClick={() => handleNav("diagnostico")}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer text-center whitespace-nowrap"
              >
                <Zap className="w-4 h-4 fill-current shrink-0" />
                <span>
                  {latestDiagnosis ? "Atualizar Diagnóstico" : "Fazer Diagnóstico"}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0 hidden sm:inline" />
              </button>
              <button
                id="btn-hero-scan-bill"
                onClick={() => handleNav("leitor")}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer text-center whitespace-nowrap"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Escanear Conta</span>
              </button>
            </div>
          </div>

          {/* Efficiency Index Box */}
          <div id="home-efficiency-box" className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 space-y-4 text-center lg:text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
                Índice de Eficiência
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[11px] font-bold">
                {efficiencyScore >= 75 ? "Ótimo Controle" : efficiencyScore >= 50 ? "Regular" : "Atenção"}
              </span>
            </div>

            <div className="flex items-baseline justify-center lg:justify-start gap-2">
              <span className="text-5xl font-black font-['Space_Grotesk'] tracking-tight">
                {efficiencyScore}
              </span>
              <span className="text-emerald-300 font-semibold text-lg">/ 100</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(5, efficiencyScore))}%` }}
              />
            </div>

            <div className="text-xs text-emerald-100/70 space-y-1">
              <p>
                {latestDiagnosis?.input
                  ? `Baseado no consumo de ${formatNumber(latestDiagnosis.input.monthlyKwh)} kWh/mês e ${latestDiagnosis.result?.estimates?.length || 0} aparelhos cadastrados.`
                  : "Complete seu primeiro diagnóstico para calcular o índice preciso."}
              </p>
              {latestBill?.goalProgress && (
                <p className="font-semibold text-emerald-300">
                  {latestBill.goalProgress.reached
                    ? `✓ Meta atingida: ${formatNumber(latestBill.goalProgress.differenceKwh)} kWh abaixo do limite!`
                    : `Faltam ${formatNumber(Math.abs(latestBill.goalProgress.differenceKwh))} kWh para a meta.`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Latest Diagnosis Summary Highlights (If available) */}
      {latestDiagnosis?.result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Consumo Mensal Informado
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
              {formatNumber(latestDiagnosis.input.monthlyKwh)} <span className="text-sm font-semibold text-slate-500">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {formatBRL(latestDiagnosis.input.billValue)} na fatura
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Consumo dos Equipamentos
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
              {formatNumber(latestDiagnosis.result.totalEstimated)} <span className="text-sm font-semibold text-slate-500">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {latestDiagnosis.result.coherence === "coerente"
                ? "Coerente com a fatura (≤35% dif)"
                : "Diferença relevante observada"}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              Potencial de Economia
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
              {Array.isArray(latestDiagnosis.result.savings?.probable)
                ? `${latestDiagnosis.result.savings.probable[0]}–${latestDiagnosis.result.savings.probable[1]}`
                : "15–30"}{" "}
              <span className="text-sm font-semibold text-slate-500">kWh</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {Array.isArray(latestDiagnosis.result.savings?.probable)
                ? `Cerca de ${formatBRL(latestDiagnosis.result.savings.probable[0] * (latestDiagnosis.result.effectiveCostPerKwh || 1))} a ${formatBRL(latestDiagnosis.result.savings.probable[1] * (latestDiagnosis.result.effectiveCostPerKwh || 1))}/mês`
                : "Economia mensal projetada"}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Por Morador ({latestDiagnosis.input.occupants} pessoas)
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
              {formatNumber(latestDiagnosis.result.kwhPerPerson)} <span className="text-sm font-semibold text-slate-500">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {formatBRL(latestDiagnosis.result.costPerPerson)} por pessoa/mês
            </p>
          </div>
        </div>
      )}

      {/* Quick Navigation Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Módulos do Aplicativo
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Acesse as ferramentas dedicadas
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                id={`card-quick-${card.id}`}
                onClick={() => handleNav(card.id)}
                className="group p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-300/90 dark:border-slate-800 hover:border-emerald-600 dark:hover:border-emerald-500 text-left transition-all hover:shadow-md hover:-translate-y-0.5 space-y-3 cursor-pointer shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`p-2.5 sm:p-3 rounded-2xl ${card.color} shadow-xs group-hover:scale-105 transition-transform shrink-0`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-right truncate">
                      {card.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug text-balance">
                      {card.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-pretty">
                      {card.desc}
                    </p>
                  </div>
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-bold flex items-center gap-1 pt-1 mt-auto">
                  Abrir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Consumers Quick Spotlight */}
      {latestDiagnosis?.result?.topContributors && latestDiagnosis.result.topContributors.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Maiores Consumidores Identificados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Itens com maior peso no consumo da sua residência
              </p>
            </div>
            <button
              id="btn-view-all-plano"
              onClick={() => handleNav("plano")}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Ver Detalhes do Diagnóstico →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {latestDiagnosis.result.topContributors.slice(0, 3).map((item, idx) => {
              const totalEst = latestDiagnosis.result.totalEstimated || 1;
              const share = Math.round((item.monthlyKwh / totalEst) * 100);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {idx + 1}. {item.label}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {share}% do total
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.max(5, share)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>{formatNumber(item.monthlyKwh)} kWh/mês</span>
                    <span>{formatBRL(item.monthlyKwh * (latestDiagnosis.result.effectiveCostPerKwh || 1))}/mês</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Apoia.se Project Support Card - Preservado na base do código, mas só aparece quando ativado explicitamente */}
      {Boolean(import.meta.env.VITE_ENABLE_APOIASE && import.meta.env.VITE_APOIASE_URL) && (
        <div className="pt-2">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <HeartHandshake className="w-5 h-5" />
                <span>Apoie o Projeto Turn OFF</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Iniciativa aberta de educação e cidadania desenvolvida pelos estudantes da EEEP Dom Walfrido Teixeira Vieira (GT-02).
              </p>
            </div>
            <a
              id="link-apoiase-home"
              href={import.meta.env.VITE_APOIASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto self-start px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              Apoiar via Apoia.se
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export const HomeDashboard = React.memo(HomeDashboardComponent);


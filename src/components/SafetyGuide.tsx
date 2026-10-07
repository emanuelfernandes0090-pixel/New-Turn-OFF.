import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Zap,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Phone,
  PhoneCall,
  Info,
  LifeBuoy,
  Search,
  Filter,
  CheckSquare,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  PlugZap,
  Radio,
  Clock,
  Layers,
  X,
} from "lucide-react";
import { AccessibilitySettings } from "../types";

interface SafetyGuideProps {
  settings: AccessibilitySettings;
}

interface MythItem {
  id: string;
  category: "tensao" | "chuveiro" | "fiacao" | "eletro";
  categoryLabel: string;
  title: string;
  verdict: "Falso" | "Perigo Extremo" | "Perigo e Desperdício" | "Perigo";
  reality: string;
  simple: string;
}

interface EmergencyContact {
  number: string;
  name: string;
  service: string;
  description: string;
}

const EMERGENCY_CONTACTS: Record<string, EmergencyContact> = {
  "193": {
    number: "193",
    name: "Corpo de Bombeiros",
    service: "Resgate e Combate a Incêndios",
    description:
      "Acione para princípios de fogo em fiações ou aparelhos (Classe C), resgate de vítimas de choque presas à fonte e desastres com postes ou fios caídos.",
  },
  "192": {
    number: "192",
    name: "SAMU",
    service: "Atendimento Móvel de Urgência",
    description:
      "Acione imediatamente para socorro médico a vítimas de choque elétrico grave, desmaios, paradas cardiorrespiratórias ou queimaduras elétricas.",
  },
  "199": {
    number: "199",
    name: "Defesa Civil",
    service: "Proteção Comunitária e Riscos",
    description:
      "Acione para postes tombados, riscos estruturais com fios caídos em vias públicas, inundações atingindo fiação da rua e deslizamentos.",
  },
};

const MYTHS: MythItem[] = [
  {
    id: "myth-220v",
    category: "tensao",
    categoryLabel: "Tensão & Consumo",
    title: 'Mito: "Equipamentos 220V gastam metade da energia que em 127V"',
    verdict: "Falso",
    reality:
      "A conta de luz cobra por quilowatt-hora (kWh), que é Potência (W) multiplicada pelo tempo. Um ferro de passar de 1.000 Watts consome exatamente a mesma energia em 127V ou 220V. Em 220V, a corrente elétrica (amperes) é menor, o que permite cabos mais finos e menores perdas por aquecimento nos fios em distâncias longas, mas o consumo cobrado na fatura é rigorosamente o mesmo.",
    simple:
      "220V não gasta menos que 110V. O que gasta energia é a potência do aparelho e o tempo que fica ligado.",
  },
  {
    id: "myth-breaker",
    category: "fiacao",
    categoryLabel: "Fiação & Disjuntores",
    title:
      'Mito: "Se o disjuntor do chuveiro está desarmando, basta trocar por um disjuntor maior"',
    verdict: "Perigo Extremo",
    reality:
      "O disjuntor é uma proteção térmica e magnética projetada para proteger os fios dentro da parede contra derretimento e incêndio. Se o disjuntor desarma, significa que a corrente do chuveiro superou o limite de segurança da fiação. Colocar um disjuntor maior sem substituir os condutores por fios de bitola adequada (ex: 6 mm² ou 10 mm²) transformará os fios dentro do conduite em uma resistência incandescente, gerando alto risco de incêndio estrutural.",
    simple:
      "Nunca aumente o disjuntor sem trocar os fios com um eletricista. O disjuntor desarma para a casa não pegar fogo.",
  },
  {
    id: "myth-light-turn-off",
    category: "eletro",
    categoryLabel: "Lâmpadas & Hábitos",
    title:
      'Mito: "Apagar e acender a lâmpada toda hora consome um pico enorme de energia"',
    verdict: "Falso",
    reality:
      "O surto elétrico de partida em lâmpadas LED e eletrônicas dura poucos milissegundos e consome o equivalente a menos de 1 segundo de funcionamento normal. Se você for sair do cômodo por mais de 1 minuto, vale a pena apagar a luz.",
    simple:
      "Pode apagar a luz sempre que sair da sala ou quarto. O pico ao ligar não gasta quase nada.",
  },
  {
    id: "myth-standby",
    category: "eletro",
    categoryLabel: "Standby & Aparelhos",
    title:
      'Mito: "Aparelhos na tomada em modo Standby (luzinha vermelha) não gastam nada"',
    verdict: "Falso",
    reality:
      "Aparelhos como decodificadores de TV por assinatura, videogames, micro-ondas com relógio, receptores e fontes de notebook conectados continuam consumindo de 2 W a 25 W continuamente. Em uma residência média com múltiplos itens, o consumo fantasma de standby pode representar entre 5% e 12% da conta de luz todo mês.",
    simple:
      "As luzinhas e relógios dos aparelhos gastam energia 24 horas por dia se ficarem na tomada.",
  },
  {
    id: "myth-fridge-wall",
    category: "eletro",
    categoryLabel: "Geladeira & Cozinha",
    title:
      'Mito: "Aproximar a geladeira da parede ou colocar roupas para secar atrás é inofensivo"',
    verdict: "Perigo e Desperdício",
    reality:
      "A grade traseira da geladeira (condensador) precisa dissipar o calor extraído de dentro do aparelho para o ar ambiente. Colocar roupas ou encostar/aproximar a geladeira da parede bloqueia a circulação de ar, impedindo a dissipação de calor e fazendo com que o compressor trabalhe sob sobreaquecimento e fique ligado até 30% mais tempo por dia, além de encurtar drasticamente a vida útil do motor.",
    simple:
      "Nunca seque panos ou roupas atrás da geladeira nem a encoste na parede. Deixe ao menos 10 cm de espaço livre para o ar circular.",
  },
  {
    id: "myth-generator",
    category: "fiacao",
    categoryLabel: "Fiação & Disjuntores",
    title:
      'Mito: "Posso ligar um gerador a combustível direto numa tomada da casa durante a falta de energia"',
    verdict: "Perigo Extremo",
    reality:
      "Sem uma chave de transferência reversível (transfer switch) que isole fisicamente a residência da rede pública, a energia do gerador pode retroalimentar a rede da distribuidora (backfeed). Isso coloca em risco imediato de morte eletricistas trabalhando nos postes da rua acreditando que a rede está desenergizada, além de poder danificar ou explodir o gerador quando a energia da concessionária retornar de repente.",
    simple:
      "Nunca plugue gerador direto na tomada sem chave de transferência. Você pode eletrocutar os técnicos na rua e destruir seu gerador.",
  },
  {
    id: "myth-thick-wire",
    category: "fiacao",
    categoryLabel: "Fiação & Disjuntores",
    title:
      'Mito: "Colocar fio mais grosso na instalação da casa toda derruba o valor da conta de luz"',
    verdict: "Falso",
    reality:
      "A bitola do fio afeta as perdas por aquecimento (efeito Joule) de forma mínima nas distâncias curtas de uma residência. Embora fios dimensionados corretamente sejam essenciais para segurança contra incêndios e estabilidade de tensão, o medidor registra o trabalho útil dos aparelhos. Trocar cabos além da norma não derruba a conta; o que reduz a fatura é a eficiência e o tempo de uso dos equipamentos.",
    simple:
      "Fio mais grosso não derruba a conta de luz. Ele serve para proteger a fiação contra fogo e sobrecarga, não para diminuir o consumo dos aparelhos.",
  },
  {
    id: "myth-ev-charging-current",
    category: "fiacao",
    categoryLabel: "Carregador & Veículo Elétrico",
    title:
      'Mito: "Carregar o carro elétrico em corrente mais baixa economiza dezenas de reais na conta"',
    verdict: "Falso",
    reality:
      "Reduzir a corrente (amperagem) no carregador reduz a potência (P = V × I), mas duplica o tempo necessário para completar a mesma recarga (E = P × t). O total de kWh faturados na conta é quase rigorosamente idêntico. A diminuição da corrente é excelente para segurança térmica da fiação e para não derrubar o disjuntor da casa, mas a verdadeira economia vem de usar a frenagem regenerativa e não carregar acima de 80% no dia a dia.",
    simple:
      "Carregar mais fraco faz o carro demorar mais tempo para encher, puxando os mesmos kWh no final. Isso protege os fios de aquecer, mas não diminui a conta de luz.",
  },
  {
    id: "myth-benjamim-small",
    category: "eletro",
    categoryLabel: "Tomadas & Adaptadores",
    title:
      'Mito: "Benjamim/T de tomada aguenta qualquer coisa desde que os aparelhos sejam pequenos"',
    verdict: "Perigo",
    reality:
      "A soma das correntes elétricas de vários aparelhos pequenos ligados ao mesmo tempo pode superar facilmente o limite do adaptador (geralmente 10A) e da própria tomada. Essa sobrecarga de contato gera superaquecimento invisível, derretimento de plástico e faíscas, figurando entre as principais causas de curtos-circuitos residenciais.",
    simple:
      "Vários aparelhos pequenos no mesmo T somam força de corrente e podem superaquecer a tomada e iniciar fogo.",
  },
  {
    id: "myth-hidden-wire-risk",
    category: "fiacao",
    categoryLabel: "Fiação & Disjuntores",
    title:
      'Mito: "Se o fio não está desencapado visivelmente à vista, não há risco de choque"',
    verdict: "Falso",
    reality:
      "O isolamento de cabos elétricos antigos se deteriora internamente com o tempo (ressecamento térmico, perda de flexibilidade e roeduras de insetos/roedores dentro de conduítes e forros) sem nenhum sinal visível externo. Isso pode energizar paredes úmidas e carcaças de eletrodomésticos, gerando risco severo de choque. Instalações antigas devem passar por inspeção periódica com eletricista habilitado.",
    simple:
      "Fios velhos estragam por dentro da parede mesmo parecendo perfeitos por fora. Peça revisão periódica com eletricista.",
  },
  {
    id: "myth-shower-season-switch",
    category: "chuveiro",
    categoryLabel: "Chuveiro Elétrico",
    title:
      'Mito: "A chave Verão/Inverno do chuveiro só deixa a água mais quente, não muda a conta"',
    verdict: "Falso",
    reality:
      "A posição Inverno aciona uma seção de menor comprimento da resistência, resultando em maior potência elétrica em Watts (ex: 5.500 W a 7.500 W vs. 3.500 W no Verão). Isso significa mais quilowatts-hora consumidos a cada minuto de banho. Manter o chuveiro na posição Verão sempre que o clima estiver ameno reduz entre 30% e 40% o gasto elétrico de cada banho.",
    simple:
      "A posição Inverno gasta muito mais energia por minuto porque aciona a potência máxima da resistência. Use Verão para economizar.",
  },
];

interface ChecklistQuestion {
  id: string;
  title: string;
  explanation: string;
  recommendation: string;
  severity: "critico" | "alto" | "moderado";
}

const CHECKLIST_ITEMS: ChecklistQuestion[] = [
  {
    id: "check-dr",
    title: "Possui Dispositivo DR (Diferencial Residual) instalado no quadro?",
    explanation:
      "O DR desarma o circuito em 30 milissegundos se alguém levar um choque ou se houver fuga de corrente em área úmida.",
    recommendation:
      "Contrate um eletricista para instalar um IDR de 30mA no quadro geral. É obrigatório pela norma NBR 5410 para proteger vidas.",
    severity: "critico",
  },
  {
    id: "check-shower-conn",
    title: "O chuveiro está conectado com conector cerâmico ou WAGO blindado?",
    explanation:
      "Chuveiros puxam entre 25A e 35A. Fita isolante comum resseca, derrete e carboniza a conexão com o tempo.",
    recommendation:
      "Substitua imediatamente emendas com fita isolante por conector de porcelana bipolar ou conectores de mola WAGO 221 de 6mm².",
    severity: "critico",
  },
  {
    id: "check-hot-outlets",
    title: "Todas as tomadas e plugues permanecem frios durante o uso?",
    explanation:
      "Tomadas mornas ou quentes indicam mau contato interno, folga mecânica nas lâminas ou sobrecarga de corrente.",
    recommendation:
      "Desconecte o aparelho e não utilize a tomada até que um profissional substitua o mecanismo por um modelo certificado pelo INMETRO.",
    severity: "alto",
  },
  {
    id: "check-grounding",
    title: "Eletrodomésticos de metal usam os 3 pinos com aterramento real?",
    explanation:
      "O terceiro pino conduz correntes de fuga para a terra. Quebrar o pino faz com que seu corpo seja o caminho do choque.",
    recommendation:
      "Nunca quebre o pino de terra. Se a tomada for antiga de 2 furos, solicite a troca da tomada e a passagem do condutor de proteção (terra).",
    severity: "alto",
  },
  {
    id: "check-benjamim",
    title: "Aparelhos pesados (air fryer, micro-ondas) usam tomadas individuais?",
    explanation:
      "Ligar mais de um aparelho de alta potência em um benjamim ('T') multiplica a corrente e derrete o plástico do adaptador.",
    recommendation:
      "Cada eletrodoméstico de aquecimento ou motor pesado deve ter sua tomada exclusiva de 20A sem adaptadores.",
    severity: "alto",
  },
  {
    id: "check-panel-status",
    title: "O quadro de luz tem tampa fechada e disjuntores identificados?",
    explanation:
      "Barramentos e fios soltos à vista oferecem perigo mortal em caso de contato acidental ou curiosidade infantil.",
    recommendation:
      "Mantenha o painel sempre fechado com espelho de proteção e etiquete qual disjuntor desliga cada cômodo da residência.",
    severity: "moderado",
  },
  {
    id: "check-wiring-age",
    title: "A fiação da residência tem menos de 20 anos ou foi revisada?",
    explanation:
      "Com o passar das décadas, o PVC dos cabos resseca, perde flexibilidade e pode trincar dentro dos conduítes.",
    recommendation:
      "Se a casa tem mais de 20 anos sem reforma elétrica, agende uma inspeção termográfica e de isolamento com técnico qualificado.",
    severity: "moderado",
  },
  {
    id: "check-wet-safety",
    title: "Tomadas de banheiros e pias ficam distantes de respingos d'água?",
    explanation:
      "A umidade somada ao vapor condutivo reduz a resistência do ar e facilita arcos elétricos e choques no manuseio.",
    recommendation:
      "Mantenha distância mínima de 60 cm de cubas e torneiras, ou instale tampas protetoras IP44 contra respingos.",
    severity: "moderado",
  },
];

export const SafetyGuide: React.FC<SafetyGuideProps> = ({ settings }) => {
  const [activeTab, setActiveTab] = useState<"checklist" | "sos" | "guardians" | "signs" | "myths">(
    "checklist",
  );
  const [openMyth, setOpenMyth] = useState<string | null>("myth-breaker");
  const [mythFilter, setMythFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Estado para confirmação de chamada de emergência (previne discagem acidental)
  const [pendingCall, setPendingCall] = useState<EmergencyContact | null>(null);

  // Checklist state: key = questionId, value = "sim" | "nao" | "nao_sei"
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, "sim" | "nao" | "nao_sei">>({});

  const handleAnswer = (id: string, answer: "sim" | "nao" | "nao_sei") => {
    setChecklistAnswers((prev) => ({ ...prev, [id]: answer }));
  };

  const resetChecklist = () => {
    setChecklistAnswers({});
  };

  // Checklist score calculation
  const totalQuestions = CHECKLIST_ITEMS.length;
  const answeredCount = Object.keys(checklistAnswers).length;
  const safeCount = Object.values(checklistAnswers).filter((v) => v === "sim").length;

  const safetyScore = Math.round((safeCount / totalQuestions) * 100);

  const getSafetyVerdict = () => {
    if (answeredCount === 0) return null;
    if (safeCount === totalQuestions) {
      return {
        level: "seguro",
        title: "Instalação Segura e Conforme",
        badge: "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
        desc: "Sua residência adota as principais diretrizes de segurança da NBR 5410. Continue mantendo revisões periódicas.",
      };
    }
    if (safeCount >= 5) {
      return {
        level: "atencao",
        title: "Atenção: Pontos de Risco Moderado",
        badge: "bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300",
        desc: "Existem vulnerabilidades elétricas que merecem intervenção preventiva antes que causem falhas ou acidentes.",
      };
    }
    return {
      level: "critico",
      title: "Alerta Crítico: Risco de Choque ou Incêndio",
      badge: "bg-red-100 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300",
      desc: "Foram identificadas não-conformidades graves que comprometem a segurança da sua família. Recomenda-se avaliação de um eletricista.",
    };
  };

  const verdict = getSafetyVerdict();

  // Filtered myths
  const filteredMyths = useMemo(() => {
    return MYTHS.filter((myth) => {
      const matchesCategory = mythFilter === "todos" || myth.category === mythFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        myth.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        myth.reality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        myth.simple.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [mythFilter, searchQuery]);

  // Handler para solicitar confirmação antes de discar
  const handleRequestCall = (numberKey: "193" | "192" | "199") => {
    const contact = EMERGENCY_CONTACTS[numberKey];
    if (contact) {
      setPendingCall(contact);
    }
  };

  const handleConfirmCall = () => {
    if (pendingCall) {
      const telUrl = `tel:${pendingCall.number}`;
      setPendingCall(null);
      window.location.href = telUrl;
    }
  };

  return (
    <div id="safety-guide-view" className="space-y-8 animate-in fade-in duration-300 relative">
      {/* Header com Identidade Visual Sóbria de Proteção à Vida */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/80 dark:bg-red-950/70 text-red-800 dark:text-red-300 text-xs font-bold uppercase tracking-wider border border-red-200 dark:border-red-800/80">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          Segurança da Vida em Primeiro Lugar
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] tracking-tight text-balance">
              Segurança Elétrica Residencial & Prevenção
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed text-pretty mt-1">
              {settings.simpleLanguage
                ? "Economizar energia nunca deve colocar sua vida ou sua casa em perigo. Faça a auto-inspeção da sua casa e veja como agir em imprevistos."
                : "Diretrizes práticas de inspeção preventiva fundamentadas na ABNT NBR 5410, procedimentos em caso de emergência e desmistificação técnica."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRequestCall("193")}
              className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap min-h-[44px]"
              title="Abrir confirmação para chamada de emergência 193 - Bombeiros"
            >
              <PhoneCall className="w-4 h-4" />
              <span>SOS 193</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação Fluida do Módulo */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar">
          {[
            { id: "checklist", label: "Auto-Inspeção de Riscos", icon: CheckSquare },
            { id: "sos", label: "SOS & Emergências", icon: LifeBuoy },
            { id: "guardians", label: "4 Guardiões da NBR 5410", icon: ShieldCheck },
            { id: "signs", label: "Sinais de Perigo", icon: AlertTriangle },
            { id: "myths", label: "Mitos & Fatos", icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-red-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 1: CHECKLIST DE AUTO-INSPEÇÃO RESIDENCIAL */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                    <CheckSquare className="w-4 h-4" />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Checklist de Segurança Preventiva (NBR 5410)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                  Inspeção 100% visual e segura. Responda às perguntas abaixo para mapear a situação elétrica da sua residência:
                </p>
              </div>

              {answeredCount > 0 && (
                <button
                  onClick={resetChecklist}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar teste
                </button>
              )}
            </div>

            {/* Painel de Resultado do Diagnóstico */}
            {verdict && (
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  verdict.level === "seguro"
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60"
                    : verdict.level === "atencao"
                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                    : "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${verdict.badge}`}>
                        {verdict.title}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {safeCount} de {totalQuestions} conformes ({safetyScore}%)
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-pretty leading-relaxed">
                      {verdict.desc}
                    </p>
                  </div>

                  <div className="w-full sm:w-48 space-y-1.5 shrink-0">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Índice de Segurança</span>
                      <span>{safetyScore}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          verdict.level === "seguro"
                            ? "bg-emerald-500"
                            : verdict.level === "atencao"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${safetyScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lista das 8 Perguntas */}
            <div className="space-y-4">
              {CHECKLIST_ITEMS.map((item, idx) => {
                const answer = checklistAnswers[item.id];
                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      answer === "sim"
                        ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40"
                        : answer === "nao"
                        ? "bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900/40"
                        : answer === "nao_sei"
                        ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 pl-7 leading-relaxed text-pretty">
                          {item.explanation}
                        </p>
                      </div>

                      {/* Botões de Ação Sim / Não / Não Sei */}
                      <div className="flex items-center gap-2 pl-7 md:pl-0 shrink-0 self-start">
                        <button
                          type="button"
                          onClick={() => handleAnswer(item.id, "sim")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                            answer === "sim"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sim</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAnswer(item.id, "nao")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                            answer === "nao"
                              ? "bg-red-600 text-white border-red-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Não</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAnswer(item.id, "nao_sei")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                            answer === "nao_sei"
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Não Sei</span>
                        </button>
                      </div>
                    </div>

                    {/* Recomendação Corretiva quando marcado como Não ou Não Sei */}
                    {(answer === "nao" || answer === "nao_sei") && (
                      <div className="mt-3.5 pt-3 border-t border-red-100 dark:border-red-950 flex items-start gap-2 text-xs text-red-900 dark:text-red-300 leading-relaxed pl-7">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Como corrigir:</strong> {item.recommendation}
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

      {/* SEÇÃO 2: SOS & PROCEDIMENTOS DE EMERGÊNCIA */}
      {activeTab === "sos" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 bg-red-900 text-white rounded-3xl shadow-lg space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 text-red-200 text-xs font-bold uppercase tracking-wider">
                <LifeBuoy className="w-3.5 h-3.5 text-red-400" />
                Guia de Ação Imediata
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-balance">
                O Que Fazer em Situações de Emergência Elétrica
              </h2>
              <p className="text-xs sm:text-sm text-red-200 text-pretty">
                Mantenha a calma. Em acidentes elétricos, os primeiros segundos determinam a preservação da vida.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Choque Elétrico */}
              <div className="p-5 bg-red-950/70 rounded-2xl border border-red-800/80 space-y-3">
                <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                  <Zap className="w-4 h-4 text-amber-400" />
                  1. Vítima de Choque Elétrico
                </div>
                <ul className="text-xs text-red-200/90 space-y-2 list-disc list-inside leading-relaxed text-pretty">
                  <li>
                    <strong>NUNCA toque na vítima diretamente</strong> enquanto ela estiver em contato com a fonte energizada.
                  </li>
                  <li>
                    <strong>Desligue o disjuntor geral imediatamente</strong> no quadro de luz da casa.
                  </li>
                  <li>
                    Se não puder desligar a chave, use <strong>material isolante seco</strong> (cabo de vassoura de madeira, plástico rígido) para afastar o condutor.
                  </li>
                  <li>
                    Verifique respiração e pulso. Acione os canais de socorro imediatamente.
                  </li>
                </ul>
              </div>

              {/* Incêndio Elétrico */}
              <div className="p-5 bg-red-950/70 rounded-2xl border border-red-800/80 space-y-3">
                <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                  <Flame className="w-4 h-4 text-red-400" />
                  2. Princípio de Fogo Elétrico
                </div>
                <ul className="text-xs text-red-200/90 space-y-2 list-disc list-inside leading-relaxed text-pretty">
                  <li>
                    <strong>NUNCA jogue água</strong> sobre fiação ou aparelhos elétricos (fogo Classe C). A água conduz eletricidade e causará choque letal.
                  </li>
                  <li>
                    <strong>Desligue o disjuntor geral</strong> da residência antes de qualquer tentativa de combate.
                  </li>
                  <li>
                    Utilize apenas <strong>extintor de Pó Químico Seco (PQS) ou Gás Carbônico (CO2)</strong>.
                  </li>
                  <li>
                    Evacue a residência se a fumaça ou chamas se alastrarem e acione o Corpo de Bombeiros.
                  </li>
                </ul>
              </div>

              {/* Fios Caídos na Rua */}
              <div className="p-5 bg-red-950/70 rounded-2xl border border-red-800/80 space-y-3">
                <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  3. Cabos Rompidos na Rua
                </div>
                <ul className="text-xs text-red-200/90 space-y-2 list-disc list-inside leading-relaxed text-pretty">
                  <li>
                    Mantenha distância de <strong>no mínimo 10 metros</strong> do cabo caído e de poças de água próximas.
                  </li>
                  <li>
                    Ao se afastar, dê <strong>passos curtos sem erguer os pés do chão</strong> para evitar choque por diferença de potencial (tensão de passo).
                  </li>
                  <li>
                    Considere todo cabo como energizado mesmo sem faíscas.
                  </li>
                  <li>
                    Alerte pedestres para não se aproximarem e chame a concessionária de energia e os bombeiros.
                  </li>
                </ul>
              </div>
            </div>

            {/* Telefones de Emergência com Proteção contra Toque Acidental */}
            <div className="p-4 rounded-2xl bg-red-950 border border-red-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-red-200 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-red-400 shrink-0" />
                Linhas de Emergência (Requer confirmação para discar):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleRequestCall("193")}
                  className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[44px] transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>193 - Bombeiros</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestCall("192")}
                  className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[44px] transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>192 - SAMU</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestCall("199")}
                  className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[44px] transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>199 - Defesa Civil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: OS 4 GUARDIÕES DA NBR 5410 */}
      {activeTab === "guardians" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Os 4 Componentes de Proteção da NBR 5410
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                Cada dispositivo tem uma função específica e insubstituível. Conheça como eles atuam em conjunto para proteger vidas e equipamentos:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DR */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-bold text-sm">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    1. Interruptor DR (Diferencial Residual)
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    Salva Vidas
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  <strong>O que faz:</strong> Compara a corrente que entra pela fase com a que retorna pelo neutro. Se houver qualquer fuga a partir de 30 miliamperes (como alguém tomando choque), ele desarma o circuito em menos de 0,03 segundo.
                </p>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800/60 text-[11px] text-slate-600 dark:text-slate-300">
                  <strong>Onde é obrigatório:</strong> Banheiros, cozinhas, lavanderias e circuitos externos.
                </div>
              </div>

              {/* DPS */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 dark:text-amber-200 font-bold text-sm">
                    <Cpu className="w-4 h-4 text-amber-600" />
                    2. Dispositivo DPS (Proteção contra Surtos)
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    Salva Aparelhos
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  <strong>O que faz:</strong> Absorve picos de tensão transitórios provocados por descargas atmosféricas (raios nas proximidades) e manobras da rede da distribuidora, desviando o excesso para o aterramento antes de queimar TVs, geladeiras e computadores.
                </p>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-800/60 text-[11px] text-slate-600 dark:text-slate-300">
                  <strong>Instalação:</strong> No quadro geral de distribuição (QDC), entre as fases/neutro e a barra de terra.
                </div>
              </div>

              {/* Aterramento */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-bold text-sm">
                    <PlugZap className="w-4 h-4 text-emerald-600" />
                    3. Condutor de Proteção (Fio Terra)
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    Fio Verde
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  <strong>O que faz:</strong> Conecta a carcaça de metal dos eletrodomésticos a uma haste de cobre fincada no solo. Se um fio interno encostar no chassi da máquina de lavar ou micro-ondas, a eletricidade escoa para a terra sem passar pelo usuário.
                </p>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-800/60 text-[11px] text-slate-600 dark:text-slate-300">
                  <strong>Atenção:</strong> Nunca quebre o pino do meio dos plugues; ele é a sua ligação com a haste de terra.
                </div>
              </div>

              {/* DTM */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-sm">
                    <Radio className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    4. Disjuntor Termomagnético (DTM)
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300">
                    Protege os Fios
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                  <strong>O que faz:</strong> Desarma automaticamente quando a corrente ultrapassa o limite contínuo do circuito (proteção térmica) ou quando ocorre um curto-circuito franco (proteção magnética). Ele impede que a fiação dentro do conduíte derreta e incendeie a casa.
                </p>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                  <strong>Importante:</strong> O disjuntor NÃO protege contra choque elétrico leve (por isso o DR é indispensável).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: 6 SINAIS VISÍVEIS DE PERIGO & REGRAS DE OURO */}
      {activeTab === "signs" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>6 Sinais Visíveis de Perigo Imediato (Inspeção Segura)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Tomadas ou Plugues Aquecendo",
                  desc: "Indica mau contato ou sobrecarga contínua. O plástico pode derreter e iniciar fogo dentro da caixa de alvenaria.",
                },
                {
                  title: "Cheiro de Queimado ou Manchas Escuras",
                  desc: "Manchas pretas ao redor dos orifícios revelam arco elétrico interno ou temperatura muito acima do limite do isolamento.",
                },
                {
                  title: "Faíscas ao Conectar Equipamentos",
                  desc: "Pequenos arcos visíveis ao plugar aparelhos pesados exigem revisão nas lâminas de contato da tomada.",
                },
                {
                  title: "Fios Descascados ou Emendas Expostas",
                  desc: "Fita isolante ressecada ou cabos expostos oferecem risco de choque letal direto, especialmente para crianças e animais.",
                },
                {
                  title: "Disjuntor Desarmando Frequente",
                  desc: "A fiação do circuito está sofrendo corrente acima da capacidade contínua segura calculada para os condutores.",
                },
                {
                  title: 'Múltiplos "Benjamins" e Extensões',
                  desc: "Ligar micro-ondas, air fryer ou torneira elétrica na mesma extensão multiplica perigosamente a corrente sobre os fios.",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs sm:text-sm">
                    <Flame className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-red-950 dark:text-red-200/80 leading-relaxed text-pretty">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* O que NUNCA fazer */}
          <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-md space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold uppercase tracking-wider">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                Regras de Ouro Inegociáveis
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-balance">
                O Que NUNCA Fazer na Instalação Elétrica
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <strong className="text-red-400 block text-sm">
                  1. Não quebre nem remova o pino central (terra)
                </strong>
                <p className="text-slate-300 leading-relaxed text-xs text-pretty">
                  O terceiro pino conduz fugas elétricas de carcaças metálicas para o solo. Sem ele, seu corpo vira o condutor de fuga ao encostar na máquina de lavar ou micro-ondas.
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <strong className="text-red-400 block text-sm">
                  2. Nunca troque disjuntor sem trocar a fiação
                </strong>
                <p className="text-slate-300 leading-relaxed text-xs text-pretty">
                  Disjuntor maior não "dá mais força", apenas deixa os fios esquentarem até derreter o PVC dentro da sua parede, gerando incêndio invisível.
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <strong className="text-red-400 block text-sm">
                  3. Nunca manuseie aparelhos molhado ou descalço
                </strong>
                <p className="text-slate-300 leading-relaxed text-xs text-pretty">
                  A água e a umidade nos pés reduzem a resistência elétrica natural da pele de milhares de Ohms para quase zero, tornando qualquer choque leve potencialmente fatal.
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <strong className="text-red-400 block text-sm">
                  4. Não improvise fusíveis com papel alumínio ou fios de cobre
                </strong>
                <p className="text-slate-300 leading-relaxed text-xs text-pretty">
                  Gambiarra em circuitos de proteção anula completamente a segurança e faz com que toda a corrente do curto flua até carbonizar a rede.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 5: MITOS & FATOS COM PESQUISA E CATEGORIAS */}
      {activeTab === "myths" && (
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-red-600" />
                Mitos Comuns vs Realidade Técnica Comprovada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-pretty">
                Clique em cada mito para entender a explicação física e como economizar sem correr riscos:
              </p>
            </div>

            {/* Barra de Pesquisa Rápida */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar mito ou aparelho..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          {/* Filtros por Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "todos", label: "Todos os Mitos" },
              { id: "tensao", label: "110V vs 220V" },
              { id: "fiacao", label: "Fiação & Disjuntores" },
              { id: "chuveiro", label: "Chuveiro Elétrico" },
              { id: "eletro", label: "Aparelhos & Standby" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setMythFilter(f.id)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  mythFilter === f.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Acordeão de Mitos */}
          <div className="space-y-3">
            {filteredMyths.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum mito encontrado para essa busca. Tente outras palavras-chave.
              </div>
            ) : (
              filteredMyths.map((myth) => {
                const isOpen = openMyth === myth.id;
                return (
                  <div
                    key={myth.id}
                    id={`myth-accordion-${myth.id}`}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMyth(isOpen ? null : myth.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                            myth.verdict === "Perigo Extremo"
                              ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                              : myth.verdict === "Perigo" || myth.verdict === "Perigo e Desperdício"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {myth.verdict}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                          {myth.title}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 shrink-0">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                        <p className="text-pretty">
                          {settings.simpleLanguage ? myth.simple : myth.reality}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EXTRA DE CHAMADA DE EMERGÊNCIA (EVITA TOQUE ACIDENTAL) */}
      {pendingCall && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-red-200 dark:border-red-900/60 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3
                    id="emergency-dialog-title"
                    className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-['Space_Grotesk'] leading-tight"
                  >
                    Confirmar Chamada de Emergência
                  </h3>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">
                    Número: {pendingCall.number} • {pendingCall.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingCall(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar sem ligar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Prevenção de Chamada Acidental:</span>
              </div>
              <p className="leading-relaxed text-pretty">
                Você clicou para discar para o <strong>{pendingCall.name} ({pendingCall.number})</strong>.
              </p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-pretty">
                {pendingCall.description}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
              Deseja realmente abrir o discador do seu aparelho para ligar para este serviço de emergência agora?
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleConfirmCall}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] transition"
              >
                <Phone className="w-4 h-4" />
                <span>Sim, Ligar Agora ({pendingCall.number})</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingCall(null)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm cursor-pointer min-h-[44px] transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Zap,
  Activity,
  FileScan,
  Sliders,
  ShoppingBag,
  ShieldAlert,
  GraduationCap,
  HeartHandshake,
  History,
  Bot,
  MapPin,
  ListChecks,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  ExternalLink,
  Layers,
  Settings,
  Share2,
  User,
  Cloud,
} from "lucide-react";
import { AppTab } from "../types";

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: AppTab) => void;
  onOpenAccessibility?: () => void;
  onOpenAuth?: () => void;
  onOpenShare?: () => void;
  onOpenAIChat?: () => void;
}

interface StepTheme {
  primaryHex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconText: string;
  nextBtnBg: string;
  actionBg: string;
  actionText: string;
  actionBorder: string;
  accentText: string;
}

interface TutorialStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  location: string;
  description: string;
  steps: string[];
  targetId: string;
  secondaryTargetId?: string;
  targetTab: AppTab;
  actionTab?: AppTab;
  actionType?: "navigate" | "accessibility" | "auth" | "share" | "aichat";
  actionLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: StepTheme;
}

const THEMES: Record<string, StepTheme> = {
  emerald: {
    primaryHex: "#059669",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-200 dark:border-emerald-800",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    nextBtnBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    actionBg: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50",
    actionText: "text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-white",
    actionBorder: "border-emerald-300/80 dark:border-emerald-700/60",
    accentText: "text-emerald-600 dark:text-emerald-400",
  },
  teal: {
    // Diagnóstico Residencial: Verde Esmeralda / Teal (#087F5B / #0D9488)
    primaryHex: "#0D9488",
    badgeBg: "bg-teal-50 dark:bg-teal-950/60",
    badgeText: "text-teal-700 dark:text-teal-300",
    badgeBorder: "border-teal-200 dark:border-teal-800",
    iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    iconText: "text-teal-600 dark:text-teal-400",
    nextBtnBg: "bg-teal-600 hover:bg-teal-700 text-white",
    actionBg: "bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50",
    actionText: "text-teal-800 dark:text-teal-200 hover:text-teal-900 dark:hover:text-white",
    actionBorder: "border-teal-300/80 dark:border-teal-700/60",
    accentText: "text-teal-600 dark:text-teal-400",
  },
  orange: {
    // Leitor de Contas / Scanner: Laranja / Âmbar (#EA580C)
    primaryHex: "#EA580C",
    badgeBg: "bg-orange-50 dark:bg-orange-950/60",
    badgeText: "text-orange-700 dark:text-orange-300",
    badgeBorder: "border-orange-200 dark:border-orange-800",
    iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    iconText: "text-orange-600 dark:text-orange-400",
    nextBtnBg: "bg-orange-600 hover:bg-orange-700 text-white",
    actionBg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50",
    actionText: "text-orange-800 dark:text-orange-200 hover:text-orange-900 dark:hover:text-white",
    actionBorder: "border-orange-300/80 dark:border-orange-700/60",
    accentText: "text-orange-600 dark:text-orange-400",
  },
  sky: {
    // Simulador de Mudança de Hábitos / Nuvem: Azul Céu (#0284C7)
    primaryHex: "#0284C7",
    badgeBg: "bg-sky-50 dark:bg-sky-950/60",
    badgeText: "text-sky-700 dark:text-sky-300",
    badgeBorder: "border-sky-200 dark:border-sky-800",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    iconText: "text-sky-600 dark:text-sky-400",
    nextBtnBg: "bg-sky-600 hover:bg-sky-700 text-white",
    actionBg: "bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50",
    actionText: "text-sky-800 dark:text-sky-200 hover:text-sky-900 dark:hover:text-white",
    actionBorder: "border-sky-300/80 dark:border-sky-700/60",
    accentText: "text-sky-600 dark:text-sky-400",
  },
  violet: {
    // Simulador de Payback: Violeta / Índigo (#7C3AED)
    primaryHex: "#7C3AED",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-200 dark:border-purple-800",
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    iconText: "text-purple-600 dark:text-purple-400",
    nextBtnBg: "bg-purple-600 hover:bg-purple-700 text-white",
    actionBg: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50",
    actionText: "text-purple-800 dark:text-purple-200 hover:text-purple-900 dark:hover:text-white",
    actionBorder: "border-purple-300/80 dark:border-purple-700/60",
    accentText: "text-purple-600 dark:text-purple-400",
  },
  red: {
    // Segurança Elétrica NBR 5410: Vermelho / Carmim (#DC2626)
    primaryHex: "#DC2626",
    badgeBg: "bg-red-50 dark:bg-red-950/60",
    badgeText: "text-red-700 dark:text-red-300",
    badgeBorder: "border-red-200 dark:border-red-800",
    iconBg: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
    iconText: "text-red-600 dark:text-red-400",
    nextBtnBg: "bg-red-600 hover:bg-red-700 text-white",
    actionBg: "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50",
    actionText: "text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-white",
    actionBorder: "border-red-300/80 dark:border-red-700/60",
    accentText: "text-red-600 dark:text-red-400",
  },
  indigo: {
    // Guia Educativo / Acessibilidade: Índigo (#4F46E5)
    primaryHex: "#4F46E5",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    badgeBorder: "border-indigo-200 dark:border-indigo-800",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    iconText: "text-indigo-600 dark:text-indigo-400",
    nextBtnBg: "bg-indigo-600 hover:bg-indigo-700 text-white",
    actionBg: "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50",
    actionText: "text-indigo-800 dark:text-indigo-200 hover:text-indigo-900 dark:hover:text-white",
    actionBorder: "border-indigo-300/80 dark:border-indigo-700/60",
    accentText: "text-indigo-600 dark:text-indigo-400",
  },
  pink: {
    // Tarifa Social TSEE: Rosa / Pink (#DB2777)
    primaryHex: "#DB2777",
    badgeBg: "bg-pink-50 dark:bg-pink-950/60",
    badgeText: "text-pink-700 dark:text-pink-300",
    badgeBorder: "border-pink-200 dark:border-pink-800",
    iconBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20",
    iconText: "text-pink-600 dark:text-pink-400",
    nextBtnBg: "bg-pink-600 hover:bg-pink-700 text-white",
    actionBg: "bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/50",
    actionText: "text-pink-800 dark:text-pink-200 hover:text-pink-900 dark:hover:text-white",
    actionBorder: "border-pink-300/80 dark:border-pink-700/60",
    accentText: "text-pink-600 dark:text-pink-400",
  },
  amber: {
    // Histórico: Âmbar / Ouro (#D97706)
    primaryHex: "#D97706",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    nextBtnBg: "bg-amber-600 hover:bg-amber-700 text-white",
    actionBg: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50",
    actionText: "text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-white",
    actionBorder: "border-amber-300/80 dark:border-amber-700/60",
    accentText: "text-amber-600 dark:text-amber-400",
  },
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "home",
    badge: "Módulo 1 · Início & Eficiência",
    title: "Painel Central & Índice de Eficiência",
    subtitle: "Visão Geral do Consumo Residencial",
    location: "Aba 'Início' no menu inferior ou clicando na logo Turn OFF",
    targetId: "home-efficiency-box",
    secondaryTargetId: "home-hero-card",
    targetTab: "home",
    actionTab: "home",
    actionType: "navigate",
    actionLabel: "Explorar Tela Inicial",
    description:
      "O centro de controle do Turn OFF. Apresenta o seu Índice Geral de Eficiência Energética (de 0 a 100), alertas de segurança em destaque e atalhos diretos para os módulos dedicados.",
    steps: [
      "Acompanhe o Índice de Eficiência: calculado com rigor a partir da coerência dos aparelhos com a fatura e das metas alcançadas.",
      "Toque no botão 'Fazer Diagnóstico' para cadastrar aparelhos cômodo por cômodo e identificar os vilões de consumo.",
      "Utilize o botão 'Escanear Conta' para auditar uma fatura recente de energia de forma transparente.",
      "Navegue diretamente pelos 8 cartões dedicados posicionados logo abaixo do painel central.",
    ],
    icon: Zap,
    theme: THEMES.emerald,
  },
  {
    id: "diagnosis",
    badge: "Módulo 2 · Diagnóstico Residencial",
    title: "Diagnóstico Completo por Cômodo",
    subtitle: "Inventário de Aparelhos e Ranking de Consumo",
    location: "Card 'Diagnóstico Energético' no Início ou aba 'Diagnóstico' no menu inferior",
    targetId: "card-quick-diagnostico",
    secondaryTargetId: "btn-nav-bottom-diagnosis",
    targetTab: "home",
    actionTab: "diagnosis",
    actionType: "navigate",
    actionLabel: "Fazer Diagnóstico",
    description:
      "Mapeie detalhadamente todos os aparelhos com física real: duty cycle de compressores, potência em Watts, horas de uso e modulação Inverter de ar-condicionado.",
    steps: [
      "Etapa 1 (Fatura): Preencha o consumo faturado em kWh, o valor total em R$ e o número de moradores da casa.",
      "Etapa 2 (Aparelhos): Adicione equipamentos por cômodo (geladeira, chuveiro, ar-condicionado, lâmpadas, ventilador) com horas de uso diário.",
      "Etapa 3 (Segurança): Responda ao checklist de segurança preventiva conforme as normas NBR 5410.",
      "Etapa 4 (Resultados): Visualize gráficos comparativos, ranking dos maiores consumidores e utilize as ações de Salvar no Histórico ou Gerar Relatório.",
    ],
    icon: Activity,
    theme: THEMES.teal,
  },
  {
    id: "scanner",
    badge: "Módulo 3 · Leitor de Contas & Scanner",
    title: "Auditoria Completa da Fatura de Luz",
    subtitle: "Foto, Upload de Imagem, PDF ou Manual",
    location: "Card 'Leitor de Conta' no Início ou aba 'Leitor' no menu inferior",
    targetId: "card-quick-leitor",
    secondaryTargetId: "btn-nav-bottom-scanner",
    targetTab: "home",
    actionTab: "scanner",
    actionType: "navigate",
    actionLabel: "Auditar Conta de Luz",
    description:
      "Audita as tarifas cobradas pela concessionária (TE e TUSD), decompõe os tributos (ICMS, PIS, COFINS, CIP) e identifica se a bandeira tarifária está Verde, Amarela, Vermelha 1 ou 2.",
    steps: [
      "Escolha o método de entrada: captura pela câmera, imagem salva no celular, arquivo PDF original ou digitação manual.",
      "O leitor extrai automaticamente distribuidora, consumo em kWh, valor em Reais, data de vencimento e bandeira tarifária.",
      "Examine o quadro detalhado de impostos e verifique se a conta possui direito aos descontos da Tarifa Social.",
      "Utilize o botão 'Salvar no Histórico' ou 'Usar Dados no Diagnóstico' para integrar as informações com um toque.",
    ],
    icon: FileScan,
    theme: THEMES.orange,
  },
  {
    id: "simulator",
    badge: "Módulo 4 · Simulação de Hábitos",
    title: "Simulador de Mudança de Hábitos",
    subtitle: "Impacto Imediato na Conta em kWh e em Reais",
    location: "Card 'Simulação' no Início ou aba 'Simulação' no menu inferior",
    targetId: "card-quick-simulador",
    secondaryTargetId: "btn-nav-bottom-simulator",
    targetTab: "home",
    actionTab: "simulator",
    actionType: "navigate",
    actionLabel: "Abrir Simulador",
    description:
      "Descubra exatamente quantos Reais sobram no seu bolso ao ajustar pequenos hábitos do dia a dia, com fórmulas físicas sem estimativas fantasiosas.",
    steps: [
      "Selecione um diagnóstico salvo da sua residência para servir de base realista.",
      "Ajuste os controles deslizantes: reduza o tempo de banho no chuveiro de 15 para 8 minutos ou passe para a chave 'Verão'.",
      "Simule a substituição de lâmpadas antigas por LED e a regulação da temperatura do ar-condicionado em 23°C ou 24°C.",
      "Acompanhe o painel em tempo real exibindo a economia mensal projetada em kWh e em Reais (R$/mês).",
    ],
    icon: Sliders,
    theme: THEMES.sky,
  },
  {
    id: "payback",
    badge: "Módulo 5 · Troca de Eletrodomésticos",
    title: "Simulador de Payback (Retorno)",
    subtitle: "Vale a Pena Comprar um Aparelho Novo?",
    location: "Card 'Simulador de Payback' no Início ou aba 'Payback' no menu inferior",
    targetId: "card-quick-payback",
    secondaryTargetId: "btn-nav-bottom-payback",
    targetTab: "home",
    actionTab: "payback",
    actionType: "navigate",
    actionLabel: "Calcular Payback",
    description:
      "Calcula em quanto tempo (em meses) o investimento feito na compra de um equipamento novo com motor Inverter ou Selo Procel A+++ se paga pela economia gerada na conta.",
    steps: [
      "Escolha a categoria do aparelho no catálogo integrado (geladeira, ar-condicionado, máquina de lavar ou chuveiro).",
      "Informe a idade e o consumo do modelo antigo vs. o preço de compra e eficiência do novo modelo pretendido.",
      "Analise o prazo exato de amortização (Payback em meses) onde a redução mensal de energia quita o custo da compra.",
      "Consulte os gráficos com a projeção de economia acumulada em 1 ano, 3 anos e 5 anos.",
    ],
    icon: ShoppingBag,
    theme: THEMES.violet,
  },
  {
    id: "safety",
    badge: "Módulo 6 · Segurança Elétrica",
    title: "Guia de Segurança Elétrica (NBR 5410)",
    subtitle: "Prevenção de Choques, Incêndios e Sobrecargas",
    location: "Card 'Segurança Elétrica' no Início ou aba 'Segurança' no menu inferior",
    targetId: "card-quick-seguranca",
    secondaryTargetId: "btn-nav-bottom-safety",
    targetTab: "home",
    actionTab: "safety",
    actionType: "navigate",
    actionLabel: "Ver Regras de Segurança",
    description:
      "Diretriz fundamental do Turn OFF: economizar energia NUNCA deve colocar sua família em risco. Aprenda a reconhecer perigos invisíveis e previna acidentes graves.",
    steps: [
      "Conheça os 6 sinais críticos de perigo: tomadas quentes, cheiro de plástico queimado, disjuntor desarmando e choques ao tocar na carcaça de aparelhos.",
      "Entenda o que NUNCA fazer: nunca troque um disjuntor por outro de maior amperagem sem substituir toda a fiação compatível.",
      "Evite o uso de adaptadores múltiplos (T's / benjamins) em tomadas de alta potência para evitar sobreaquecimento e princípio de incêndio.",
      "Teste seus conhecimentos no módulo interativo de 'Mitos e Verdades' sobre fiação, chuveiros e aterramento.",
    ],
    icon: ShieldAlert,
    theme: THEMES.red,
  },
  {
    id: "learn",
    badge: "Módulo 7 · Educação Energética",
    title: "Guia Educativo & Medidor de Luz",
    subtitle: "Aprenda a Ler o Relógio e Entenda o kWh",
    location: "Card 'Guia de Aprendizado' no Início ou aba 'Aprender' no menu inferior",
    targetId: "card-quick-aprender",
    secondaryTargetId: "btn-nav-bottom-learn",
    targetTab: "home",
    actionTab: "learn",
    actionType: "navigate",
    actionLabel: "Abrir Guia Educativo",
    description:
      "Desvende a física da eletricidade de forma descomplicada: compreenda como a concessionária calcula o consumo e aprenda a conferir seu relógio medidor no meio do mês.",
    steps: [
      "Entenda a fórmula oficial do kWh: Potência do aparelho em Watts × Horas de uso por dia ÷ 1000.",
      "Aprenda na prática como ler relógios medidores digitais e relógios analógicos com 4 ponteiros.",
      "Faça anotações no meio do mês para estimar o valor aproximado da conta antes da chegada da distribuidora.",
      "Consulte dicas práticas de conservação divididas cômodo por cômodo da sua casa.",
    ],
    icon: GraduationCap,
    theme: THEMES.indigo,
  },
  {
    id: "tarifa-social",
    badge: "Módulo 8 · Tarifa Social (TSEE)",
    title: "Benefício da Tarifa Social",
    subtitle: "Gratuidade de 80 kWh e Descontos Oficiais",
    location: "Card 'Tarifa Social (TSEE)' no Início ou aba 'Tarifa Social' no menu inferior",
    targetId: "card-quick-beneficios",
    secondaryTargetId: "btn-nav-bottom-tarifa-social",
    targetTab: "home",
    actionTab: "tarifa-social",
    actionType: "navigate",
    actionLabel: "Simular Tarifa Social",
    description:
      "Tudo sobre o benefício regulamentado pela Lei Federal nº 12.212/2010 e Aneel que oferece gratuidade nos primeiros 80 kWh e descontos escalonados na conta de energia.",
    steps: [
      "Verifique os critérios de elegibilidade: famílias no CadÚnico com renda per capita de até meio salário mínimo ou beneficiários do BPC/LOAS.",
      "Conheça as faixas oficiais: gratuidade total até 80 kWh, 40% de desconto de 81 a 120 kWh e 10% de 121 a 220 kWh.",
      "Veja as regras para famílias com membros portadores de necessidades médicas especiais que utilizam aparelhos elétricos contínuos.",
      "Confira a lista de documentos necessários e orientações para requerer o benefício junto à distribuidora local.",
    ],
    icon: HeartHandshake,
    theme: THEMES.pink,
  },
  {
    id: "history",
    badge: "Módulo 9 · Histórico & Backup",
    title: "Histórico de Análises & Backup Local",
    subtitle: "Gráficos em kWh/R$ e Proteção dos Registros",
    location: "Card 'Histórico & Exportação' no Início ou aba 'Histórico' no menu inferior",
    targetId: "card-quick-historico",
    secondaryTargetId: "btn-nav-bottom-history",
    targetTab: "home",
    actionTab: "history",
    actionType: "navigate",
    actionLabel: "Acessar Histórico",
    description:
      "Consulte diagnósticos e contas anteriores, acompanhe gráficos de evolução temporal e faça backup seguro de todos os seus dados no seu próprio aparelho.",
    steps: [
      "Toque no botão 'Ver Detalhes' em qualquer diagnóstico salvo para inspecionar potências, horários e recomendações de cada aparelho.",
      "Alterne a visualização dos gráficos históricos entre consumo em kWh e Custo em Reais (R$) com um único toque.",
      "Clique em 'Exportar Backup' para baixar um arquivo JSON seguro com todos os seus dados no dispositivo.",
      "Utilize o botão 'Importar Backup' para restaurar seus registros com rapidez em outro celular ou computador.",
    ],
    icon: History,
    theme: THEMES.amber,
  },
  {
    id: "ai-assistant",
    badge: "Módulo 10 · IA Explicativa Inteligente",
    title: "IA Explicativa do Turn OFF",
    subtitle: "Tire Dúvidas Técnicas Diretamente no Topo",
    location: "Botão 'IA Explicativa' (ícone de robô) na barra superior do aplicativo",
    targetId: "btn-header-ai-chat",
    secondaryTargetId: "btn-header-ai-chat",
    targetTab: "home",
    actionType: "aichat",
    actionLabel: "Abrir IA Explicativa",
    description:
      "Inteligência Artificial especialista em eficiência energética residencial. Faça perguntas técnicas em linguagem natural e receba respostas claras, personalizadas e pedagógicas.",
    steps: [
      "Toque no botão 'IA Explicativa' no cabeçalho superior de qualquer tela para abrir a janela de atendimento inteligente.",
      "Pergunte sobre qualquer assunto: modo stand-by, consumo de ar-condicionado Inverter, bandeiras tarifárias, TE e TUSD.",
      "A IA analisa o seu diagnóstico e a sua fatura em tempo real para explicar exatamente onde está o seu maior gasto.",
      "Utilize os botões de atalho clicáveis na própria resposta da IA para navegar direto até a ferramenta indicada.",
    ],
    icon: Bot,
    theme: THEMES.emerald,
  },
  {
    id: "accessibility",
    badge: "Módulo 11 · Acessibilidade & Ajustes",
    title: "Acessibilidade, Fontes & Ouvidoria",
    subtitle: "Ajuste de Fontes, Contraste e Canal Oficial",
    location: "Botão 'Acessibilidade' com ícone de engrenagem na barra superior",
    targetId: "btn-open-accessibility",
    secondaryTargetId: "btn-open-accessibility",
    targetTab: "home",
    actionType: "accessibility",
    actionLabel: "Abrir Painel de Acessibilidade",
    description:
      "Personalize a interface para seu conforto visual: ajuste o tamanho das fontes de 85% até 150%, ative o modo escuro ou alto contraste, use linguagem simples e envie mensagens para a Ouvidoria.",
    steps: [
      "Escala de Fonte: Aumente ou reduza o tamanho de todos os textos do app (de 85% a 150%) com pré-visualização instantânea.",
      "Linguagem Simplificada: Ative para que fórmulas e jargões técnicos sejam substituídos por analogias práticas do dia a dia.",
      "Apoio a Dislexia & Alto Contraste: Ative fonte de alta legibilidade, maior espaçamento entre linhas e bordas de foco amplas.",
      "Ouvidoria Oficial: Envie dúvidas, sugestões de melhoria ou reclamações diretamente para a equipe técnica do GT-02.",
    ],
    icon: Settings,
    theme: THEMES.indigo,
  },
  {
    id: "auth-account",
    badge: "Módulo 12 · Minha Conta & Nuvem",
    title: "Conta de Usuário & Sincronização na Nuvem",
    subtitle: "Seus Diagnósticos Salvos em Qualquer Aparelho",
    location: "Botão 'Login' / 'Minha Conta' no canto superior direito",
    targetId: "btn-auth-header",
    secondaryTargetId: "btn-auth-header",
    targetTab: "home",
    actionType: "auth",
    actionLabel: "Acessar / Criar Minha Conta",
    description:
      "Conecte sua conta do Google ou cadastre-se com e-mail e senha para salvar com segurança todas as suas faturas escaneadas e diagnósticos na nuvem do Firebase.",
    steps: [
      "Login com 1 Clique: Entre instantaneamente com sua conta Google ou cadastre seu e-mail de forma rápida e segura.",
      "Sincronização em Tempo Real: Todos os diagnósticos de cômodos e faturas lidas ficam salvos na sua conta e não se perdem se você limpar o navegador.",
      "Acesso Multi-dispositivos: Comece a auditoria pelo celular e continue no computador ou tablet sem precisar recadastrar nada.",
      "Uso 100% Livre: O login é opcional. Você pode continuar usando todas as ferramentas localmente de forma anônima sempre que preferir.",
    ],
    icon: Cloud,
    theme: THEMES.sky,
  },
  {
    id: "share-export",
    badge: "Módulo 13 · Compartilhar & Conectar",
    title: "Compartilhar Aplicativo & Relatórios",
    subtitle: "Espalhe a Economia com QR Code e WhatsApp",
    location: "Botão 'Compartilhar' na barra superior do aplicativo",
    targetId: "btn-header-share",
    secondaryTargetId: "btn-header-share",
    targetTab: "home",
    actionType: "share",
    actionLabel: "Abrir Compartilhamento",
    description:
      "Ajude sua família, amigos e vizinhos a economizarem na conta de luz. Compartilhe o aplicativo com QR Code na tela ou envie seus relatórios detalhados com gráficos.",
    steps: [
      "QR Code na Tela: Abra o QR Code gigante na tela para que outra pessoa aponte a câmera do celular e acesse o Turn OFF na hora.",
      "Envio Direto no WhatsApp: Copie o link oficial ou envie mensagens prontas com dicas práticas de redução de consumo.",
      "Relatórios em PDF: Exporte auditorias de contas e diagnósticos residenciais completos em documento PDF com gráficos para imprimir.",
      "Espalhe a Conscientização: Incentive o uso seguro e sustentável de energia na sua comunidade ou condomínio.",
    ],
    icon: Share2,
    theme: THEMES.emerald,
  },
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onOpenAccessibility,
  onOpenAuth,
  onOpenShare,
  onOpenAIChat,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeView, setActiveView] = useState<"overview" | "steps">("overview");
  const [showModuleIndex, setShowModuleIndex] = useState(false);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const stepData = TUTORIAL_STEPS[currentStep] || TUTORIAL_STEPS[0];
  const theme = stepData.theme;

  // Add temporary bottom padding to body while tutorial is active so any element can scroll into clear view
  useEffect(() => {
    if (!isOpen) return;
    const prevPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "55vh";
    return () => {
      document.body.style.paddingBottom = prevPadding;
    };
  }, [isOpen]);

  // Helper to locate target element with primary and secondary fallback IDs
  const findElement = useCallback(
    (primaryId: string, secondaryId?: string): HTMLElement | null => {
      let el = document.getElementById(primaryId);
      if (el) return el;
      if (secondaryId) {
        el = document.getElementById(secondaryId);
        if (el) return el;
      }
      return null;
    },
    []
  );

  // Measure target element position and calculate spotlight rect
  const updateRect = useCallback(() => {
    if (!isOpen || !stepData) return;
    const el = findElement(stepData.targetId, stepData.secondaryTargetId);
    if (el) {
      const r = el.getBoundingClientRect();
      const padding = 6;
      setTargetRect({
        top: Math.max(0, r.top - padding),
        left: Math.max(0, r.left - padding),
        width: r.width + padding * 2,
        height: r.height + padding * 2,
        bottom: r.bottom + padding,
        right: r.right + padding,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, stepData, findElement]);

  // Dynamic card height measurement to guarantee elements are NEVER covered by the tutorial card
  const getCardHeight = useCallback(() => {
    if (cardRef.current && cardRef.current.offsetHeight > 80) {
      return cardRef.current.offsetHeight;
    }
    return typeof window !== "undefined" && window.innerWidth < 640 ? 230 : 210;
  }, []);

  const getSafeClearTop = useCallback(() => {
    const cardH = getCardHeight();
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    // 10px (card top) + card height + 16px clearance for spotlight border and "Foco" beacon
    return 10 + cardH + (isMobile ? 16 : 20);
  }, [getCardHeight]);

  const isHeaderTarget =
    stepData.targetId.includes("header") ||
    stepData.targetId.includes("btn-open") ||
    stepData.targetId.includes("btn-auth");

  const isQuickCard = stepData.targetId.startsWith("card-quick-");
  const isHomeEfficiency = stepData.targetId === "home-efficiency-box";

  // If target is in the header, ALWAYS dock at bottom so the header is 100% visible
  // If target is a quick card, efficiency box, or lower down the page, dock at top so target displays cleanly in lower half
  const isTargetVisible = targetRect !== null;
  const isTargetNearBottom =
    isTargetVisible &&
    !isHeaderTarget &&
    (isQuickCard ||
      isHomeEfficiency ||
      targetRect.top > window.innerHeight * 0.35 ||
      Boolean(stepData.secondaryTargetId?.includes("btn-nav-bottom")));

  // Navigate to target tab and smartly scroll target into clear viewport area
  useEffect(() => {
    if (!isOpen || !stepData) return;

    if (stepData.targetTab) {
      onNavigateToTab(stepData.targetTab);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const el = findElement(stepData.targetId, stepData.secondaryTargetId);
      if (el) {
        if (isHeaderTarget) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const rect = el.getBoundingClientRect();
          const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
          const safeClearTop = getSafeClearTop();
          const bottomNavHeight = isMobile ? 74 : 64;
          const maxVisibleBottom = window.innerHeight - bottomNavHeight - 8;

          // Never consider an element well-positioned if its top is under or adjacent to the card
          const isAlreadyWellPositioned =
            rect.top >= safeClearTop && rect.bottom <= maxVisibleBottom;

          if (!isAlreadyWellPositioned) {
            const elAbsTop = window.scrollY + rect.top;
            const targetY = Math.max(0, elAbsTop - safeClearTop);

            if (Math.abs(window.scrollY - targetY) > 10) {
              window.scrollTo({ top: targetY, behavior: "smooth" });
            }
          }
        }

        updateRect();
        if (attempts >= 6) {
          clearInterval(interval);
        }
      } else if (attempts >= 10) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    isOpen,
    currentStep,
    stepData,
    isHeaderTarget,
    onNavigateToTab,
    updateRect,
    findElement,
    getSafeClearTop,
  ]);

  // Recalculate on scroll or resize
  useEffect(() => {
    if (!isOpen) return;
    const handleRecalc = () => updateRect();
    window.addEventListener("resize", handleRecalc);
    window.addEventListener("scroll", handleRecalc, true);
    return () => {
      window.removeEventListener("resize", handleRecalc);
      window.removeEventListener("scroll", handleRecalc, true);
    };
  }, [isOpen, updateRect]);

  // Keyboard navigation support: ArrowRight / ArrowLeft / Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showModuleIndex) {
          setShowModuleIndex(false);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowRight") {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
          setActiveView("overview");
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
          setActiveView("overview");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, showModuleIndex, onClose]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setActiveView("overview");
      setShowModuleIndex(false);
    }
  }, [isOpen]);

  if (!isOpen || !stepData) return null;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setActiveView("overview");
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setActiveView("overview");
    }
  };

  const handleSelectModuleIndex = (index: number) => {
    setCurrentStep(index);
    setActiveView("overview");
    setShowModuleIndex(false);
  };

  const handleTryFeatureNow = () => {
    onClose();
    if (stepData.actionType === "accessibility") {
      onOpenAccessibility?.();
    } else if (stepData.actionType === "auth") {
      onOpenAuth?.();
    } else if (stepData.actionType === "share") {
      onOpenShare?.();
    } else if (stepData.actionType === "aichat") {
      onOpenAIChat?.();
    } else if (stepData.actionTab) {
      onNavigateToTab(stepData.actionTab);
    }
  };

  const StepIcon = stepData.icon;

  return (
    <div
      id="interactive-tutorial-overlay"
      className="fixed inset-0 z-50 overflow-hidden pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial Interativo do Aplicativo Turn OFF"
    >
      {/* Darkened Backdrop with Spotlight Cutout */}
      {isTargetVisible ? (
        <div
          id="tutorial-spotlight-box"
          className="absolute transition-all duration-300 ease-out pointer-events-none rounded-2xl"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.78)",
            border: `2px solid ${theme.primaryHex}`,
          }}
        >
          {/* Animated beacon tag highlighting location */}
          <div
            className={`absolute ${
              targetRect.top < getSafeClearTop() - 10 ? "top-full mt-2" : "-top-3.5"
            } left-4 px-2.5 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-bounce pointer-events-none z-10`}
            style={{ backgroundColor: theme.primaryHex }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping" />
            <MapPin className="w-3 h-3 inline-block" />
            <span>Foco</span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-200" />
      )}

      {/* Floating Tutorial Card */}
      <div
        ref={cardRef}
        id="tutorial-coach-mark-wrapper"
        className="fixed z-50 transition-all duration-300 ease-out px-3 sm:px-4 pointer-events-auto"
        style={
          isTargetNearBottom
            ? {
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: "560px",
              }
            : {
                bottom: typeof window !== "undefined" && window.innerWidth < 640 ? "76px" : "16px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: "560px",
              }
        }
      >
        <div
          id="tutorial-coach-mark-card"
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl space-y-2 sm:space-y-3 max-h-[36vh] sm:max-h-[46vh] flex flex-col justify-between transition-all"
        >
          {/* Header Bar */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                  <StepIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                      {currentStep + 1} de {TUTORIAL_STEPS.length}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                      {stepData.subtitle}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                    {stepData.title}
                  </h3>
                </div>
              </div>

              {/* Action Tools: Index Toggle & Close */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  id="btn-tutorial-toggle-index"
                  onClick={() => setShowModuleIndex(!showModuleIndex)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    showModuleIndex
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                  title="Ver índice de todos os módulos"
                  aria-label="Abrir índice de módulos"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Índice</span>
                </button>

                <button
                  id="btn-tutorial-skip-x"
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar tutorial"
                  aria-label="Fechar tutorial"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtitle / Location indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <MapPin className={`w-3 h-3 shrink-0 ${theme.accentText}`} />
              <span className="truncate">
                <strong className="text-slate-800 dark:text-slate-100">Onde fica:</strong> {stepData.location}
              </span>
            </div>
          </div>

          {/* Body Content Area (Scrollable if needed) */}
          <div className="overflow-y-auto space-y-2.5 pr-1 text-xs">
            {showModuleIndex ? (
              /* Interactive Module Index View */
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Selecione um Módulo para Conhecer:
                  </span>
                  <span className="text-[10px] text-slate-500">13 Tópicos</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[170px] overflow-y-auto pr-0.5">
                  {TUTORIAL_STEPS.map((step, idx) => {
                    const ModIcon = step.icon;
                    const isCurrent = idx === currentStep;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => handleSelectModuleIndex(idx)}
                        className={`p-2 rounded-xl text-left border transition flex items-center gap-2 cursor-pointer ${
                          isCurrent
                            ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 font-bold shadow-xs"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: step.theme.primaryHex }}
                        >
                          <ModIcon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                            {idx + 1}. {step.title.split("&")[0].trim()}
                          </p>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                            {step.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Standard View: Overview vs Step-by-Step Toggle */
              <>
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveView("overview")}
                    className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer ${
                      activeView === "overview"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Para que serve
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("steps")}
                    className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeView === "steps"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ListChecks className="w-3 h-3" />
                    Como usar ({stepData.steps.length})
                  </button>
                </div>

                <div className="min-h-[54px]">
                  {activeView === "overview" ? (
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
                      {stepData.description}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {stepData.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 leading-snug"
                        >
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 text-white"
                            style={{ backgroundColor: theme.primaryHex }}
                          >
                            {idx + 1}
                          </span>
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 shrink-0">
            {/* Quick Action Button: Try now if not on last step */}
            {stepData.actionLabel && currentStep !== TUTORIAL_STEPS.length - 1 && !showModuleIndex && (
              <button
                type="button"
                id={`btn-tutorial-try-now-${currentStep}`}
                onClick={handleTryFeatureNow}
                className={`w-full py-1.5 px-3 rounded-xl ${theme.actionBg} ${theme.actionText} text-xs font-bold transition flex items-center justify-center gap-1.5 border ${theme.actionBorder} shadow-xs cursor-pointer`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{stepData.actionLabel}</span>
              </button>
            )}

            {/* Stepper Dots and Next/Prev/Skip */}
            <div className="flex items-center justify-between gap-2">
              {/* Progress Dots */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[140px] sm:max-w-[200px]">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentStep(idx);
                      setActiveView("overview");
                      setShowModuleIndex(false);
                    }}
                    className={`h-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                      idx === currentStep ? "w-4" : "w-1 hover:w-1.5"
                    }`}
                    style={{
                      backgroundColor:
                        idx === currentStep
                          ? theme.primaryHex
                          : "rgba(148, 163, 184, 0.4)",
                    }}
                    aria-label={`Ir para módulo ${idx + 1}`}
                    title={`Módulo ${idx + 1}: ${TUTORIAL_STEPS[idx].title}`}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-tutorial-skip-text"
                  type="button"
                  onClick={onClose}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Pular
                </button>

                {currentStep > 0 && (
                  <button
                    id="btn-tutorial-prev"
                    type="button"
                    onClick={handlePrev}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Voltar
                  </button>
                )}

                <button
                  id="btn-tutorial-next"
                  type="button"
                  onClick={handleNext}
                  className={`px-3 py-1.5 rounded-xl ${theme.nextBtnBg} text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer`}
                >
                  {currentStep === TUTORIAL_STEPS.length - 1 ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Concluir
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

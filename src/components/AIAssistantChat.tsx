import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Zap,
  HelpCircle,
  ShieldCheck,
  Minimize2,
  Maximize2,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRight,
  Calculator,
  FileText,
  Clock,
  Compass,
  Lightbulb,
} from "lucide-react";
import { AppTab, AccessibilitySettings, SavedDiagnosis, ExtractedBill } from "../types";
import { MathFormula } from "./MathFormula";
import { speakText, speechManager } from "../lib/speech";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  settings?: AccessibilitySettings;
  currentTab: AppTab | string;
  onNavigateTab: (tab: AppTab) => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  onClose?: () => void;
  latestDiagnosis?: SavedDiagnosis | null;
  latestBill?: ExtractedBill | null;
}

// Human-friendly titles and icons for tabs
const TAB_METADATA: Record<string, { label: string; tab: AppTab }> = {
  scanner: { label: "Leitor de Conta", tab: "scanner" },
  diagnosis: { label: "Diagnóstico Residencial", tab: "diagnosis" },
  simulator: { label: "Simulador de Hábitos", tab: "simulator" },
  payback: { label: "Simulador de Payback", tab: "payback" },
  safety: { label: "Segurança Elétrica", tab: "safety" },
  learn: { label: "Guia Educativo", tab: "learn" },
  "tarifa-social": { label: "Tarifa Social", tab: "tarifa-social" },
  history: { label: "Histórico", tab: "history" },
  home: { label: "Início", tab: "home" },
  inicio: { label: "Início", tab: "home" },
};

// Dynamic suggested starter questions based on current active screen
const GET_QUESTIONS_BY_TAB = (tab: string): string[] => {
  switch (tab) {
    case "scanner":
      return [
        "O que são tarifas TE e TUSD na minha conta?",
        "O que significa a bandeira tarifária atual?",
        "Como conferir se a leitura do relógio bate com a fatura?",
        "Minha conta tem cobrança indevida de iluminação (COSIP)?",
      ];
    case "diagnosis":
      return [
        "Por que chuveiro e ar-condicionado gastam tanto?",
        "Como estimar o consumo de um ar-condicionado inverter?",
        "O que é o fator de ciclo da geladeira?",
        "O que significa o Índice Geral de Eficiência?",
      ];
    case "simulator":
      return [
        "Como funciona a simulação de hábitos 'E se...'?",
        "Reduzir 5 minutos de banho economiza quanto por mês?",
        "O que é consumo fantasma (standby) dos aparelhos?",
        "Trocar lâmpadas fluorescentes por LED compensa rápido?",
      ];
    case "payback":
      return [
        "O que é payback e como ele é calculado?",
        "Vale a pena comprar um ar-condicionado A+++ Inverter?",
        "Qual a diferença prática entre o selo Procel A e o Inmetro?",
        "Quanto uma geladeira antiga consome a mais que uma nova?",
      ];
    case "safety":
      return [
        "Por que a fiação do chuveiro costuma esquentar e derreter?",
        "O que fazer quando o disjuntor cai com frequência?",
        "Para que serve o dispositivo DR (Diferencial Residual)?",
        "Quais os perigos de usar benjamins (tês) e extensões?",
      ];
    case "learn":
      return [
        "Qual é a fórmula matemática exata do cálculo de kWh?",
        "Como ler um relógio medidor de ponteiros?",
        "Qual a diferença entre potência em Watts e energia em kWh?",
        "Como calcular o custo em Reais de qualquer aparelho?",
      ];
    case "tarifa-social":
      return [
        "Quem tem direito à Tarifa Social de Energia (TSEE)?",
        "Quais são as faixas de consumo e os percentuais de desconto?",
        "Até quantos kWh por mês a energia é 100% gratuita?",
        "Como cadastrar meu CadÚnico na distribuidora de energia?",
      ];
    case "history":
      return [
        "Como analisar a evolução do meu consumo mês a mês?",
        "O que pode causar um aumento repentino no histórico?",
        "Como exportar meus relatórios de diagnóstico?",
        "Qual a média de consumo de uma residência brasileira?",
      ];
    case "home":
    default:
      return [
        "Como o Turn OFF calcula o consumo em kWh?",
        "O que significa o Índice de Eficiência Energética?",
        "Por onde devo começar para reduzir minha conta de luz?",
        "Aparelhos em standby realmente pesam no bolso?",
      ];
  }
};

export const AIAssistantChat: React.FC<Props> = ({
  settings,
  currentTab,
  onNavigateTab,
  isOpen: controlledIsOpen,
  onToggleOpen,
  onClose,
  latestDiagnosis,
  latestBill,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (val: boolean) => {
    setInternalIsOpen(val);
    onToggleOpen?.(val);
    if (!val) {
      speechManager.stop();
      onClose?.();
    }
  };

  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  // Friendly welcoming message
  const initialMessage = useMemo<Message>(() => {
    return {
      role: "assistant",
      content:
        "Olá! Sou a **IA Explicativa do Turn OFF**, especialista técnica do projeto do GT-02 de Sistemas de Energia Renovável da EEEP Dom Walfrido Teixeira Vieira.\n\nPosso tirar dúvidas sobre fórmulas físicas de kWh, tarifas e bandeiras da Aneel, regras da Tarifa Social (TSEE), segurança elétrica residencial (NBR 5410) ou analisar seus aparelhos cadastrados. Como posso te ajudar hoje?",
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = useMemo(() => {
    return GET_QUESTIONS_BY_TAB(currentTab);
  }, [currentTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Keep speech synthesis synced
  useEffect(() => {
    const unsub = speechManager.subscribe((state) => {
      if (!state.isSpeaking) {
        setSpeakingIdx(null);
      }
    });
    return () => unsub();
  }, []);

  const handleResetChat = () => {
    speechManager.stop();
    setMessages([initialMessage]);
    setInput("");
  };

  const handleCopy = (text: string, idx: number) => {
    // Strip action tags for clean copy
    const cleanText = text.replace(/\[Aba:\s*([a-zA-Z0-9_-]+)\]/g, "");
    navigator.clipboard.writeText(cleanText);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleToggleSpeech = (text: string, idx: number) => {
    if (speakingIdx === idx) {
      speechManager.stop();
      setSpeakingIdx(null);
    } else {
      speechManager.stop();
      setSpeakingIdx(idx);
      const cleanText = text
        .replace(/\[Aba:\s*([a-zA-Z0-9_-]+)\]/g, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/•/g, "");
      speakText(cleanText, {
        speechGuide: {
          rate: 1.0,
          volume: 1.0,
        },
      });
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: query },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Build real context from user data
    const activeDiagnosisSummary = latestDiagnosis?.result
      ? {
          totalKwh: Math.round(latestDiagnosis.result.totalEstimated || 0),
          totalCost: Number(
            (
              (latestDiagnosis.result.totalEstimated || 0) *
              (latestDiagnosis.result.effectiveCostPerKwh || 0.95)
            ).toFixed(2)
          ),
          efficiencyScore: latestDiagnosis.result.confidenceScore || 80,
          topAppliance: latestDiagnosis.result.topContributors?.[0]
            ? `${latestDiagnosis.result.topContributors[0].label} (${Math.round(latestDiagnosis.result.topContributors[0].relativeScore || 0)}%)`
            : undefined,
          appliancesCount: latestDiagnosis.input?.appliances?.length || 0,
          potentialSavingsBrl:
            latestDiagnosis.result.savings?.probable?.[1] || 0,
        }
      : undefined;

    const activeBillSummary = latestBill
      ? {
          distributor: latestBill.distribuidora,
          kwh: latestBill.consumo_kwh,
          totalBrl: latestBill.valor_total,
          flag: latestBill.bandeira,
          isSocial: latestBill.tarifa_social_identificada,
        }
      : undefined;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000), // Generous 30s timeout to allow full LLM generation
        body: JSON.stringify({
          messages: newMessages,
          userContext: {
            currentTab,
            textVolume: settings?.textVolume,
            simpleLanguage: settings?.simpleLanguage,
            activeDiagnosisSummary,
            activeBillSummary,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na conexão com o servidor (HTTP ${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Resposta recebida não está no formato JSON esperado");
      }

      const data = await response.json();
      if (data.reply) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content:
              "Não consegui processar uma resposta no momento. Por favor, tente reformular sua pergunta ou envie novamente.",
          },
        ]);
      }
    } catch (err: any) {
      console.warn("[AIAssistantChat] Falha na comunicação com o servidor:", err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Houve uma instabilidade temporária na comunicação com o serviço de inteligência artificial. Por favor, envie sua pergunta novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render inline markdown safely and parse [Aba: tabId] into interactive navigation buttons
  const renderFormattedInline = (inlineText: string) => {
    // Matches action tags [Aba: <tab>], inline code `...`, bold **...**, and italic *...*
    const tokenRegex = /(\[Aba:\s*[a-zA-Z0-9_-]+\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = inlineText.split(tokenRegex);

    return parts.map((part, idx) => {
      // Interactive Tab Navigation Tag: [Aba: scanner]
      const tabMatch = part.match(/^\[Aba:\s*([a-zA-Z0-9_-]+)\]$/);
      if (tabMatch) {
        const rawTabKey = tabMatch[1].toLowerCase();
        const meta = TAB_METADATA[rawTabKey];
        const targetTab: AppTab = meta?.tab || (rawTabKey as AppTab);
        const label = meta?.label || "Acessar Módulo";

        return (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onNavigateTab(targetTab);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 mx-1 my-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs hover:shadow-sm transition-transform active:scale-95 cursor-pointer"
            title={`Navegar para ${label}`}
          >
            <span>{label}</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
          </button>
        );
      }

      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong
            key={idx}
            className="font-bold text-slate-900 dark:text-white"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <em key={idx} className="italic text-slate-800 dark:text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      // Clean stray unclosed double asterisks
      const clean = part.replace(/\*\*/g, "");
      return <span key={idx}>{clean}</span>;
    });
  };

  // Helper to format text cleanly into structured React elements without breaking layout
  const formatText = (rawText: string) => {
    const normalized = rawText.replace(/\r\n/g, "\n").trim();

    // LaTeX formula blocks ($$...$$, \[...\], etc.)
    const formulaRegex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
    const segments: Array<{ type: "formula" | "text"; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = formulaRegex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          content: normalized.substring(lastIndex, match.index),
        });
      }
      segments.push({
        type: "formula",
        content: match[1] || match[2] || "",
      });
      lastIndex = formulaRegex.lastIndex;
    }

    if (lastIndex < normalized.length) {
      segments.push({
        type: "text",
        content: normalized.substring(lastIndex),
      });
    }

    return segments.map((seg, sIdx) => {
      if (seg.type === "formula") {
        return <MathFormula key={`formula-${sIdx}`} formula={seg.content} />;
      }

      const lines = seg.content.split("\n");
      const blocks: React.ReactNode[] = [];
      let currentBulletList: string[] = [];
      let currentNumList: Array<{ num: string; text: string }> = [];

      const flushBulletList = () => {
        if (currentBulletList.length > 0) {
          const listItems = [...currentBulletList];
          currentBulletList = [];
          blocks.push(
            <ul key={`ul-${blocks.length}`} className="space-y-1.5 my-1.5 pl-0.5">
              {listItems.map((item, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2 leading-relaxed text-slate-700 dark:text-slate-200">
                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5 select-none">•</span>
                  <span className="flex-1">{renderFormattedInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
      };

      const flushNumList = () => {
        if (currentNumList.length > 0) {
          const listItems = [...currentNumList];
          currentNumList = [];
          blocks.push(
            <ol key={`ol-${blocks.length}`} className="space-y-1.5 my-1.5 pl-0.5">
              {listItems.map((item, nIdx) => (
                <li key={nIdx} className="flex items-start gap-2 leading-relaxed text-slate-700 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 select-none">
                    {item.num}
                  </span>
                  <span className="flex-1">{renderFormattedInline(item.text)}</span>
                </li>
              ))}
            </ol>
          );
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          flushBulletList();
          flushNumList();
          continue;
        }

        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          flushBulletList();
          flushNumList();
          blocks.push(
            <hr key={`hr-${i}`} className="my-2 border-slate-200 dark:border-slate-800" />
          );
          continue;
        }

        // Headers: ### or ## or #
        if (/^#{1,3}\s+/.test(trimmed)) {
          flushBulletList();
          flushNumList();
          const headerText = trimmed.replace(/^#{1,3}\s+/, "");
          blocks.push(
            <div
              key={`h-${i}`}
              className="font-bold text-xs text-emerald-700 dark:text-emerald-400 mt-2.5 mb-1 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{renderFormattedInline(headerText)}</span>
            </div>
          );
          continue;
        }

        // Bullet list
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
        if (bulletMatch) {
          flushNumList();
          currentBulletList.push(bulletMatch[1]);
          continue;
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
        if (numMatch) {
          flushBulletList();
          currentNumList.push({ num: numMatch[1], text: numMatch[2] });
          continue;
        }

        // Regular text
        flushBulletList();
        flushNumList();
        blocks.push(
          <p key={`p-${i}`} className="leading-relaxed text-slate-700 dark:text-slate-200 my-1">
            {renderFormattedInline(trimmed)}
          </p>
        );
      }

      flushBulletList();
      flushNumList();

      return <div key={`seg-${sIdx}`} className="space-y-1">{blocks}</div>;
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      id="modal-ai-chat-window"
      className={`fixed z-50 bg-white dark:bg-slate-900 border-2 border-emerald-600/30 dark:border-emerald-500/30 shadow-2xl rounded-3xl transition-all duration-300 no-print flex flex-col overflow-hidden ${
        isMinimized
          ? "bottom-20 sm:bottom-6 right-3 sm:right-6 w-80 h-14"
          : "bottom-16 sm:bottom-6 left-2 right-2 sm:left-auto sm:right-6 sm:w-[440px] max-w-lg h-[580px] max-h-[82vh]"
      }`}
    >
      {/* Header com identidade Verde Esmeralda */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-800 via-teal-700 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold font-['Space_Grotesk'] tracking-tight">
                IA Explicativa
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                Online
              </span>
            </div>
            <p className="text-[10px] text-emerald-100/85 truncate max-w-[200px] sm:max-w-xs">
              Tire dúvidas de física, contas e segurança
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Reset Chat Button */}
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
            title="Reiniciar conversa"
            aria-label="Reiniciar conversa com a IA"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Minimize / Maximize */}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
            title={isMinimized ? "Expandir janela" : "Minimizar"}
            aria-label={isMinimized ? "Expandir janela" : "Minimizar"}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
            title="Fechar chat"
            aria-label="Fechar IA Explicativa"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body when not minimized */}
      {!isMinimized && (
        <>
          {/* Chat Messages */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-slate-950/60 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`flex gap-2 max-w-[92%] sm:max-w-[88%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {m.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed break-words text-xs shadow-xs ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-xs font-medium whitespace-pre-wrap"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/90 dark:border-slate-700/80 space-y-2"
                    }`}
                  >
                    {m.role === "user" ? m.content : formatText(m.content)}
                  </div>
                </div>

                {/* Assistant Message Actions (Audio & Copy) */}
                {m.role === "assistant" && (
                  <div className="flex items-center gap-2 pl-8 pt-1 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleToggleSpeech(m.content, idx)}
                      className={`hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer ${
                        speakingIdx === idx ? "text-emerald-600 font-bold" : ""
                      }`}
                      title={speakingIdx === idx ? "Pausar áudio" : "Ouvir explicação"}
                    >
                      {speakingIdx === idx ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Ouvir</span>
                        </>
                      )}
                    </button>

                    <span>•</span>

                    <button
                      type="button"
                      onClick={() => handleCopy(m.content, idx)}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                      title="Copiar resposta"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start items-center pl-1">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-xs flex items-center gap-2 text-slate-600 dark:text-slate-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-medium ml-1">
                    Analisando e formulando explicação...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Suggested Questions Pills */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Sugestões:
            </span>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 whitespace-nowrap shrink-0 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              id="input-ai-chat-text"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida sobre cálculos, contas ou aparelhos..."
              className="flex-1 py-2.5 px-3.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
              disabled={isLoading}
            />
            <button
              id="btn-send-ai-chat"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition shadow-xs cursor-pointer shrink-0"
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

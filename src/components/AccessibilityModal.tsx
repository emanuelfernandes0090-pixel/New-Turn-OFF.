import React from "react";
import {
  Type,
  FileText,
  RotateCcw,
  X,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  Eye,
  MessageSquareText,
  ExternalLink,
  Contrast,
  MousePointer,
  AlignLeft,
  BookOpen,
} from "lucide-react";
import { AccessibilitySettings } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onUpdateSettings?: (newSettings: AccessibilitySettings) => void;
  onSaveSettings?: (newSettings: AccessibilitySettings) => void;
  onClearData?: () => void;
  onOpenTutorial?: () => void;
}

export const AccessibilityModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSaveSettings,
  onClearData,
  onOpenTutorial,
}) => {
  const [confirmClear, setConfirmClear] = React.useState(false);

  const applyUpdate = (newSettings: AccessibilitySettings) => {
    if (onUpdateSettings) onUpdateSettings(newSettings);
    if (onSaveSettings) onSaveSettings(newSettings);
  };

  if (!isOpen) return null;

  const currentScale = settings.fontScale ?? 0.85;
  const currentPercentage = Math.round(currentScale * 100);

  const handleFontSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const scale = Number(e.target.value) / 100;
    applyUpdate({ ...settings, fontScale: scale });
  };

  return (
    <div
      id="accessibility-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-start justify-center pt-4 sm:pt-10 pb-16 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-modal-title"
    >
      <div
        id="accessibility-modal-container"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-300/80 dark:border-slate-800 p-6 sm:p-8 space-y-7 animate-in zoom-in-95 duration-150"
      >
        {/* Header com distribuição ampla e equilibrada */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h2
              id="accessibility-modal-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight"
            >
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                <Sliders className="w-5 h-5" />
              </span>
              Acessibilidade & Personalização Visual
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed text-pretty max-w-xl">
              Ajuste o tamanho do texto, contraste, espaçamento e linguagem para ter uma leitura confortável em qualquer tela.
            </p>
          </div>
          <button
            id="btn-close-accessibility"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Fechar configurações de acessibilidade"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controle de Escala da Fonte com Visualizador de Texto */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Escala de Tamanho do Texto
              </span>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {currentPercentage}%
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
            O valor de 85% garante enquadramento equilibrado em telas de celulares. Caso prefira letras maiores, aumente a escala:
          </p>

          <div className="space-y-2">
            <input
              id="slider-font-scale"
              type="range"
              min="85"
              max="150"
              step="5"
              value={currentPercentage}
              onChange={handleFontSliderChange}
              aria-label="Escala de tamanho da fonte em porcentagem"
              aria-valuenow={currentPercentage}
              aria-valuemin={85}
              aria-valuemax={150}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold px-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">85% (Padrão)</span>
              <span>100% (Médio)</span>
              <span>120% (Grande)</span>
              <span>150% (Extra)</span>
            </div>
          </div>

          {/* Exemplo de leitura ao vivo */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 space-y-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Prévia de Leitura em Tempo Real:
            </span>
            <p className="text-xs leading-relaxed text-pretty">
              O consumo consciente começa no controle dos aparelhos de maior potência. O Turn OFF calcula o custo real de cada equipamento em Reais e quilowatt-hora com transparência.
            </p>
          </div>
        </div>

        {/* Visão, Tema e Contraste */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Tema & Contraste Visual
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="btn-modal-theme-light"
              onClick={() => applyUpdate({ ...settings, theme: "light" })}
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                settings.theme !== "dark"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Modo Claro</span>
            </button>
            <button
              id="btn-modal-theme-dark"
              onClick={() => applyUpdate({ ...settings, theme: "dark" })}
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                settings.theme === "dark"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Modo Escuro (Padrão)</span>
            </button>
          </div>

          {/* Alto Contraste Toggle */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Contrast className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Modo Alto Contraste (WCAG AAA)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
                Aumenta a nitidez de linhas e textos com contraste absoluto entre fundo e conteúdo.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={Boolean(settings.highContrast)}
              onClick={() => applyUpdate({ ...settings, highContrast: !settings.highContrast })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.highContrast ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.highContrast ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Anel de Foco Realçado */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MousePointer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Anel de Foco Realçado (Navegação por Teclado)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
                Destaca em esmeralda intenso o elemento ativo ao navegar com a tecla Tab.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={Boolean(settings.largeFocusRing)}
              onClick={() => applyUpdate({ ...settings, largeFocusRing: !settings.largeFocusRing })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.largeFocusRing ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.largeFocusRing ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Tipografia, Linguagem & Distribuição do Conteúdo */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-5">
          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Legibilidade, Espaçamento & Linguagem
          </span>

          {/* Linguagem Simplificada */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Linguagem Simplificada
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
                Substitui termos técnicos por frases do dia a dia e explicações diretas.
              </p>
            </div>
            <button
              id="toggle-simple-language"
              role="switch"
              aria-checked={settings.simpleLanguage}
              onClick={() => applyUpdate({ ...settings, simpleLanguage: !settings.simpleLanguage })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.simpleLanguage ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.simpleLanguage ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Fonte de Alta Legibilidade (Dislexia / Apoio Visual) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Fonte de Alta Legibilidade (Apoio à Dislexia)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
                Tipografia limpa com espaçamento entre letras que facilita a distinção dos caracteres.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={Boolean(settings.dyslexicFont)}
              onClick={() => applyUpdate({ ...settings, dyslexicFont: !settings.dyslexicFont })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.dyslexicFont ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.dyslexicFont ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Espaçamento Ampliado de Linhas e Letras */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Espaçamento Amplo de Linhas e Letras
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
                Garante maior respiro visual entre parágrafos, prevenindo fadiga em leituras longas.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={Boolean(settings.enhancedSpacing)}
              onClick={() => applyUpdate({ ...settings, enhancedSpacing: !settings.enhancedSpacing })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.enhancedSpacing ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.enhancedSpacing ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Volume de Texto Selector */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Volume de Texto / Nível de Detalhe
              </span>
              <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                {settings.textVolume || "médio"}
              </span>
            </div>
            <div className="flex bg-slate-200 dark:bg-slate-700/80 p-1 rounded-xl">
              {(["baixo", "médio", "alto"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => applyUpdate({ ...settings, textVolume: level })}
                  className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-lg capitalize transition cursor-pointer ${
                    (settings.textVolume || "médio") === level
                      ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Movimento & Redução de Animações */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Reduzir Animações e Movimento
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty">
              Desativa transições dinâmicas para evitar desconforto visual e acelerar a navegação.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={Boolean(settings.reducedMotion)}
            onClick={() => applyUpdate({ ...settings, reducedMotion: !settings.reducedMotion })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              settings.reducedMotion ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings.reducedMotion ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Ouvidoria e Canal de Feedback */}
        <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300">
              <MessageSquareText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Ouvidoria & Canal de Sugestões
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                Espaço aberto para feedback, sugestões ou pedidos de melhoria.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
            Sua colaboração é fundamental para aperfeiçoar o Turn OFF e manter a ferramenta útil e acessível para todos os perfis de usuários.
          </p>

          <a
            id="link-ouvidoria-form"
            href="https://forms.gle/yFHNmcvSwQfGbJdv5"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Acessar Formulário da Ouvidoria</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Limpeza de Dados Locais */}
        {onClearData && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {!confirmClear ? (
              <button
                id="btn-trigger-clear-data"
                onClick={() => setConfirmClear(true)}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar dados salvos e histórico local deste navegador
              </button>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 space-y-3">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 font-medium leading-relaxed text-pretty">
                  Tem certeza que deseja apagar todos os diagnósticos, faturas e configurações salvas neste navegador?
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    id="btn-confirm-clear-data"
                    onClick={() => {
                      onClearData();
                      setConfirmClear(false);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                  >
                    Sim, apagar tudo
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

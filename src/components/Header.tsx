import React, { useState, useEffect } from "react";
import {
  Zap,
  Moon,
  Sun,
  Sliders,
  Settings,
  Sparkles,
  HelpCircle,
  Share2,
  Volume2,
  Play,
  Pause,
  Square,
  BookOpen,
  Bot,
  User,
  LogOut
} from "lucide-react";
import { TurnOffLogo } from "./Logo";
import { AccessibilitySettings, AppTab } from "../types";
import { auth, logout } from "../lib/firebase";
import { syncToCloud } from "../lib/sync/firebaseSync";

interface HeaderProps {
  currentTab?: AppTab | string;
  activeTab?: AppTab | string;
  onSelectTab: (tab: AppTab) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onOpenAccessibility: () => void;
  onOpenTutorial?: () => void;
  onOpenAIChat?: () => void;
  onOpenShare: () => void;
  onOpenAuth?: () => void;
  settings?: AccessibilitySettings;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  theme = "light",
  onToggleTheme,
  onOpenAccessibility,
  onOpenTutorial,
  onOpenAIChat,
  onOpenShare,
  onOpenAuth,
  settings,
}) => {
  const effectiveTab: AppTab = (activeTab || currentTab || "home") as AppTab;
  const [user, setUser] = useState(auth.currentUser);
  const isLargeFont = (settings?.fontScale ?? 0.85) > 1.0;

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        syncToCloud().catch((err) => console.warn("[Header sync]", err));
      }
    });
    return () => unsub();
  }, []);

  const handleAuthClick = () => {
    if (onOpenAuth) {
      onOpenAuth();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors no-print">
      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 min-h-14 sm:min-h-16 py-1.5">
          {/* Logo Brand */}
          <button
            id="nav-logo"
            onClick={() => onSelectTab("home")}
            className="flex items-center gap-1.5 sm:gap-2.5 group focus:outline-hidden text-left shrink min-w-0"
            title="Ir para o Início"
          >
            <TurnOffLogo
              size={32}
              withBadge={true}
              className="group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white font-['Space_Grotesk'] truncate">
                  Turn{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    OFF
                  </span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                  v2.5
                </span>
              </div>
              {!isLargeFont && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden md:block truncate">
                  Energia & Segurança
                </p>
              )}
            </div>
          </button>

          {/* Action Buttons Right - Adaptativo e sem corte para qualquer escala de fonte */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink min-w-0 max-w-full overflow-x-auto no-scrollbar py-1">
            {/* IA Explicativa Button */}
            {onOpenAIChat && (
              <button
                id="btn-header-ai-chat"
                onClick={onOpenAIChat}
                className={`h-8 w-8 sm:h-9 ${!isLargeFont ? "sm:w-9 xl:w-auto xl:px-2.5" : "sm:w-9 px-0"} rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs shrink-0`}
                title="Abrir IA Explicativa Turn OFF"
                aria-label="Abrir IA Explicativa"
              >
                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!isLargeFont && <span className="hidden xl:inline whitespace-nowrap">IA Explicativa</span>}
              </button>
            )}

            {/* Tutorial Button */}
            {onOpenTutorial && (
              <button
                id="btn-open-tutorial-header"
                onClick={onOpenTutorial}
                className={`h-8 w-8 sm:h-9 ${!isLargeFont ? "sm:w-9 xl:w-auto xl:px-2.5" : "sm:w-9 px-0"} rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs shrink-0`}
                title="Abrir Tutorial e Guia do Aplicativo"
                aria-label="Abrir Tutorial Passo a Passo"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!isLargeFont && <span className="hidden xl:inline whitespace-nowrap">Tutorial</span>}
              </button>
            )}

            {/* Share App Button */}
            <button
              id="btn-header-share"
              onClick={onOpenShare}
              className={`h-8 w-8 sm:h-9 ${!isLargeFont ? "sm:w-9 xl:w-auto xl:px-2.5" : "sm:w-9 px-0"} rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs shrink-0`}
              title="Compartilhar Aplicativo Turn OFF"
              aria-label="Compartilhar Aplicativo"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {!isLargeFont && <span className="hidden xl:inline whitespace-nowrap">Compartilhar</span>}
            </button>

            {/* Settings & Accessibility Button */}
            <button
              id="btn-open-accessibility"
              onClick={onOpenAccessibility}
              className={`h-8 w-8 sm:h-9 ${!isLargeFont ? "sm:w-9 xl:w-auto xl:px-2.5" : "sm:w-9 px-0"} rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs relative shrink-0`}
              title="Configurações, Acessibilidade e Ouvidoria"
              aria-label="Abrir opções de acessibilidade e ouvidoria"
            >
              <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {!isLargeFont && <span className="hidden xl:inline whitespace-nowrap">Acessibilidade</span>}
              {(settings?.highContrast ||
                settings?.simpleLanguage ||
                settings?.reducedMotion ||
                settings?.dyslexicFont ||
                settings?.enhancedSpacing ||
                settings?.largeFocusRing) && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900"
                  title="Recursos de acessibilidade ativos"
                />
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={onToggleTheme}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
              title={
                theme === "dark"
                  ? "Mudar para Modo Claro"
                  : "Mudar para Modo Escuro"
              }
              aria-label="Alternar entre modo claro e modo escuro"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </button>
            
            {/* Auth / Account Button */}
            <button
              id="btn-auth-header"
              onClick={handleAuthClick}
              className={`h-8 w-8 sm:h-9 ${!isLargeFont ? "sm:w-9 xl:w-auto xl:px-2.5" : "sm:w-9 px-0"} rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs relative shrink-0`}
              title={
                user
                  ? `Minha Conta (${user.email}) - Gerenciar Nuvem & Backup`
                  : "Salvar na Nuvem / Entrar na Conta"
              }
              aria-label="Gerenciar Conta e Nuvem"
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {user.displayName ? user.displayName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : "U"}
                    </div>
                  )}
                  {!isLargeFont && (
                    <span className="hidden xl:inline truncate max-w-[80px]">
                      {user.displayName?.split(" ")[0] || "Conta"}
                    </span>
                  )}
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900"
                    title="Conectado com Firebase"
                  />
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!isLargeFont && <span className="hidden xl:inline whitespace-nowrap">Entrar</span>}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);

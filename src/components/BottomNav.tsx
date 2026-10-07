import React from "react";
import {
  Home,
  FileScan,
  Activity,
  Sliders,
  ShoppingBag,
  ShieldAlert,
  GraduationCap,
  HeartHandshake,
  History,
} from "lucide-react";
import { AppTab } from "../types";

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  savedDiagnosisCount?: number;
  savedBillsCount?: number;
  isFocusMode?: boolean;
}

interface NavItem {
  id: AppTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const BottomNavComponent: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  savedDiagnosisCount = 0,
  savedBillsCount = 0,
  isFocusMode = false,
}) => {
  const navItems: NavItem[] = [
    { id: "home", label: "Início", icon: Home },
    { id: "scanner", label: "Leitor", icon: FileScan },
    { id: "diagnosis", label: "Diagnóstico", icon: Activity },
    { id: "simulator", label: "Simulação", icon: Sliders },
    { id: "payback", label: "Payback", icon: ShoppingBag },
    { id: "safety", label: "Segurança", icon: ShieldAlert },
    { id: "learn", label: "Aprender", icon: GraduationCap },
    { id: "tarifa-social", label: "Tarifa Social", icon: HeartHandshake },
    {
      id: "history",
      label: "Histórico",
      icon: History,
      badge:
        savedDiagnosisCount + savedBillsCount > 0
          ? savedDiagnosisCount + savedBillsCount
          : undefined,
    },
  ];

  const tabColors: Record<
    AppTab,
    { text: string; bg: string; indicator: string; badge: string }
  > = {
    home: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      indicator: "bg-emerald-600 dark:bg-emerald-400",
      badge: "bg-emerald-600",
    },
    scanner: {
      text: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/60",
      indicator: "bg-orange-600 dark:bg-orange-400",
      badge: "bg-orange-600",
    },
    diagnosis: {
      text: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-950/60",
      indicator: "bg-teal-600 dark:bg-teal-400",
      badge: "bg-teal-600",
    },
    simulator: {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/60",
      indicator: "bg-blue-600 dark:bg-blue-400",
      badge: "bg-blue-600",
    },
    payback: {
      text: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/60",
      indicator: "bg-purple-600 dark:bg-purple-400",
      badge: "bg-purple-600",
    },
    safety: {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/60",
      indicator: "bg-red-600 dark:bg-red-400",
      badge: "bg-red-600",
    },
    learn: {
      text: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/60",
      indicator: "bg-indigo-600 dark:bg-indigo-400",
      badge: "bg-indigo-600",
    },
    "tarifa-social": {
      text: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-50 dark:bg-pink-950/60",
      indicator: "bg-pink-600 dark:bg-pink-400",
      badge: "bg-pink-600",
    },
    history: {
      text: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/60",
      indicator: "bg-amber-500 dark:bg-amber-400",
      badge: "bg-amber-500",
    },
  };

  return (
    <nav
      id="bottom-nav-bar"
      aria-label="Navegação Principal do Aplicativo"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg no-print transition-all duration-300 ease-in-out translate-y-0 opacity-100"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between sm:justify-around overflow-x-auto py-1.5 no-scrollbar gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const colors = tabColors[item.id] || tabColors.home;
            return (
              <button
                key={item.id}
                id={`btn-nav-bottom-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center min-w-[62px] sm:min-w-[76px] py-1.5 px-1.5 rounded-2xl transition-all relative group shrink-0 ${
                  isActive
                    ? `${colors.text} font-bold`
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {/* Active Indicator Bar / Pill */}
                {isActive && (
                  <span
                    className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 ${colors.indicator} rounded-full`}
                  />
                )}

                <div className="relative">
                  <span
                    className={`p-1.5 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? colors.bg
                        : "group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </span>

                  {/* Badge Notification */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full ${colors.badge} text-white text-[9px] font-black flex items-center justify-center`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] sm:text-[11px] tracking-tight whitespace-nowrap mt-0.5 leading-tight ${
                    isActive ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export const BottomNav = React.memo(BottomNavComponent);

import React, { useState, useMemo } from "react";
import {
  Award,
  ChevronDown,
  CheckCircle2,
  Zap,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EnergyEfficiencyClass } from "../types";
import {
  ENERGY_EFFICIENCY_CLASSES,
  EnergyClassDefinition,
} from "../lib/energy";

export interface EnergyClassSelectorProps {
  value: EnergyEfficiencyClass;
  onChange: (value: EnergyEfficiencyClass) => void;
  applianceKey?: string;
  theme?: "teal" | "indigo" | "amber" | "emerald";
  compact?: boolean;
  showDescription?: boolean;
  showQuickPresets?: boolean;
  idPrefix?: string;
  label?: string;
  defaultOpen?: boolean;
}

/**
 * Explicação contextual inteligente de acordo com o tipo de aparelho
 */
export function getApplianceClassContext(
  applianceKey: string = "",
  efficiencyClass: EnergyEfficiencyClass
): string {
  const key = applianceKey.toLowerCase();
  const isAc = key.includes("ar-condicionado") || key.includes("ac");
  const isFridge =
    key.includes("geladeira") ||
    key.includes("refrigerador") ||
    key.includes("freezer");
  const isWasher =
    key.includes("lavadora") ||
    key.includes("maquina-lavar") ||
    key.includes("lava-seca");
  const isShower = key.includes("chuveiro") || key.includes("aquecedor");

  if (efficiencyClass === "A+++") {
    if (isAc)
      return "Tecnologia Dual Inverter de última geração (fluido R-32): modula a rotação sem picos e economiza até 70% de luz frente a modelos antigos.";
    if (isFridge)
      return "Compressor Digital Inverter com isolamento VIP (Vácuo): preserva a temperatura estável sem armar motor ciclicamente.";
    if (isWasher)
      return "Motor Direct Drive sem correia com inteligência de pesagem e ciclos rápidos a frio de altíssimo rendimento.";
    if (isShower)
      return "Chuveiro eletrônico pressurizado de alta precisão com ajuste linear gradual da potência.";
    return "Nível topo de linha Inmetro / Procel: tecnologia de ponta com eficiência máxima de mercado.";
  }

  if (efficiencyClass === "A++") {
    if (isAc)
      return "Inverter Avançado: controle de fluxo eficiente, sem ruído de partida e economia real de ~60%.";
    if (isFridge)
      return "Inverter Moderno Frost-Free com classificação A++ e excelente vedação magnética térmica.";
    return "Altíssimo rendimento energético, consumindo cerca de 25% menos que um modelo Classe A comum.";
  }

  if (efficiencyClass === "A+") {
    if (isAc)
      return "Inverter Padrão: elimina o liga-desliga brusco tradicional, gerando economia expressiva de energia.";
    return "Superior à referência do Selo Procel básico, com redução de ~15% de consumo elétrico.";
  }

  if (efficiencyClass === "A") {
    if (isAc)
      return "Selo Procel A tradicional: modelo convencional ou inverter de entrada que atende à norma ANEEL/Inmetro de referência.";
    if (isFridge)
      return "Geladeira Classe A com motor tradicional de liga-desliga padrão e selo Procel de fábrica.";
    return "Referência padrão de mercado certificado com Selo Procel de Eficiência.";
  }

  if (efficiencyClass === "B") {
    return "Consome cerca de 15% a mais que a referência Procel A. Típico de aparelhos intermediários de 2 a 4 anos.";
  }

  if (efficiencyClass === "C") {
    if (isAc)
      return "Ar convencional On/Off antigo: consome 30% a mais pelos picos repetidos de partida do compressor a cada ciclo.";
    return "Consumo intermediário elevado (+30% vs A), sem tecnologias recentes de preservação energética.";
  }

  if (efficiencyClass === "D") {
    if (isFridge)
      return "Geladeira antiga (~5 a 8 anos): motor fatigado e borrachas com perda de vedação, puxando 50% mais luz.";
    return "Alto consumo (+50% vs A): equipamento antigo ou com tecnologia defasada sem certificação recente.";
  }

  if (efficiencyClass === "E") {
    return "Consumo muito desfavorável (+70% vs A): tecnologia obsoleta com forte dissipação térmica e atrito mecânico.";
  }

  // F
  if (isFridge)
    return "Geladeira com mais de 10 anos: borracha ressecada, gás cansado e motor trabalhando quase 24h sem desligar.";
  if (isAc)
    return "Ar de janela ou split antigo sem manutenção: consumo elétrico crítico, quase o dobro de um moderno.";
  return "Consumo crítico (+95% vs A): aparelho com mais de 10 anos de uso sem tecnologia de economia.";
}

export const EnergyClassSelector: React.FC<EnergyClassSelectorProps> = ({
  value,
  onChange,
  applianceKey = "",
  theme = "teal",
  compact = false,
  showDescription = true,
  showQuickPresets = true,
  idPrefix = "energy-class",
  label = "Classe do equipamento",
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const classes = ENERGY_EFFICIENCY_CLASSES;

  const currentClassDef: EnergyClassDefinition = useMemo(() => {
    return classes.find((c) => c.code === value) || classes[3]; // Default 'A'
  }, [value, classes]);

  // Estilos de acento temáticos coerentes com o módulo
  const themeStyles = {
    teal: {
      borderActive: "border-teal-500 ring-teal-500/20",
      badgeLight: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
      accentText: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    },
    indigo: {
      borderActive: "border-indigo-500 ring-indigo-500/20",
      badgeLight: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
      accentText: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    },
    amber: {
      borderActive: "border-amber-500 ring-amber-500/20",
      badgeLight: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      accentText: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    emerald: {
      borderActive: "border-emerald-500 ring-emerald-500/20",
      badgeLight: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      accentText: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
  }[theme];

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isOpen
          ? "bg-slate-50/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 shadow-xs"
          : "bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      } ${compact ? "p-2.5 sm:p-3" : "p-3 sm:p-3.5"}`}
    >
      {/* Botão de Disparo / Cabeçalho: Escondido por padrão, expande ao clicar em "Classe do equipamento" */}
      <button
        type="button"
        id={`${idPrefix}-toggle-btn`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`${idPrefix}-panel`}
        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${themeStyles.iconBg}`}
          >
            <Award className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {label}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                (PBE / Inmetro)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isOpen
                ? "Clique para recolher as opções"
                : "Toque para abrir as opções de eficiência"}
            </p>
          </div>
        </div>

        {/* Badge da Classe Selecionada com Cor Oficial Inmetro e Seta Indicadora */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-black text-white flex items-center gap-1 shadow-xs transition-transform group-hover:scale-105"
            style={{ backgroundColor: currentClassDef.badgeColorHex }}
          >
            {currentClassDef.code.includes("A") && (
              <Sparkles className="w-3 h-3 text-amber-200 shrink-0" />
            )}
            {currentClassDef.code}
          </span>

          <span className="hidden sm:inline text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[130px] truncate">
            {currentClassDef.badgeText}
          </span>

          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isOpen
                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rotate-180"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200"
            }`}
          >
            <ChevronDown className="w-4 h-4 transition-transform duration-200" />
          </div>
        </div>
      </button>

      {/* Painel de Opções que abre ao apertar */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`${idPrefix}-panel`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3.5 space-y-3 border-t border-slate-200/80 dark:border-slate-800 mt-3">
              {/* Lista Completa de Seleção de Classes (Escala Inmetro de Fato) */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {classes.map((cls) => {
                  const isSelected = value === cls.code;
                  return (
                    <button
                      key={cls.code}
                      type="button"
                      id={`${idPrefix}-option-${cls.code}`}
                      onClick={() => onChange(cls.code)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-slate-900 dark:ring-white border-transparent bg-white dark:bg-slate-800 shadow-xs"
                          : "border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300"
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? `${cls.badgeColorHex}12`
                          : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-10 py-1 rounded-lg text-xs font-black text-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: cls.badgeColorHex }}
                        >
                          {cls.code}
                        </span>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{cls.badgeText}</span>
                            {cls.code.includes("A") && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Inmetro Procel
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {cls.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-md"
                          style={{
                            color: cls.badgeColorHex,
                            backgroundColor: `${cls.badgeColorHex}18`,
                          }}
                        >
                          {cls.multiplier <= 1.0
                            ? cls.multiplier === 1.0
                              ? "Referência"
                              : `-${Math.round((1 - cls.multiplier) * 100)}% luz`
                            : `+${Math.round((cls.multiplier - 1) * 100)}% luz`}
                        </span>

                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explicação Contextual do Aparelho */}
              {showDescription && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 leading-snug flex items-start gap-2.5">
                  {currentClassDef.multiplier <= 1.0 ? (
                    <Zap
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: currentClassDef.badgeColorHex }}
                    />
                  ) : (
                    <AlertCircle
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: currentClassDef.badgeColorHex }}
                    />
                  )}
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Impacto prático no equipamento:{" "}
                    </span>
                    {getApplianceClassContext(applianceKey, value)}
                  </div>
                </div>
              )}

              {/* Botão para Concluir / Recolher */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Selecionado: <strong>Classe {currentClassDef.code}</strong> (
                  {currentClassDef.badgeText})
                </span>
                <button
                  type="button"
                  id={`${idPrefix}-close-btn`}
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Concluir seleção
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Aliases para compatibilidade total
export const EnergyClassSlider = EnergyClassSelector;

import { ApplianceInput, ApplianceKey } from "../types";
import { APPLIANCE_HABITS_CATALOG, ApplianceHabitPreset } from "./applianceHabitsCatalog";
import { applianceCatalog, calculateDiagnosis } from "./energy";

export interface ApplianceHabitImpact {
  habitId: string;
  applianceKey: ApplianceKey;
  label: string;
  category: string;
  physics: string;
  tip: string;
  direction: "reduce" | "increase";
  
  // Variações absolutas e percentuais do aparelho isolado
  isolatedDeltaKwh: number;        // positivo = economia (base - simulado), negativo = aumento
  isolatedDeltaBrl: number;        // em R$ baseado na tarifa efetiva
  applianceBaseKwh: number;
  applianceSimulatedKwh: number;
  appliancePercentSavings: number; // % economizada no aparelho individual
  
  // Impacto global na fatura da residência
  globalKwhSavings: number;
  globalBrlSavings: number;
  globalPercentSavings: number;
}

export interface HabitCalculationEngineParams {
  baseAppliances: ApplianceInput[];
  monthlyKwh: number;
  billValue: number;
  occupants?: number;
  activeHabitIds: Record<string, boolean>; // id do hábito -> true/false
  effectiveTariffPerKwh?: number;
  customSliders?: {
    showerMinutes?: number;
    acDailyHours?: number;
    acTemperature?: number;
    tvDailyHours?: number;
  };
}

export interface HabitCalculationEngineResult {
  simulatedAppliances: ApplianceInput[];
  baseDiagnosis: ReturnType<typeof calculateDiagnosis>;
  simulatedDiagnosis: ReturnType<typeof calculateDiagnosis>;
  effectiveTariff: number;
  
  // Métricas de Impacto Geral
  totalBaseKwh: number;
  totalSimulatedKwh: number;
  totalDeltaKwh: number; // base - simulated (positivo = economia)
  totalDeltaBrl: number;
  isOverallSavings: boolean;
  isOverallIncrease: boolean;

  // Impacto decomposto por cada hábito ativado
  activeHabitsImpact: ApplianceHabitImpact[];
  
  // Comparativo antes x depois por aparelho presente
  applianceComparisons: Array<{
    key: ApplianceKey;
    label: string;
    category: string;
    present: boolean;
    baseKwh: number;
    simulatedKwh: number;
    deltaKwh: number;
    deltaBrl: number;
    percentDelta: number;
    activeHabitCount: number;
  }>;
}

/**
 * Aplica os hábitos ativados sobre a lista de aparelhos com precisão física e matemática.
 * Respeita a base de cálculo de cada aparelho e a proporcionalidade de potências e fatores de uso.
 */
export function applyHabitsToAppliances(
  baseAppliances: ApplianceInput[],
  activeHabitIds: Record<string, boolean>,
  customSliders?: {
    showerMinutes?: number;
    acDailyHours?: number;
    acTemperature?: number;
    tvDailyHours?: number;
  },
  occupants: number = 3
): ApplianceInput[] {
  // Clona profundamente os aparelhos da base
  const simulated: ApplianceInput[] = JSON.parse(JSON.stringify(baseAppliances));

  // Mapa de hábitos rápidos por aparelho
  const allHabitsMap = new Map<string, ApplianceHabitPreset>();
  Object.values(APPLIANCE_HABITS_CATALOG).forEach((habits) => {
    habits.forEach((h) => allHabitsMap.set(h.id, h));
  });

  // Helper to extract baseline shower minutes
  const getBaseShowerMins = (b: ApplianceInput, occ: number): number => {
    if (b.showerDetails?.mode === "detailed" && b.showerDetails.bathers?.length) {
      const avg = Math.round(
        b.showerDetails.bathers.reduce((s, x) => s + x.minutesPerBath, 0) /
        b.showerDetails.bathers.length
      );
      return Math.max(1, avg);
    }
    if (b.showerDetails?.averageMinutesPerBath) {
      return b.showerDetails.averageMinutesPerBath;
    }
    if (b.hoursPerDay) {
      return Math.max(1, Math.round((b.hoursPerDay * 60) / Math.max(1, occ)));
    }
    return 12;
  };

  // 1. Chuveiro: integração unificada entre slider e hábitos (evita dupla ação e sobrescrita)
  const chuveiro = simulated.find((a) => a.key === "chuveiro");
  const baseChuveiro = baseAppliances.find((b) => b.key === "chuveiro");
  if (chuveiro && baseChuveiro) {
    const baseMins = getBaseShowerMins(baseChuveiro, occupants);
    let targetMinutes = customSliders?.showerMinutes !== undefined ? customSliders.showerMinutes : baseMins;

    // Se o hábito de fechar torneira ao ensaboar estiver ativo, reduz o tempo ativo de água quente em 30%
    if (activeHabitIds["shower_soap"]) {
      targetMinutes = Math.max(1, Math.round(targetMinutes * 0.70));
    }

    // Se o chuveiro tiver perfil detalhado por moradores, escalona proporcionalmente cada banhista
    if (chuveiro.showerDetails?.mode === "detailed" && chuveiro.showerDetails.bathers?.length) {
      const ratio = targetMinutes / Math.max(1, baseMins);
      chuveiro.showerDetails.bathers = chuveiro.showerDetails.bathers.map((b) => ({
        ...b,
        minutesPerBath: Math.max(1, Math.round(b.minutesPerBath * ratio)),
        seasonSetting: activeHabitIds["shower_summer"]
          ? "verao"
          : (activeHabitIds["shower_longer_winter"] ? "inverno" : b.seasonSetting),
      }));
      chuveiro.showerDetails.averageMinutesPerBath = targetMinutes;
      const detailedDailyHours = chuveiro.showerDetails.bathers.reduce(
        (sum, b) => sum + (b.minutesPerBath * (b.bathsPerDay || 1)) / 60,
        0
      );
      chuveiro.hoursPerDay = Math.max(0.1, Math.round(detailedDailyHours * 100) / 100);
    } else {
      const bathsPerDay = chuveiro.showerDetails?.bathsPerDayPerPerson || 1;
      chuveiro.hoursPerDay = Math.max(0.1, Math.round(((occupants * targetMinutes * bathsPerDay) / 60) * 100) / 100);
      if (chuveiro.showerDetails) {
        chuveiro.showerDetails.averageMinutesPerBath = targetMinutes;
        if (activeHabitIds["shower_summer"]) {
          chuveiro.showerDetails.defaultSetting = "verao";
        } else if (activeHabitIds["shower_longer_winter"]) {
          chuveiro.showerDetails.defaultSetting = "inverno";
        }
      }
    }

    // Hábitos térmicos e mecânicos complementares
    if (activeHabitIds["shower_summer"]) {
      // Se chuveiro não tiver perfil detalhado ou configurações de chave, ajusta a potência nominal diretamente;
      // se tiver showerDetails, a redução de 35% já é modelada via defaultSetting / seasonSetting = "verao"
      if (!chuveiro.showerDetails) {
        chuveiro.powerWatts = Math.round((baseChuveiro.powerWatts || 5500) * 0.65);
      }
    }
    if (activeHabitIds["shower_restrictor"]) {
      chuveiro.powerWatts = Math.round((chuveiro.powerWatts || 5500) * 0.80);
    }
    if (activeHabitIds["shower_clean_spread"]) {
      chuveiro.powerWatts = Math.round((chuveiro.powerWatts || 5500) * 0.95);
    }
    if (activeHabitIds["shower_longer_winter"]) {
      chuveiro.powerWatts = Math.round(Math.max(chuveiro.powerWatts || 5500, 6500) * 1.15);
      chuveiro.hoursPerDay = Math.round(chuveiro.hoursPerDay * 1.35 * 100) / 100;
    }
  }

  // 2. Ar-Condicionado: integração unificada entre horas, temperatura e hábitos
  const ac = simulated.find((a) => a.key === "ar-condicionado");
  const baseAc = baseAppliances.find((b) => b.key === "ar-condicionado");
  if (ac && baseAc) {
    let hours = customSliders?.acDailyHours !== undefined ? customSliders.acDailyHours : baseAc.hoursPerDay;
    if (activeHabitIds["ac_timer_night"]) {
      hours = Math.max(0, hours - 2);
    }
    ac.hoursPerDay = hours;

    let temp = customSliders?.acTemperature !== undefined ? customSliders.acTemperature : 22;
    if (activeHabitIds["ac_temp_24"]) {
      temp = Math.max(temp, 24);
    }
    const delta = Math.max(0, temp - 20);
    let duty = Math.max(0.30, 0.72 - delta * 0.055);
    if (activeHabitIds["ac_filter_clean"]) duty *= 0.90;
    if (activeHabitIds["ac_insulation"]) duty *= 0.85;
    if (activeHabitIds["ac_fan_support"]) duty *= 0.80;
    if (activeHabitIds["ac_freeze_17"]) duty = Math.min(1.0, duty * 1.45);
    ac.utilizationFactor = Math.round(duty * 100) / 100;
  }

  // 3. Televisão: integração unificada entre horas e hábitos de stand-by/brilho
  const tv = simulated.find((a) => a.key === "televisao");
  const baseTv = baseAppliances.find((b) => b.key === "televisao");
  if (tv && baseTv) {
    let hours = customSliders?.tvDailyHours !== undefined ? customSliders.tvDailyHours : baseTv.hoursPerDay;
    if (activeHabitIds["tv_sleep_timer"]) {
      hours = Math.max(0.5, hours - 2);
    }
    tv.hoursPerDay = hours;
    if (activeHabitIds["tv_brightness_eco"]) {
      tv.powerWatts = Math.round((baseTv.powerWatts || 120) * 0.80);
    }
    if (activeHabitIds["tv_unplug_standby"]) {
      tv.powerWatts = Math.round(tv.powerWatts * 0.92);
    }
  }

  // 4. Aplica os hábitos de catálogo em todos os demais aparelhos
  simulated.forEach((app) => {
    if (["chuveiro", "ar-condicionado", "televisao"].includes(app.key)) return;
    const baseApp = baseAppliances.find((b) => b.key === app.key);
    if (!baseApp) return;

    const catalogHabits = APPLIANCE_HABITS_CATALOG[app.key] || [];
    catalogHabits.forEach((habit) => {
      if (activeHabitIds[habit.id]) {
        habit.apply(app, baseApp, true);
      }
    });
  });

  return simulated;
}

/**
 * Motor central de cálculo de economia dos hábitos com precisão física e financeira.
 * Retorna os deltas individuais, os deltas globais e a discriminação por aparelho.
 */
export function calculateHabitsEconomy(
  params: HabitCalculationEngineParams
): HabitCalculationEngineResult {
  const {
    baseAppliances,
    monthlyKwh,
    billValue,
    occupants = 3,
    activeHabitIds,
    customSliders
  } = params;

  // 1. Tarifa efetiva por kWh
  const effectiveTariff =
    params.effectiveTariffPerKwh && params.effectiveTariffPerKwh > 0
      ? params.effectiveTariffPerKwh
      : billValue > 0 && monthlyKwh > 0
      ? billValue / monthlyKwh
      : 0.88; // Média padrão ANEEL B1 residencial

  // 2. Diagnóstico da base original de referência
  const baseDiagnosis = calculateDiagnosis({
    monthlyKwh,
    occupants,
    appliances: baseAppliances,
    detailed: true,
    hasSafetyRisk: false,
    billValue
  });

  // 3. Aplica todos os hábitos ativados na simulação
  const simulatedAppliances = applyHabitsToAppliances(
    baseAppliances,
    activeHabitIds,
    customSliders,
    occupants
  );

  // 4. Diagnóstico com a base simulada
  const simulatedDiagnosis = calculateDiagnosis({
    monthlyKwh,
    occupants,
    appliances: simulatedAppliances,
    detailed: true,
    hasSafetyRisk: false,
    billValue
  });

  // 5. Métricas de Totais
  const totalBaseKwh = Math.max(1, baseDiagnosis.totalEstimated);
  const totalSimulatedKwh = simulatedDiagnosis.totalEstimated;
  const totalDeltaKwh = Math.round((totalBaseKwh - totalSimulatedKwh) * 10) / 10;
  const totalDeltaBrl = Math.round(totalDeltaKwh * effectiveTariff * 100) / 100;
  const isOverallSavings = totalDeltaKwh > 0.05;
  const isOverallIncrease = totalDeltaKwh < -0.05;

  // 6. Impacto isolado de cada hábito ativado (análise ceteris paribus)
  const activeHabitsImpact: ApplianceHabitImpact[] = [];
  
  // Mapa de hábitos cadastrados
  const allCatalogHabits: ApplianceHabitPreset[] = [];
  Object.values(APPLIANCE_HABITS_CATALOG).forEach((habits) => {
    allCatalogHabits.push(...habits);
  });

  allCatalogHabits.forEach((habit) => {
    if (!activeHabitIds[habit.id]) return;

    const baseApp = baseAppliances.find((a) => a.key === habit.applianceKey);
    if (!baseApp) return;

    // Simula apenas este hábito isoladamente
    const singleIsoAppliances: ApplianceInput[] = JSON.parse(JSON.stringify(baseAppliances));
    const targetApp = singleIsoAppliances.find((a) => a.key === habit.applianceKey);
    if (targetApp) {
      habit.apply(targetApp, baseApp, true);
    }

    const isoDiagnosis = calculateDiagnosis({
      monthlyKwh,
      occupants,
      appliances: singleIsoAppliances,
      detailed: true,
      hasSafetyRisk: false,
      billValue
    });

    const baseItem = baseDiagnosis.estimates.find((i) => i.key === habit.applianceKey);
    const isoItem = isoDiagnosis.estimates.find((i) => i.key === habit.applianceKey);

    const appBaseKwh = baseItem?.monthlyKwh || 0;
    const appSimKwh = isoItem?.monthlyKwh || 0;
    const isoDeltaKwh = Math.round((appBaseKwh - appSimKwh) * 10) / 10;
    const isoDeltaBrl = Math.round(isoDeltaKwh * effectiveTariff * 100) / 100;
    const appPercentSavings = appBaseKwh > 0 ? Math.round((isoDeltaKwh / appBaseKwh) * 100) : 0;

    const globalDeltaKwh = Math.round((totalBaseKwh - isoDiagnosis.totalEstimated) * 10) / 10;
    const globalDeltaBrl = Math.round(globalDeltaKwh * effectiveTariff * 100) / 100;
    const globalPercent = totalBaseKwh > 0 ? Math.round((globalDeltaKwh / totalBaseKwh) * 1000) / 10 : 0;

    const catDef = applianceCatalog.find((c) => c.key === habit.applianceKey);
    const category = catDef?.category || "outros";

    activeHabitsImpact.push({
      habitId: habit.id,
      applianceKey: habit.applianceKey,
      label: habit.label,
      category,
      physics: habit.physics,
      tip: habit.tip,
      direction: habit.direction || "reduce",
      isolatedDeltaKwh: isoDeltaKwh,
      isolatedDeltaBrl: isoDeltaBrl,
      applianceBaseKwh: Math.round(appBaseKwh * 10) / 10,
      applianceSimulatedKwh: Math.round(appSimKwh * 10) / 10,
      appliancePercentSavings: appPercentSavings,
      globalKwhSavings: globalDeltaKwh,
      globalBrlSavings: globalDeltaBrl,
      globalPercentSavings: globalPercent
    });
  });

  // Ordena os hábitos por maior impacto financeiro
  activeHabitsImpact.sort((a, b) => Math.abs(b.isolatedDeltaBrl) - Math.abs(a.isolatedDeltaBrl));

  // 7. Comparativo por aparelho
  const applianceComparisons = baseDiagnosis.estimates.map((baseItem) => {
    const simItem = simulatedDiagnosis.estimates.find((i) => i.key === baseItem.key);
    const bKwh = baseItem.monthlyKwh;
    const sKwh = simItem?.monthlyKwh || 0;
    const deltaKwh = Math.round((bKwh - sKwh) * 10) / 10;
    const deltaBrl = Math.round(deltaKwh * effectiveTariff * 100) / 100;
    const percentDelta = bKwh > 0 ? Math.round(((bKwh - sKwh) / bKwh) * 100) : 0;

    const catDef = applianceCatalog.find((c) => c.key === baseItem.key);
    const category = catDef?.category || "outros";

    // Conta quantos hábitos desse aparelho estão ativos
    const activeForApp = (APPLIANCE_HABITS_CATALOG[baseItem.key] || []).filter(
      (h) => activeHabitIds[h.id]
    ).length;

    return {
      key: baseItem.key,
      label: baseItem.label,
      category,
      present: baseItem.present,
      baseKwh: Math.round(bKwh * 10) / 10,
      simulatedKwh: Math.round(sKwh * 10) / 10,
      deltaKwh,
      deltaBrl,
      percentDelta,
      activeHabitCount: activeForApp
    };
  });

  return {
    simulatedAppliances,
    baseDiagnosis,
    simulatedDiagnosis,
    effectiveTariff,
    totalBaseKwh: Math.round(totalBaseKwh * 10) / 10,
    totalSimulatedKwh: Math.round(totalSimulatedKwh * 10) / 10,
    totalDeltaKwh,
    totalDeltaBrl,
    isOverallSavings,
    isOverallIncrease,
    activeHabitsImpact,
    applianceComparisons
  };
}

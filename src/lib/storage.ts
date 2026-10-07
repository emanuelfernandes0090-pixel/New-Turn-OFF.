import {
  AccessibilitySettings,
  BillScanRecord,
  ExtractedBill,
  MonthlyGoal,
  SavedDiagnosis,
} from "../types";

const DIAGNOSES_KEY = "turnoff:diagnoses:v2";
const BILLS_KEY = "turnoff:bills:v2";
const PROGRESS_KEY = "turnoff:plan_progress:v2";
const GOAL_KEY = "turnoff:monthly_goal:v2";
const ACCESSIBILITY_KEY = "turnoff:accessibility:v2";
const THEME_KEY = "turnoff:theme:v2";

export function loadStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] Erro ao carregar chave ${key}:`, error);
    return fallback;
  }
}

export function saveStoredJson<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`[storage] Erro ao salvar chave ${key}:`, error);
  }
}

import { triggerCloudSync } from "./sync/syncTrigger";

// Diagnoses
export function loadDiagnoses(): SavedDiagnosis[] {
  return loadStoredJson<SavedDiagnosis[]>(DIAGNOSES_KEY, []);
}

export function saveDiagnosis(diagnosis: SavedDiagnosis): SavedDiagnosis[] {
  const current = loadDiagnoses();
  // Filter out matching id if updating, then prepend
  const updated = [
    diagnosis,
    ...current.filter((d) => d.id !== diagnosis.id),
  ].slice(0, 30);
  saveStoredJson(DIAGNOSES_KEY, updated);
  triggerCloudSync();
  return updated;
}

export function deleteDiagnosis(id: string): SavedDiagnosis[] {
  const current = loadDiagnoses();
  const updated = current.filter((d) => d.id !== id);
  saveStoredJson(DIAGNOSES_KEY, updated);
  triggerCloudSync();
  return updated;
}

// Scanned bills
export function loadBillScans(): BillScanRecord[] {
  return loadStoredJson<BillScanRecord[]>(BILLS_KEY, []);
}

export function detectConsumptionAnomaly(
  bill: ExtractedBill,
  history: BillScanRecord[],
): {
  isAnomalous: boolean;
  averageKwh: number | null;
  increasePercent: number | null;
} {
  if (bill.consumo_kwh === null || bill.consumo_kwh <= 0) {
    return { isAnomalous: false, averageKwh: null, increasePercent: null };
  }

  const validHistory = history
    .map((h) => h.bill.consumo_kwh)
    .filter((kwh): kwh is number => typeof kwh === "number" && kwh > 0)
    .slice(0, 3);

  if (validHistory.length < 3) {
    return { isAnomalous: false, averageKwh: null, increasePercent: null };
  }

  const averageKwh =
    validHistory.reduce((a, b) => a + b, 0) / validHistory.length;
  const increasePercent = ((bill.consumo_kwh - averageKwh) / averageKwh) * 100;

  return {
    isAnomalous: increasePercent > 25,
    averageKwh: Math.round(averageKwh * 10) / 10,
    increasePercent: Math.round(increasePercent * 10) / 10,
  };
}

export function evaluateMonthlyGoal(
  consumoKwh: number | null,
  goal: MonthlyGoal | null,
): BillScanRecord["goalProgress"] {
  if (!goal || consumoKwh === null || consumoKwh < 0) return null;
  const differenceKwh = Math.round((goal.targetKwh - consumoKwh) * 10) / 10;
  return {
    targetKwh: goal.targetKwh,
    currentKwh: consumoKwh,
    differenceKwh,
    reached: differenceKwh >= 0,
  };
}

export function calculateObservedSavings(
  bill: ExtractedBill,
  scanCreatedAt: string,
  diagnoses: SavedDiagnosis[],
  completedActionIds: string[],
): BillScanRecord["observedSavings"] {
  if (bill.consumo_kwh === null || bill.consumo_kwh < 0) return null;

  const candidate = diagnoses.find(
    (d) => new Date(d.createdAt).getTime() <= new Date(scanCreatedAt).getTime(),
  );

  if (!candidate || completedActionIds.length === 0) return null;

  const reductionKwh =
    Math.round((candidate.input.monthlyKwh - bill.consumo_kwh) * 10) / 10;
  const expectedRange = candidate.result.savings.probable;

  let assessment: "dentro_da_faixa" | "abaixo_da_faixa" | "acima_da_faixa" =
    "dentro_da_faixa";
  if (reductionKwh < expectedRange[0]) assessment = "abaixo_da_faixa";
  else if (reductionKwh > expectedRange[1]) assessment = "acima_da_faixa";

  return {
    diagnosisId: candidate.id,
    completedActions: completedActionIds.length,
    reductionKwh,
    expectedRange,
    assessment,
  };
}

export function saveBillScan(bill: ExtractedBill): BillScanRecord {
  const current = loadBillScans();
  const diagnoses = loadDiagnoses();
  const progress = loadPlanProgress();
  const goal = loadMonthlyGoal();

  const anomaly = detectConsumptionAnomaly(bill, current);
  const createdAt = new Date().toISOString();

  const record: BillScanRecord = {
    id: `bill-${Date.now()}`,
    createdAt,
    bill,
    possivelTarifaSocial:
      bill.consumo_kwh !== null &&
      bill.consumo_kwh <= 80 &&
      !bill.tarifa_social_identificada,
    consumoAnomalo: anomaly.isAnomalous,
    goalProgress: evaluateMonthlyGoal(bill.consumo_kwh, goal),
    observedSavings: calculateObservedSavings(
      bill,
      createdAt,
      diagnoses,
      progress,
    ),
  };

  const updated = [record, ...current].slice(0, 30);
  saveStoredJson(BILLS_KEY, updated); triggerCloudSync();
  return record;
}

export function deleteBillScan(id: string): BillScanRecord[] {
  const current = loadBillScans();
  const updated = current.filter((b) => b.id !== id);
  saveStoredJson(BILLS_KEY, updated); triggerCloudSync();
  return updated;
}

// Plan progress
export function loadPlanProgress(): string[] {
  return loadStoredJson<string[]>(PROGRESS_KEY, []);
}

export function togglePlanAction(actionId: string): string[] {
  const current = loadPlanProgress();
  const updated = current.includes(actionId)
    ? current.filter((id) => id !== actionId)
    : [...current, actionId];
  saveStoredJson(PROGRESS_KEY, updated);
  return updated;
}

// Monthly Goal
export function loadMonthlyGoal(): MonthlyGoal | null {
  return loadStoredJson<MonthlyGoal | null>(GOAL_KEY, null);
}

export function saveMonthlyGoal(targetKwh: number): MonthlyGoal {
  const goal: MonthlyGoal = {
    targetKwh: Math.max(10, Math.round(targetKwh)),
    updatedAt: new Date().toISOString(),
  };
  saveStoredJson(GOAL_KEY, goal);
  return goal;
}

export function clearMonthlyGoal(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GOAL_KEY);
}

// Accessibility Preferences (Standard default font scale: 85%)
export const defaultAccessibility: AccessibilitySettings = {
  fontScale: 0.85,
  simpleLanguage: false,
  textVolume: "médio",
  confirmImportantActions: true,
  theme: "dark",
  textSize: "normal",
  highContrast: false,
  reducedMotion: false,
  dyslexicFont: false,
  enhancedSpacing: false,
  largeFocusRing: false,
  aiAssistantEnabled: true,
  speechGuide: {
    enabled: false,
    rate: 1.0,
    volume: 1.0,
    mode: "resumo",
  },
};

export function loadAccessibility(): AccessibilitySettings {
  const loaded = loadStoredJson<AccessibilitySettings | null>(
    ACCESSIBILITY_KEY,
    null,
  );
  const theme = loaded?.theme === "light" ? "light" : "dark";

  // Ensure default starts at 0.85 (85%)
  let fontScale = loaded?.fontScale ?? 0.85;
  if (typeof window !== "undefined") {
    const migrated = localStorage.getItem("turnoff_scale_85_applied_v1");
    if (!migrated) {
      fontScale = 0.85;
      localStorage.setItem("turnoff_scale_85_applied_v1", "true");
    }
  }

  return {
    ...defaultAccessibility,
    ...(loaded || {}),
    fontScale,
    aiAssistantEnabled:
      loaded?.aiAssistantEnabled !== undefined
        ? loaded.aiAssistantEnabled
        : true,
    theme,
    speechGuide: {
      ...defaultAccessibility.speechGuide,
      ...(loaded?.speechGuide || {}),
    },
  };
}

export function saveAccessibility(settings: AccessibilitySettings): void {
  saveStoredJson(ACCESSIBILITY_KEY, settings);
}

// Theme
export function loadTheme(): "light" | "dark" {
  return loadStoredJson<"light" | "dark">(THEME_KEY, "dark");
}

export function saveTheme(theme: "light" | "dark"): void {
  saveStoredJson(THEME_KEY, theme);
}

export function saveDiagnoses(diagnoses: SavedDiagnosis[]): void {
  saveStoredJson(DIAGNOSES_KEY, diagnoses.slice(0, 50));
}

export function saveBillScans(scans: BillScanRecord[]): void {
  saveStoredJson(BILLS_KEY, scans.slice(0, 50));
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  return loadAccessibility();
}

export function saveAccessibilitySettings(
  settings: AccessibilitySettings,
): void {
  saveAccessibility(settings);
}

export interface BackupValidationResult {
  valid: boolean;
  diagnosesCount: number;
  billsCount: number;
  exportedAt?: string;
  hasGoal?: boolean;
  hasAccessibility?: boolean;
  error?: string;
}

export function validateBackupJson(jsonString: string): BackupValidationResult {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== "object") {
      return { valid: false, diagnosesCount: 0, billsCount: 0, error: "Estrutura JSON inválida." };
    }
    const diagnosesCount = Array.isArray(data.diagnoses) ? data.diagnoses.length : 0;
    const billsCount = Array.isArray(data.bills) ? data.bills.length : 0;
    
    if (diagnosesCount === 0 && billsCount === 0 && !data.accessibility && !data.goal) {
      return { valid: false, diagnosesCount: 0, billsCount: 0, error: "O arquivo não contém registros do Turn OFF." };
    }

    return {
      valid: true,
      diagnosesCount,
      billsCount,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : undefined,
      hasGoal: !!data.goal,
      hasAccessibility: !!data.accessibility,
    };
  } catch (err: any) {
    return { valid: false, diagnosesCount: 0, billsCount: 0, error: err?.message || "Arquivo corrompido ou formato não-JSON." };
  }
}

export function exportAppData(): string {
  if (typeof window === "undefined") return "{}";
  const data = {
    diagnoses: loadDiagnoses(),
    bills: loadBillScans(),
    accessibility: loadAccessibility(),
    goal: loadMonthlyGoal(),
    exportedAt: new Date().toISOString(),
    version: "2.0",
    app: "Turn OFF - Eficiência Energética",
  };
  return JSON.stringify(data, null, 2);
}

export function importAppData(
  jsonString: string,
  options: { mode?: "replace" | "merge" } = { mode: "merge" }
): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== "object") return false;

    const mode = options.mode || "merge";

    if (Array.isArray(data.diagnoses)) {
      if (mode === "replace") {
        saveStoredJson(DIAGNOSES_KEY, data.diagnoses);
      } else {
        const current = loadDiagnoses();
        const map = new Map<string, SavedDiagnosis>();
        // Current entries first, then incoming
        current.forEach((d) => map.set(d.id, d));
        data.diagnoses.forEach((d: SavedDiagnosis) => {
          if (d && d.id) map.set(d.id, d);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStoredJson(DIAGNOSES_KEY, merged);
      }
    }

    if (Array.isArray(data.bills)) {
      if (mode === "replace") {
        saveStoredJson(BILLS_KEY, data.bills);
      } else {
        const current = loadBillScans();
        const map = new Map<string, BillScanRecord>();
        current.forEach((b) => map.set(b.id, b));
        data.bills.forEach((b: BillScanRecord) => {
          if (b && b.id) map.set(b.id, b);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStoredJson(BILLS_KEY, merged);
      }
    }

    if (data.accessibility && typeof data.accessibility === "object") {
      saveStoredJson(ACCESSIBILITY_KEY, data.accessibility);
    }

    if (data.goal && typeof data.goal === "object") {
      saveStoredJson(GOAL_KEY, data.goal);
    }

    triggerCloudSync();
    return true;
  } catch (e) {
    console.warn("[storage] Falha ao importar dados JSON:", e);
    return false;
  }
}

export function getStorageStats() {
  const diagnoses = loadDiagnoses();
  const bills = loadBillScans();
  let approximateBytes = 0;
  if (typeof window !== "undefined") {
    try {
      const keys = [DIAGNOSES_KEY, BILLS_KEY, PROGRESS_KEY, GOAL_KEY, ACCESSIBILITY_KEY];
      keys.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val) approximateBytes += val.length * 2;
      });
    } catch {
      // ignore
    }
  }
  return {
    diagnosesCount: diagnoses.length,
    billsCount: bills.length,
    storageKb: Math.round(approximateBytes / 1024),
  };
}

// Clear all app data
export function clearAllLocalData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DIAGNOSES_KEY);
  localStorage.removeItem(BILLS_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(GOAL_KEY);
  localStorage.removeItem(ACCESSIBILITY_KEY);
  localStorage.removeItem(THEME_KEY);
}

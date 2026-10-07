export type AppTab =
  | "home"
  | "scanner"
  | "diagnosis"
  | "simulator"
  | "payback"
  | "safety"
  | "learn"
  | "tarifa-social"
  | "history";

export type Confidence = "baixa" | "média" | "alta";
export type ApplianceMode = "continua" | "ciclica" | "pontual";
export type PowerSource = "placa" | "estimativa" | "nao-sei";
export type LightingType = "led" | "fluorescente" | "incandescente";
export type UsageUnit = "horas" | "minutos";

export type ApplianceKey =
  | "air-fryer"
  | "ar-condicionado"
  | "aspirador"
  | "batedeira"
  | "bomba"
  | "cafeteira"
  | "carro-eletrico"
  | "chapinha"
  | "chuveiro"
  | "computador"
  | "exaustor"
  | "ferro"
  | "forno-eletrico"
  | "freezer"
  | "gela-agua"
  | "geladeira"
  | "iluminacao"
  | "irrigacao"
  | "lava-loucas"
  | "lavadora"
  | "liquidificador"
  | "maquina-costura"
  | "microondas"
  | "notebook"
  | "panela-eletrica"
  | "piscina"
  | "receptor-tv"
  | "roteador"
  | "sanduicheira"
  | "secador"
  | "secadora-roupas"
  | "televisao"
  | "torneira"
  | "ventilador"
  | "ventilador-teto"
  | "videogame";

export interface LightingRoom {
  id: string;
  name: string;
  frequency: number; // days per month (0-30)
  hoursPerDay: number;
  usageUnit?: UsageUnit;
  lamps: Record<LightingType, number>;
}

export type ShowerTemperatureSetting = "inverno" | "verao" | "morno" | "frio";

export interface ShowerBatherProfile {
  id: string;
  name: string;
  minutesPerBath: number;
  bathsPerDay: number;
  seasonSetting: ShowerTemperatureSetting;
  frequency?: number;
}

export interface ShowerDetails {
  mode?: "general" | "detailed";
  defaultSetting: ShowerTemperatureSetting;
  averageMinutesPerBath?: number;
  bathsPerDayPerPerson?: number;
  bathers: ShowerBatherProfile[];
}

export interface ApplianceDefinition {
  key: ApplianceKey;
  label: string;
  category:
    | "climatizacao"
    | "cozinha"
    | "limpeza"
    | "eletronicos"
    | "aquecimento"
    | "motores_outros";
  defaultPower: number; // in Watts
  defaultUtilizationFactor: number; // duty cycle (0.05 to 1.0)
  mode: ApplianceMode;
  usageLabel: string;
  source: string;
  description: string;
}

export type EnergyEfficiencyClass =
  | "A+++"
  | "A++"
  | "A+"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F";

export interface ApplianceInput {
  id: string;
  key: ApplianceKey;
  label: string;
  present: boolean;
  quantity: number;
  quantityUsed: number;
  frequency: number; // days/month (0-30)
  hoursPerDay: number;
  usageUnit?: UsageUnit;
  powerWatts: number;
  powerWattsPerUnit?: number[];
  source: PowerSource;
  utilizationFactor: number;
  mode?: ApplianceMode;
  inverterTechnology?: boolean; // for air conditioners
  lightingType?: LightingType;
  lightingRooms?: LightingRoom[];
  showerDetails?: ShowerDetails;
  efficiencyClass?: EnergyEfficiencyClass; // Inmetro / Procel classification (A+++ to F)
}

export interface ApplianceEstimate extends ApplianceInput {
  monthlyKwh: number;
  relativeScore: number;
  estimatedPowerWatts: number;
  totalPowerWatts: number;
  mode: ApplianceMode;
  effectiveDutyCycle: number;
}

export type SafetyAnswer = "sim" | "nao" | "nao-sei";

export interface SafetyAnswers {
  grounding: SafetyAnswer;
  breakerCount: number | null;
  dr: SafetyAnswer;
  riskSigns: string[];
}

export interface DiagnosisInput {
  billValue: number;
  monthlyKwh: number;
  occupants: number;
  appliances: ApplianceInput[];
  detailed: boolean;
  hasSafetyRisk: boolean;
  safety?: SafetyAnswers;
}

export interface Recommendation {
  id: string;
  equipmentLabel: string;
  title: string;
  action: string;
  actionSimple: string;
  why: string;
  whySimple: string;
  effort: "baixo" | "médio" | "alto";
  cost: "gratuito" | "baixo" | "variável";
  comfort: "preserva" | "pode alterar";
  potentialKwh: [number, number];
  priority: number;
}

export interface BillCostData {
  consumo_kwh: number | null;
  tarifa_te: number | null;
  tarifa_tusd: number | null;
  valor_bandeira?: number | null;
  tarifa_social_identificada?: boolean;
  impostos: {
    icms: number | null;
    pis_cofins: number | null;
  };
}

export interface ExtractedBill {
  distribuidora: string | null;
  unidade_consumidora: string | null;
  mes_referencia: string | null;
  vencimento: string | null;
  consumo_kwh: number | null;
  consumo_medio_12m_kwh: number | null;
  variacao_consumo_percentual: number | null;
  bandeira: "verde" | "amarela" | "vermelha_1" | "vermelha_2" | null;
  valor_bandeira: number | null;
  tarifa_te: number | null;
  tarifa_tusd: number | null;
  impostos: {
    icms: number | null;
    pis_cofins: number | null;
  };
  cosip: number | null;
  valor_total: number | null;
  lembrete_vencimento?: boolean;
  geracao_distribuida: {
    energia_injetada_kwh: number | null;
    creditos_acumulados_kwh: number | null;
  } | null;
  tarifa_social_identificada: boolean;
  alertas: string[];
  campos_baixa_confianca: string[];
  sourceUrl?: string;
  quality: "boa" | "revisar";
  qualityMessage: string;
  historico_consumo?: { mes: string; kwh: number }[];
  classe_consumo?: string | null;
  tipo_ligacao?: "monofasico" | "bifasico" | "trifasico" | null;
}

export interface DiagnosisResult {
  effectiveCostPerKwh: number;
  totalEstimated: number;
  kwhPerPerson: number;
  costPerPerson: number;
  estimates: ApplianceEstimate[];
  topContributors: ApplianceEstimate[];
  confidence: Confidence;
  confidenceScore: number;
  coherence: "coerente" | "diferença relevante" | "sem referência";
  attention: ApplianceEstimate | null;
  savings: {
    conservative: [number, number];
    probable: [number, number];
    optimistic: [number, number];
  };
  recommendations: Recommendation[];
  safetyAlert: boolean;
  tarifaSocialApplied: boolean;
  tarifaSocialDiscountedKwh: number;
}

export interface SavedDiagnosis {
  id: string;
  createdAt: string;
  input: DiagnosisInput;
  result: DiagnosisResult;
  monthlyFollowUps?: { month: string; billValue: number; monthlyKwh: number }[];
  sourceBillScanId?: string;
  kind?: "principal" | "teste";
  originalDiagnosisId?: string;
  simulation?: {
    originalDiagnosisCreatedAt: string;
    description: string;
    equipmentLabel?: string;
    originalPowerWatts?: number;
    simulatedPowerWatts?: number;
  };
}

export interface BillScanRecord {
  id: string;
  createdAt: string;
  scannedAt?: string;
  bill: ExtractedBill;
  possivelTarifaSocial?: boolean;
  consumoAnomalo?: boolean;
  goalProgress?: {
    targetKwh: number;
    currentKwh: number;
    differenceKwh: number;
    reached: boolean;
  } | null;
  observedSavings?: {
    diagnosisId: string;
    completedActions: number;
    reductionKwh: number;
    expectedRange: [number, number];
    assessment: "dentro_da_faixa" | "abaixo_da_faixa" | "acima_da_faixa";
  } | null;
}

export interface MonthlyGoal {
  targetKwh: number;
  updatedAt: string;
}

export interface AccessibilitySettings {
  fontScale: number; // e.g. 0.85 (default 85%) to 1.50 (150%)
  simpleLanguage: boolean;
  textVolume?: "baixo" | "médio" | "alto";
  confirmImportantActions: boolean;
  theme?: "light" | "dark";
  textSize?: "normal" | "large" | "extra-large";
  highContrast?: boolean;
  reducedMotion?: boolean;
  dyslexicFont?: boolean;
  enhancedSpacing?: boolean;
  largeFocusRing?: boolean;
  aiAssistantEnabled?: boolean;
  speechGuide: {
    enabled: boolean;
    rate: number; // 0.5 to 1.8
    volume: number; // 0.0 to 1.0
    mode: "resumo" | "detalhado";
  };
}

export interface EquipmentPaybackInput {
  currentApplianceKey: string;
  currentApplianceLabel: string;
  currentPowerWatts: number;
  currentHoursPerDay: number;
  currentDaysPerMonth: number;
  newPriceBrl: number;
  newPowerWatts: number;
  newHoursPerDay: number;
  newDaysPerMonth: number;
  tariffKwhBrl: number;
}

export interface EquipmentPaybackResult {
  currentMonthlyKwh: number;
  currentMonthlyCost: number;
  newMonthlyKwh: number;
  newMonthlyCost: number;
  monthlyKwhSaved: number;
  monthlyBrlSaved: number;
  annualBrlSaved: number;
  paybackMonths: number;
  paybackYears: number;
  viable: boolean;
  timeline: Array<{
    month: number;
    cumulativeSavings: number;
    investmentCost: number;
    netBenefit: number;
  }>;
}

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  applianceKey: ApplianceKey;
  type: "tempo" | "potencia" | "tecnologia" | "vedacao" | "temperatura";
  applyChanges: (appliances: ApplianceInput[]) => ApplianceInput[];
}

import { ExtractedBill } from "../types";

export interface BillCoherenceResult {
  comparable: boolean;
  expectedTotal: number | null;
  differenceRatio: number | null;
  incoherent: boolean;
  explanation: string;
}

export interface BillDecomposition {
  effectiveRateKwh: number;
  rateClassification: "economica" | "normal" | "alta";
  generation: { value: number; percent: number };
  distribution: { value: number; percent: number };
  taxes: { value: number; percent: number };
  flag: { value: number; percent: number };
  cosip: { value: number; percent: number };
  isEstimated: boolean;
}

export interface ApplianceCostImpact {
  id: string;
  name: string;
  category: string;
  monthlyKwh: number;
  monthlyCost: number;
  usageDescription: string;
  tip: string;
}

/**
 * Official ANEEL flag surcharge per kWh (2024-2026 reference)
 */
export function getAneelFlagRatePerKwh(flag: ExtractedBill["bandeira"]): number {
  switch (flag) {
    case "amarela":
      return 0.01885; // R$ 1,885 por 100 kWh
    case "vermelha_1":
      return 0.04463; // R$ 4,463 por 100 kWh
    case "vermelha_2":
      return 0.07877; // R$ 7,877 por 100 kWh
    case "verde":
    default:
      return 0;
  }
}

/**
 * Calculates how much key appliances cost per month based on the exact rate of this bill
 */
export function getApplianceImpactWithRate(ratePerKwh: number): ApplianceCostImpact[] {
  const safeRate = ratePerKwh > 0 ? ratePerKwh : 0.85;

  return [
    {
      id: "chuveiro",
      name: "Chuveiro Elétrico (5.500W)",
      category: "aquecimento",
      monthlyKwh: 41.25, // 15 min/dia, 30 dias
      monthlyCost: Math.round(41.25 * safeRate * 100) / 100,
      usageDescription: "1 banho diário de 15 minutos na posição Inverno",
      tip: "Reduzir 5 minutos por banho economiza cerca de 33% dessa parcela no mês.",
    },
    {
      id: "geladeira",
      name: "Geladeira Frost-Free Duplex",
      category: "cozinha",
      monthlyKwh: 45.0,
      monthlyCost: Math.round(45.0 * safeRate * 100) / 100,
      usageDescription: "Ligada 24 horas/dia, termostato médio",
      tip: "Verifique a vedação da borracha da porta e evite encostar alimentos mornos.",
    },
    {
      id: "ar_condicionado",
      name: "Ar-Condicionado 9.000 BTU Inverter",
      category: "climatizacao",
      monthlyKwh: 86.4, // 8h/noite a 23°C
      monthlyCost: Math.round(86.4 * safeRate * 100) / 100,
      usageDescription: "8 horas por noite no verão com temperatura em 23°C",
      tip: "Ajustar de 20°C para 23°C economiza até 21% de energia do compressor.",
    },
    {
      id: "maquina_lavar",
      name: "Máquina de Lavar Roupas",
      category: "limpeza",
      monthlyKwh: 8.5, // 12 ciclos/mês com água fria
      monthlyCost: Math.round(8.5 * safeRate * 100) / 100,
      usageDescription: "3 lavagens por semana em capacidade máxima",
      tip: "Lave sempre com a carga cheia para aproveitar cada ciclo de água e motor.",
    },
    {
      id: "tv_sala",
      name: "Smart TV 55\" + Aparelho TV Box",
      category: "eletronicos",
      monthlyKwh: 18.0, // 5 horas/dia
      monthlyCost: Math.round(18.0 * safeRate * 100) / 100,
      usageDescription: "Uso diário de 5 horas + consumo passivo em Standby",
      tip: "Desligar na tomada ou em filtro de linha elimina o consumo vampiro em standby.",
    },
  ];
}

/**
 * Calculates transparent breakdown of energy bill (TE, TUSD, Taxes, Flag)
 */
export function getBillDecomposition(bill: ExtractedBill): BillDecomposition | null {
  if (!bill.consumo_kwh || !bill.valor_total || bill.consumo_kwh <= 0 || bill.valor_total <= 0) {
    return null;
  }

  const effectiveRateKwh = bill.valor_total / bill.consumo_kwh;
  let rateClassification: "economica" | "normal" | "alta" = "normal";
  if (effectiveRateKwh < 0.70) {
    rateClassification = "economica";
  } else if (effectiveRateKwh > 1.05) {
    rateClassification = "alta";
  }

  // Check if bill has discriminated components
  const hasTe = bill.tarifa_te !== null && bill.tarifa_te > 0;
  const hasTusd = bill.tarifa_tusd !== null && bill.tarifa_tusd > 0;
  const hasTaxes =
    (bill.impostos?.icms !== null && (bill.impostos?.icms ?? 0) > 0) ||
    (bill.impostos?.pis_cofins !== null && (bill.impostos?.pis_cofins ?? 0) > 0);

  if (hasTe && hasTusd) {
    const genVal = bill.tarifa_te! * bill.consumo_kwh;
    const distVal = bill.tarifa_tusd! * bill.consumo_kwh;
    const flagVal = bill.valor_bandeira ?? (getAneelFlagRatePerKwh(bill.bandeira) * bill.consumo_kwh);
    const cosipVal = bill.cosip ?? 0;
    const taxesVal = (bill.impostos?.icms ?? 0) + (bill.impostos?.pis_cofins ?? 0);

    const total = bill.valor_total;
    return {
      effectiveRateKwh: Math.round(effectiveRateKwh * 100) / 100,
      rateClassification,
      generation: { value: Math.round(genVal * 100) / 100, percent: Math.round((genVal / total) * 100) },
      distribution: { value: Math.round(distVal * 100) / 100, percent: Math.round((distVal / total) * 100) },
      taxes: { value: Math.round(taxesVal * 100) / 100, percent: Math.round((taxesVal / total) * 100) },
      flag: { value: Math.round(flagVal * 100) / 100, percent: Math.round((flagVal / total) * 100) },
      cosip: { value: Math.round(cosipVal * 100) / 100, percent: Math.round((cosipVal / total) * 100) },
      isEstimated: false,
    };
  }

  // Regulatory average estimation for Brazilian residential sector (Aneel/Abraceel):
  // ~36% Geração (TE), ~38% Distribuição (TUSD), ~22% Tributos (ICMS + PIS/COFINS), ~4% Ilum/Bandeira
  const total = bill.valor_total;
  const cosipVal = bill.cosip ?? Math.round(total * 0.04 * 100) / 100;
  const flagVal = bill.valor_bandeira ?? (getAneelFlagRatePerKwh(bill.bandeira) * bill.consumo_kwh);
  const remaining = Math.max(0, total - cosipVal - flagVal);

  const genVal = Math.round(remaining * 0.44 * 100) / 100;
  const distVal = Math.round(remaining * 0.38 * 100) / 100;
  const taxesVal = Math.max(0, Math.round((remaining - genVal - distVal) * 100) / 100);

  return {
    effectiveRateKwh: Math.round(effectiveRateKwh * 100) / 100,
    rateClassification,
    generation: { value: genVal, percent: Math.round((genVal / total) * 100) },
    distribution: { value: distVal, percent: Math.round((distVal / total) * 100) },
    taxes: { value: taxesVal, percent: Math.round((taxesVal / total) * 100) },
    flag: { value: Math.round(flagVal * 100) / 100, percent: Math.round((flagVal / total) * 100) },
    cosip: { value: Math.round(cosipVal * 100) / 100, percent: Math.round((cosipVal / total) * 100) },
    isEstimated: true,
  };
}

/**
 * Calculates Tarifa Social potential savings according to federal law
 */
export function getTarifaSocialPotentialSavings(consumoKwh: number, valorTotal: number) {
  if (consumoKwh <= 0 || valorTotal <= 0) return null;

  // TSEE discounts (Faixas):
  // 0 a 30 kWh: 65% desconto
  // 31 a 100 kWh: 40% desconto
  // 101 a 220 kWh: 10% desconto
  // acima de 220 kWh: sem desconto
  const kwh = consumoKwh;
  let discountedKwhEquiv = 0;

  if (kwh <= 30) {
    discountedKwhEquiv = kwh * 0.65;
  } else if (kwh <= 100) {
    discountedKwhEquiv = (30 * 0.65) + ((kwh - 30) * 0.40);
  } else if (kwh <= 220) {
    discountedKwhEquiv = (30 * 0.65) + (70 * 0.40) + ((kwh - 100) * 0.10);
  } else {
    discountedKwhEquiv = (30 * 0.65) + (70 * 0.40) + (120 * 0.10);
  }

  const discountRatio = discountedKwhEquiv / kwh;
  const estimatedSavingsMonth = Math.round(valorTotal * discountRatio * 100) / 100;
  const estimatedNewTotal = Math.max(8, Math.round((valorTotal - estimatedSavingsMonth) * 100) / 100);
  const estimatedSavingsYear = Math.round(estimatedSavingsMonth * 12);

  return {
    eligibleConsumption: kwh <= 220,
    estimatedSavingsMonth,
    estimatedSavingsYear,
    estimatedNewTotal,
    discountPercentage: Math.round(discountRatio * 100),
  };
}

export function parseNumberBR(value: string | undefined | null): number | null {
  if (!value) return null;
  const compact = value.replace(/[^\d,.-]/g, "").trim();
  if (!compact || !/[\d]/.test(compact) || compact.startsWith("-")) return null;

  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;

  if (comma >= 0 && dot >= 0) {
    normalized =
      comma > dot
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = compact.length - comma - 1;
    normalized =
      decimals > 0 && decimals <= 3
        ? compact.replace(",", ".")
        : compact.replace(/,/g, "");
  } else if (dot >= 0) {
    const decimals = compact.length - dot - 1;
    normalized =
      decimals > 0 && decimals <= 3 ? compact : compact.replace(/\./g, "");
  }

  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeOcrText(text: string): string {
  return text
    .replace(/[|]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ");
}

export function calculateBillCoherence(
  bill: Pick<
    ExtractedBill,
    | "consumo_kwh"
    | "tarifa_te"
    | "tarifa_tusd"
    | "impostos"
    | "cosip"
    | "valor_bandeira"
    | "valor_total"
  >,
): BillCoherenceResult {
  if (
    bill.consumo_kwh === null ||
    bill.tarifa_te === null ||
    bill.tarifa_tusd === null ||
    bill.valor_total === null
  ) {
    return {
      comparable: false,
      expectedTotal: null,
      differenceRatio: null,
      incoherent: false,
      explanation:
        "Não foi possível verificar a coerência pois faltam valores de tarifa TE, TUSD ou valor total.",
    };
  }

  const energyCost = bill.consumo_kwh * (bill.tarifa_te + bill.tarifa_tusd);
  const taxes = (bill.impostos?.icms ?? 0) + (bill.impostos?.pis_cofins ?? 0);
  const other = (bill.cosip ?? 0) + (bill.valor_bandeira ?? 0);
  const expectedTotal = energyCost + taxes + other;

  const diff = Math.abs(expectedTotal - bill.valor_total);
  const differenceRatio = bill.valor_total > 0 ? diff / bill.valor_total : 0;
  const incoherent = differenceRatio > 0.35;

  let explanation = "Os componentes faturados conferem com o valor total.";
  if (incoherent) {
    explanation = `A soma estimada das parcelas (R$ ${expectedTotal.toFixed(2)}) difere em mais de 35% do valor total lido (R$ ${bill.valor_total.toFixed(2)}). Verifique se há descontos de Tarifa Social, parcelamento, juros ou créditos não identificados.`;
  }

  return {
    comparable: true,
    expectedTotal: Math.round(expectedTotal * 100) / 100,
    differenceRatio: Math.round(differenceRatio * 100) / 100,
    incoherent,
    explanation,
  };
}

/**
 * Deterministic Brazilian Electricity Bill Regex Parser
 * Built conservatively with anti-collision checks:
 * - Voltage (127V/220V) will NEVER match as total amount or consumption
 * - Meter readings (Leitura Anterior / Leitura Atual) will NEVER match as billed kWh
 * - 12m Average will NEVER match as current monthly consumption
 */
export function parseBillText(
  rawText: string,
  sourceUrl = "local://leitor",
): ExtractedBill {
  const normalized = normalizeOcrText(rawText);
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let distribuidora: string | null = null;
  let unidade_consumidora: string | null = null;
  let mes_referencia: string | null = null;
  let vencimento: string | null = null;
  let consumo_kwh: number | null = null;
  let consumo_medio_12m_kwh: number | null = null;
  let valor_total: number | null = null;
  let bandeira: ExtractedBill["bandeira"] = null;
  let valor_bandeira: number | null = null;
  let tarifa_te: number | null = null;
  let tarifa_tusd: number | null = null;
  let icms: number | null = null;
  let pis_cofins: number | null = null;
  let cosip: number | null = null;
  let tarifa_social_identificada = false;
  let energia_injetada_kwh: number | null = null;
  let creditos_acumulados_kwh: number | null = null;

  const alertas: string[] = [];
  const campos_baixa_confianca: string[] = [];

  // Check distributor name
  const distributorMatches = [
    "enel",
    "neoenergia",
    "cpfl",
    "cemig",
    "copel",
    "equatorial",
    "celesc",
    "energisa",
    "light",
    "edp",
    "rge",
    "elektro",
    "amazonas energia",
  ];
  for (const line of lines) {
    const l = line.toLowerCase();
    for (const dist of distributorMatches) {
      if (l.includes(dist)) {
        distribuidora = dist.toUpperCase();
        break;
      }
    }
    if (distribuidora) break;
  }

  // Detect Tarifa Social mentions
  if (
    /tarifa\s*social|baixa\s*renda|subsidio\s*social|\btsee\b/i.test(normalized)
  ) {
    tarifa_social_identificada = true;
    alertas.push(
      "Tarifa Social / Baixa Renda identificada nos termos da fatura.",
    );
  }

  // Detect Flag
  if (/bandeira\s*vermelha.*2|vermelha\s*pamarama\s*2/i.test(normalized)) {
    bandeira = "vermelha_2";
  } else if (/bandeira\s*vermelha/i.test(normalized)) {
    bandeira = "vermelha_1";
  } else if (/bandeira\s*amarela/i.test(normalized)) {
    bandeira = "amarela";
  } else if (/bandeira\s*verde/i.test(normalized)) {
    bandeira = "verde";
  }

  // Detect Due Date
  const dueDateMatch = normalized.match(
    /(?:vencimento|data\s+de\s+vencimento|pagar\s+at[eé])\s*[:\-]?\s*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i,
  );
  if (dueDateMatch) {
    vencimento = dueDateMatch[1].replace(/[.-]/g, "/");
  }

  // Detect Reference Month
  const refMatch = normalized.match(
    /(?:m[eê]s(?:\s+de)?\s+refer[eê]ncia|m[eê]s\/ano|refer[eê]ncia|ref)\s*[:\-]?\s*([A-Za-z]{3,}\/\d{4}|\d{2}\/\d{4})/i,
  );
  if (refMatch) {
    mes_referencia = refMatch[1];
  }

  // Detect Unidade Consumidora / Código do Cliente (strictly numerical or alphanumeric code)
  const ucMatch = normalized.match(
    /(?:unidade\s+consumidora|unidade\s+de\s+consumo|\buc\b|c[oó]digo\s+(?:do\s+)?cliente|conta\s+contrato)\s*[:\-]?\s*([0-9]{4,15}|[0-9\/-]{5,20})/i,
  );
  if (ucMatch && !/consumidora|vencimento|total/i.test(ucMatch[1])) {
    unidade_consumidora = ucMatch[1].trim();
  }

  // Detect 12m Average
  const avgMatch = normalized.match(
    /(?:m[eé]dia(?:\s+dos\s+[uú]ltimos\s+12\s+meses)?|consumo\s+m[eé]dio)\s*[:\-]?\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:kwh)?/i,
  );
  if (avgMatch) {
    consumo_medio_12m_kwh = parseNumberBR(avgMatch[1]);
  }

  // Detect Billed Consumption (Strict: ignore Leitura Anterior/Atual, ignore 127V/220V)
  const consumptionRegexes = [
    /(?:consumo\s+faturado|consumo\s+total\s+faturado|energia\s+el[eé]trica\s+ativa|consumo\s+do\s+m[eê]s)\s*[:\-]?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*kwh/i,
    /(?:consumo\s+faturado|consumo\s+total\s+faturado)\s*[:\-]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /(\d{1,6}(?:[.,]\d{1,2})?)\s*kwh\b(?!\s*injetad|\s*compensad)/i,
  ];

  for (const regex of consumptionRegexes) {
    const match = normalized.match(regex);
    if (match) {
      const parsed = parseNumberBR(match[1]);
      if (parsed !== null && parsed > 0 && parsed <= 50000) {
        consumo_kwh = parsed;
        break;
      }
    }
  }

  // Detect Total Value (Explicit Anti-Collision: never accept 127 or 220 if labeled as Tensão/Volts)
  // Clean out lines that mention "tensão nominal" or "limites de tensão"
  const linesWithoutVoltage = lines.filter(
    (l) =>
      !/tens[aã]o\s+nominal|limites\s+adequados|volts|127\s*v|220\s*v/i.test(l),
  );
  const filteredText = linesWithoutVoltage.join("\n");

  const totalRegexes = [
    /(?:total\s+a\s+pagar|valor\s+total(?:\s+da\s+fatura)?|valor\s+a\s+pagar|total\s+fatura|valor\s+at[eé]\s+o\s+vencimento)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,6}(?:[.,]\d{2}))/i,
    /(?:r\$\s*)(\d{1,6}(?:[.,]\d{2}))\s*(?:total|vencimento)/i,
  ];

  for (const regex of totalRegexes) {
    const match = filteredText.match(regex);
    if (match) {
      const parsed = parseNumberBR(match[1]);
      if (parsed !== null && parsed > 0 && parsed <= 500000) {
        valor_total = parsed;
        break;
      }
    }
  }

  // Tariff TE and TUSD
  const teMatch = normalized.match(
    /(?:tarifa\s+(?:de\s+)?energia|\bte\b)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,2}(?:[.,]\d{2,6}))/i,
  );
  if (teMatch) {
    tarifa_te = parseNumberBR(teMatch[1]);
  }

  const tusdMatch = normalized.match(
    /(?:tarifa\s+de\s+uso|\btusd\b)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,2}(?:[.,]\d{2,6}))/i,
  );
  if (tusdMatch) {
    tarifa_tusd = parseNumberBR(tusdMatch[1]);
  }

  // ICMS and PIS/COFINS
  const icmsMatch = normalized.match(
    /(?:valor\s+do\s+)?icms\s*[:\-]?\s*(?:r\$\s*)?(\d{1,5}(?:[.,]\d{2}))/i,
  );
  if (icmsMatch) {
    icms = parseNumberBR(icmsMatch[1]);
  }

  const pisCofinsMatch = normalized.match(
    /(?:pis\s*\/?\s*cofins|pis[\s\S]{0,10}cofins)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,5}(?:[.,]\d{2}))/i,
  );
  if (pisCofinsMatch) {
    pis_cofins = parseNumberBR(pisCofinsMatch[1]);
  }

  // COSIP / CIP (Iluminação pública)
  const cosipMatch = normalized.match(
    /(?:cosip|contribui[cç][aã]o\s+ilum|\bcip\b|ilumina[cç][aã]o\s+p[uú]blica)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,4}(?:[.,]\d{2}))/i,
  );
  if (cosipMatch) {
    cosip = parseNumberBR(cosipMatch[1]);
  }

  // Bandeira tarifária em R$
  const flagValMatch = normalized.match(
    /(?:adicional\s+bandeira|bandeira\s+vermelha|bandeira\s+amarela)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,4}(?:[.,]\d{2}))/i,
  );
  if (flagValMatch) {
    valor_bandeira = parseNumberBR(flagValMatch[1]);
  }

  // Geração Distribuída / Solar
  const injMatch = normalized.match(
    /(?:energia\s+injetada|gera[cç][aã]o\s+injetada)\s*[:\-]?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*kwh/i,
  );
  if (injMatch) {
    energia_injetada_kwh = parseNumberBR(injMatch[1]);
  }

  const credMatch = normalized.match(
    /(?:saldo\s+acumulado|cr[eé]ditos\s+acumulados)\s*[:\-]?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*kwh/i,
  );
  if (credMatch) {
    creditos_acumulados_kwh = parseNumberBR(credMatch[1]);
  }

  // Detect Connection Type & Consumer Class
  let classe_consumo: string | null = null;
  if (/residencial|b1\s*-\s*residencial|classe\s*residencial/i.test(normalized)) {
    classe_consumo = "Residencial";
  } else if (/comercial|b3\s*-\s*comercial/i.test(normalized)) {
    classe_consumo = "Comercial";
  } else if (/rural|b2\s*-\s*rural/i.test(normalized)) {
    classe_consumo = "Rural";
  }

  let tipo_ligacao: "monofasico" | "bifasico" | "trifasico" | null = null;
  if (/monof[aá]sic[ao]|\bmono\b|1\s*fase/i.test(normalized)) {
    tipo_ligacao = "monofasico";
  } else if (/bif[aá]sic[ao]|\bbifa\b|2\s*fases/i.test(normalized)) {
    tipo_ligacao = "bifasico";
  } else if (/trif[aá]sic[ao]|\btrifa\b|3\s*fases/i.test(normalized)) {
    tipo_ligacao = "trifasico";
  }

  // If flag was detected without explicit R$ surcharge, compute ANEEL official rate
  if (bandeira && valor_bandeira === null && consumo_kwh !== null) {
    const rate = getAneelFlagRatePerKwh(bandeira);
    if (rate > 0) {
      valor_bandeira = Math.round(rate * consumo_kwh * 100) / 100;
    }
  }

  // Field confidence check
  if (consumo_kwh === null)
    campos_baixa_confianca.push("Consumo faturado (kWh)");
  if (valor_total === null) campos_baixa_confianca.push("Valor total (R$)");
  if (vencimento === null) campos_baixa_confianca.push("Data de vencimento");
  if (mes_referencia === null) campos_baixa_confianca.push("Mês de referência");

  // Run coherence check if total and consumption were extracted
  const coherenceCheck = calculateBillCoherence({
    consumo_kwh,
    tarifa_te,
    tarifa_tusd,
    impostos: { icms, pis_cofins },
    cosip,
    valor_bandeira,
    valor_total,
  });

  if (coherenceCheck.incoherent) {
    alertas.push(coherenceCheck.explanation);
    campos_baixa_confianca.push("Coerência dos valores somados");
  }

  const quality: ExtractedBill["quality"] =
    campos_baixa_confianca.length === 0 ? "boa" : "revisar";
  const qualityMessage =
    quality === "boa"
      ? "Todos os campos essenciais foram identificados com alta confiança. Revise antes de confirmar."
      : `Alguns campos (${campos_baixa_confianca.join(", ")}) não foram reconhecidos com certeza absoluta. por favor confira os campos abaixo.`;

  return {
    distribuidora,
    unidade_consumidora,
    mes_referencia,
    vencimento,
    consumo_kwh,
    consumo_medio_12m_kwh,
    variacao_consumo_percentual: null,
    bandeira,
    valor_bandeira,
    tarifa_te,
    tarifa_tusd,
    impostos: { icms, pis_cofins },
    cosip,
    valor_total,
    geracao_distribuida:
      energia_injetada_kwh !== null || creditos_acumulados_kwh !== null
        ? { energia_injetada_kwh, creditos_acumulados_kwh }
        : null,
    tarifa_social_identificada,
    alertas,
    campos_baixa_confianca,
    sourceUrl,
    quality,
    qualityMessage,
    classe_consumo,
    tipo_ligacao,
  };
}

/** Sample demonstration bills for testing and education */
export const SAMPLE_BILLS: {
  label: string;
  description: string;
  raw: string;
}[] = [
  {
    label: "Conta Residencial Padrão (Enel / SP)",
    description:
      "Fatura de 210 kWh, R$ 198,50 com bandeira amarela e impostos discriminados.",
    raw: `ENEL DISTRIBUIÇÃO SÃO PAULO
COMPROVANTE DE FORNECIMENTO DE ENERGIA ELÉTRICA
MÊS DE REFERÊNCIA: 08/2026
VENCIMENTO: 22/08/2026
UNIDADE CONSUMIDORA: 73491028
Nº DO CLIENTE: 90218491

DADOS DA MEDIÇÃO:
Leitura anterior: 1420
Leitura atual: 1630
CONSUMO TOTAL FATURADO: 210 kWh
Média dos últimos 12 meses: 195 kWh

COMPOSIÇÃO DO FORNECIMENTO:
TE: 0,44210
TUSD: 0,38150
Valor Bandeira Amarela: R$ 4,20
ICMS: R$ 32,15
PIS/COFINS: R$ 5,80
COSIP Iluminação Pública: R$ 11,50

TOTAL A PAGAR: R$ 198,50`,
  },
  {
    label: "Conta com Tarifa Social (Baixa Renda)",
    description:
      "Fatura de 78 kWh com benefício de Tarifa Social e desconto de 100% no consumo.",
    raw: `EQUATORIAL ENERGIA
FATURA DE ENERGIA ELÉTRICA - BAIXA RENDA
TARIFA SOCIAL DE ENERGIA ELÉTRICA (TSEE) APLICADA
REF: 07/2026
VENCIMENTO: 15/07/2026
UNIDADE CONSUMIDORA: 10482910

CONSUMO FATURADO: 78 kWh
MÉDIA 12 MESES: 82 kWh
BANDEIRA VERDE

DESCRIÇÃO DOS VALORES:
Consumo TSEE até 80 kWh: R$ 0,00 (Gratuidade Integral Lei TSEE)
TE: 0,41000
TUSD: 0,36000
COSIP (Iluminação Pública): R$ 8,20
TRIBUTOS ESTADUAIS (ICMS): R$ 0,00

TOTAL A PAGAR: R$ 8,20`,
  },
  {
    label: "Conta com Layout de Colunas e Tensão 220V (Celesc / SC)",
    description:
      "Layout de teste de colunas: 117 kWh, R$ 92,86, sem confundir tensão 220V com valor total.",
    raw: `Celesc Distribuição S.A
REF: 11/2017
N° DA UNIDADE CONSUMIDORA: 21192074
VENCIMENTO: 20/11/2017

CONSUMO TOTAL FATURADO: 117 kWh
Tensão nominal ou contratada (V): 220
Limites adequados de tensão (V): 202 a 231

VALOR ATÉ O VENCIMENTO: R$ 92,86
Bandeira tarifária: Verde
TE: 0,3910
TUSD: 0,3240
ICMS: R$ 14,20
PIS/COFINS: R$ 2,80`,
  },
  {
    label: "Conta com Energia Solar (Geração Distribuída)",
    description:
      "Fatura com microgeração solar, energia injetada e créditos acumulados.",
    raw: `NEOENERGIA ELEKTRO
FATURA COM MICROGERAÇÃO DISTRIBUÍDA (SISTEMA SOLAR FV)
MÊS DE REFERÊNCIA: 06/2026
VENCIMENTO: 10/06/2026
UNIDADE CONSUMIDORA: 48920193

CONSUMO ATIVO DA REDE: 320 kWh
ENERGIA INJETADA NA REDE: 280 kWh
CRÉDITOS ACUMULADOS NO MÊS: 40 kWh
Saldo Total de Créditos Restantes: 180 kWh
Consumo Líquido Faturado: 40 kWh + Custo de Disponibilidade (50 kWh)
TOTAL FATURADO: 50 kWh

Bandeira Verde
TE: 0,4250
TUSD: 0,4120
COSIP: R$ 14,00
TOTAL A PAGAR: R$ 56,20`,
  },
];

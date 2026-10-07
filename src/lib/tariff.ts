import { BillScanRecord, SavedDiagnosis } from "../types";

export interface DetectedTariffInfo {
  rate: number;
  source: string;
  type: "fatura" | "diagnostico" | "padrao";
  details?: string;
}

/**
 * Detecta a tarifa efetiva (R$/kWh) mais recente a partir do histórico de faturas escaneadas
 * e diagnósticos residenciais realizados pelo usuário.
 */
export function detectTariffFromHistory(
  bills: BillScanRecord[] = [],
  diagnoses: SavedDiagnosis[] = [],
): DetectedTariffInfo {
  // 1. Filtrar faturas válidas com consumo e valor
  const validBills = (bills || []).filter(
    (b) =>
      b.bill &&
      (b.bill.consumo_kwh ?? 0) > 0 &&
      ((b.bill.valor_total ?? 0) > 0 ||
        ((b.bill.tarifa_te ?? 0) + (b.bill.tarifa_tusd ?? 0) > 0)),
  );

  const latestBill =
    validBills.length > 0
      ? [...validBills].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.scannedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.scannedAt || 0).getTime();
          return timeB - timeA;
        })[0]
      : null;

  // 2. Filtrar diagnósticos válidos com custo por kWh
  const validDiagnoses = (diagnoses || []).filter((d) => {
    const eff = d.result?.effectiveCostPerKwh ?? 0;
    const calc =
      (d.input?.billValue ?? 0) > 0 && (d.input?.monthlyKwh ?? 0) > 0
        ? d.input.billValue / d.input.monthlyKwh
        : 0;
    return eff > 0 || calc > 0;
  });

  const latestDiag =
    validDiagnoses.length > 0
      ? [...validDiagnoses].sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        })[0]
      : null;

  // Calcular tarifa da fatura se existir
  let billTariff: number | null = null;
  if (latestBill) {
    const total = latestBill.bill.valor_total ?? 0;
    const kwh = latestBill.bill.consumo_kwh ?? 1;
    if (total > 0 && kwh > 0) {
      billTariff = Number((total / kwh).toFixed(3));
    } else {
      const baseTariff =
        (latestBill.bill.tarifa_te ?? 0) + (latestBill.bill.tarifa_tusd ?? 0);
      if (baseTariff > 0) {
        billTariff = Number(baseTariff.toFixed(3));
      }
    }
  }

  // Calcular tarifa do diagnóstico se existir
  let diagTariff: number | null = null;
  if (latestDiag) {
    const eff = latestDiag.result?.effectiveCostPerKwh;
    if (eff && eff > 0) {
      diagTariff = Number(eff.toFixed(3));
    } else if (
      (latestDiag.input?.billValue ?? 0) > 0 &&
      (latestDiag.input?.monthlyKwh ?? 0) > 0
    ) {
      diagTariff = Number(
        (latestDiag.input.billValue / latestDiag.input.monthlyKwh).toFixed(3),
      );
    }
  }

  // Se ambos existirem, prioriza o mais recente no tempo
  if (latestBill && latestDiag && billTariff && diagTariff) {
    const billTime = new Date(
      latestBill.createdAt || latestBill.scannedAt || 0,
    ).getTime();
    const diagTime = new Date(latestDiag.createdAt || 0).getTime();

    if (billTime >= diagTime) {
      const dist = latestBill.bill.distribuidora || "sua concessionária";
      const ref = latestBill.bill.mes_referencia ? ` (${latestBill.bill.mes_referencia})` : "";
      return {
        rate: billTariff,
        source: `última fatura lida - ${dist}${ref}`,
        type: "fatura",
        details: `${latestBill.bill.consumo_kwh} kWh faturados`,
      };
    } else {
      return {
        rate: diagTariff,
        source: "último diagnóstico residencial",
        type: "diagnostico",
        details: `baseado no consumo informado de ${latestDiag.input.monthlyKwh} kWh`,
      };
    }
  }

  if (latestBill && billTariff) {
    const dist = latestBill.bill.distribuidora || "sua concessionária";
    const ref = latestBill.bill.mes_referencia ? ` (${latestBill.bill.mes_referencia})` : "";
    return {
      rate: billTariff,
      source: `última fatura lida - ${dist}${ref}`,
      type: "fatura",
      details: `${latestBill.bill.consumo_kwh} kWh faturados`,
    };
  }

  if (latestDiag && diagTariff) {
    return {
      rate: diagTariff,
      source: "último diagnóstico residencial",
      type: "diagnostico",
      details: `baseado no consumo informado de ${latestDiag.input.monthlyKwh} kWh`,
    };
  }

  // Padrão nacional médio ANEEL
  return {
    rate: 0.94,
    source: "média nacional ANEEL",
    type: "padrao",
    details: "tarifa residencial média com tributos",
  };
}

/**
 * Função mantida para compatibilidade retroativa
 */
export function calculateAverageTariff(bills: BillScanRecord[]): number {
  const detected = detectTariffFromHistory(bills, []);
  return detected.rate;
}

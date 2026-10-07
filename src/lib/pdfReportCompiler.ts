/**
 * Compilador de Relatórios Oficiais do Turn OFF em PDF
 * Gera documentos no padrão A4 com paleta de cores temática correspondente a cada módulo:
 * - Diagnóstico: Verde Esmeralda / Teal (#087F5B / #0D9488)
 * - Leitor de Contas: Laranja / Âmbar (#EA580C / #D97706)
 * - Payback: Índigo / Violeta (#4F46E5 / #6366F1)
 * - Simulação: Azul Elétrico (#2563EB)
 * - Aplicativo Geral: Ardósia & Esmeralda (#0F172A / #0D9488)
 */

import { SavedDiagnosis, ExtractedBill, BillScanRecord } from "../types";
import { formatBRL, formatNumber } from "./energy";
import { jsPDF } from "jspdf";

export type ReportPayload =
  | { type: "app"; diagnoses?: SavedDiagnosis[]; bills?: BillScanRecord[] }
  | { type: "diagnosis"; diagnosis: SavedDiagnosis }
  | {
      type: "simulation";
      baseline?: SavedDiagnosis | null;
      scenario: {
        label?: string;
        monthlyKwh: number;
        savingsKwh: number;
        monthlyCost?: number;
        savingsBrl: number;
        changesSummary?: string[];
        baseMonthlyBrl?: number;
        baseMonthlyKwh?: number;
        actionsCount?: number;
        summaryTitle?: string;
      };
    }
  | {
      type: "payback";
      equipmentName: string;
      investmentCost: number;
      monthlySavings: number;
      annualSavings?: number;
      paybackMonths: number;
      return5Years?: number;
      viable?: boolean;
      timeline?: Array<{
        month: number;
        cumulativeSavings: number;
        investmentCost: number;
        netSavings: number;
      }>;
    }
  | { type: "bill"; bill: ExtractedBill };

export interface CompiledReportResult {
  html: string;
  filename: string;
  themeColor: string;
  title: string;
}

export function compileReport(payload: ReportPayload): CompiledReportResult {
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const currentHour = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  switch (payload.type) {
    case "diagnosis":
      return compileDiagnosisReport(payload.diagnosis, currentDate, currentHour);
    case "bill":
      return compileBillReport(payload.bill, currentDate, currentHour);
    case "payback":
      return compilePaybackReport(payload, currentDate, currentHour);
    case "simulation":
      return compileSimulationReport(payload, currentDate, currentHour);
    case "app":
    default:
      return compileAppSummaryReport(
        payload.diagnoses || [],
        payload.bills || [],
        currentDate,
        currentHour
      );
  }
}

// -------------------------------------------------------------
// FUNÇÕES DE GERAÇÃO DE GRÁFICOS SVG VETORIAIS DE ALTA RESOLUÇÃO
// Renderizados com fidelidade no PDF via html2pdf e motores de impressão
// -------------------------------------------------------------

/**
 * Gráfico SVG de Barras Verticais do Ranking de Aparelhos (Diagnóstico)
 */
function renderDiagnosisVerticalBarsSvg(
  topAppliances: Array<{ label: string; monthlyKwh: number; powerWatts: number; hoursPerDay: number }>,
  totalEstimated: number
): string {
  if (!topAppliances || topAppliances.length === 0) return "";

  const width = 740;
  const height = 215;
  const padLeft = 60;
  const padRight = 25;
  const padTop = 32;
  const padBottom = 42;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxKwh = Math.max(...topAppliances.map((a) => a.monthlyKwh), 10) * 1.25;

  // Grade horizontal Y
  const yTicks = [0, 0.33, 0.66, 1].map((p) => ({
    val: Math.round(maxKwh * p),
    y: padTop + plotHeight - p * plotHeight,
  }));

  const gridLines = yTicks
    .map(
      (t) => `
      <line x1="${padLeft}" y1="${t.y}" x2="${padLeft + plotWidth}" y2="${t.y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3 3" />
      <text x="${padLeft - 8}" y="${t.y + 4}" font-size="10" fill="#64748B" font-family="sans-serif" text-anchor="end">${t.val} kWh</text>
    `
    )
    .join("");

  const barCount = topAppliances.length;
  const slotWidth = plotWidth / barCount;
  const barWidth = Math.min(54, slotWidth * 0.52);

  const bars = topAppliances
    .map((app, idx) => {
      const slotCenter = padLeft + idx * slotWidth + slotWidth / 2;
      const barX = slotCenter - barWidth / 2;
      const barHeight = Math.max(4, (app.monthlyKwh / maxKwh) * plotHeight);
      const barY = padTop + plotHeight - barHeight;
      const pct = Math.round((app.monthlyKwh / Math.max(1, totalEstimated)) * 100);

      // Nome abreviado se necessário
      const shortName = app.label.length > 13 ? app.label.slice(0, 11) + "…" : app.label;

      return `
        <!-- Coluna com topo arredondado -->
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="6" ry="6" fill="#0D9488" />
        
        <!-- Rótulo Percentual e kWh no Topo -->
        <text x="${slotCenter}" y="${barY - 14}" font-size="11.5" font-weight="800" fill="#087F5B" font-family="sans-serif" text-anchor="middle">${pct}%</text>
        <text x="${slotCenter}" y="${barY - 3}" font-size="9.5" font-weight="600" fill="#64748B" font-family="sans-serif" text-anchor="middle">${formatNumber(app.monthlyKwh)} kWh</text>
        
        <!-- Rótulo do Aparelho na Base -->
        <text x="${slotCenter}" y="${padTop + plotHeight + 18}" font-size="10.5" font-weight="700" fill="#1E293B" font-family="sans-serif" text-anchor="middle">${shortName}</text>
      `;
    })
    .join("");

  return `
    <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #0D9488;"></span>
          <strong style="font-size: 13px; color: #0F172A; text-transform: uppercase;">Gráfico de Consumo por Aparelho (Colunas Verticais)</strong>
        </div>
        <div style="background: #E6FCF5; color: #087F5B; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
          ${barCount} maiores cargas residenciais
        </div>
      </div>

      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- Linha Eixo X -->
        <line x1="${padLeft}" y1="${padTop + plotHeight}" x2="${padLeft + plotWidth}" y2="${padTop + plotHeight}" stroke="#94A3B8" stroke-width="1.5" />
        
        <!-- Grades horizontais -->
        ${gridLines}

        <!-- Barras verticais e legendas -->
        ${bars}
      </svg>
    </div>
  `;
}

/**
 * Gráfico SVG da Curva de Payback e Ponto de Equilíbrio (Break-Even)
 */
function renderPaybackChartSvg(params: {
  investmentCost: number;
  monthlySavings: number;
  paybackMonths: number;
  timeline?: Array<{
    month: number;
    cumulativeSavings: number;
    investmentCost: number;
    netSavings: number;
  }>;
}): string {
  const { investmentCost, monthlySavings, paybackMonths } = params;

  // Projeção temporal: mínimo de 24 meses, ou 1.5x o payback, até 60 meses
  const maxMonths = Math.max(24, Math.min(60, Math.ceil(Math.max(paybackMonths * 1.4, 36) / 6) * 6));

  const dataPoints: Array<{ month: number; cumulativeSavings: number; investmentCost: number }> = [];
  for (let m = 0; m <= maxMonths; m++) {
    dataPoints.push({
      month: m,
      cumulativeSavings: m * monthlySavings,
      investmentCost,
    });
  }

  const maxVal = Math.max(investmentCost * 1.35, monthlySavings * maxMonths * 1.1, 100);

  const width = 740;
  const height = 270;
  const padLeft = 75;
  const padRight = 35;
  const padTop = 38;
  const padBottom = 45;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const getX = (m: number) => padLeft + (m / maxMonths) * plotWidth;
  const getY = (val: number) => padTop + plotHeight - (val / maxVal) * plotHeight;

  // Grade Y
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: maxVal * pct,
    y: getY(maxVal * pct),
  }));

  const gridLines = yTicks
    .map(
      (t) => `
      <line x1="${padLeft}" y1="${t.y}" x2="${padLeft + plotWidth}" y2="${t.y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3 3" />
      <text x="${padLeft - 10}" y="${t.y + 4}" font-size="10" fill="#64748B" font-family="sans-serif" text-anchor="end">${formatBRL(t.val)}</text>
    `
    )
    .join("");

  // Eixo X
  const stepMonth = maxMonths <= 24 ? 6 : maxMonths <= 36 ? 6 : 12;
  const xTicks: number[] = [];
  for (let m = 0; m <= maxMonths; m += stepMonth) {
    xTicks.push(m);
  }

  const xLabels = xTicks
    .map((m) => {
      const x = getX(m);
      return `
        <line x1="${x}" y1="${padTop + plotHeight}" x2="${x}" y2="${padTop + plotHeight + 5}" stroke="#94A3B8" stroke-width="1" />
        <text x="${x}" y="${padTop + plotHeight + 18}" font-size="10" fill="#64748B" font-family="sans-serif" text-anchor="middle">Mês ${m}</text>
      `;
    })
    .join("");

  // Linha de Preço de Compra (Horizontal Vermelha Tracejada)
  const yInvest = getY(investmentCost);
  const investLine = `
    <line x1="${padLeft}" y1="${yInvest}" x2="${padLeft + plotWidth}" y2="${yInvest}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6 4" />
    <text x="${padLeft + plotWidth - 5}" y="${Math.max(padTop + 14, yInvest - 6)}" font-size="10.5" font-weight="700" fill="#DC2626" font-family="sans-serif" text-anchor="end">
      Preço de Compra: ${formatBRL(investmentCost)}
    </text>
  `;

  // Linha de Economia Acumulada
  const savingsPathPoints = dataPoints.map((p) => `${getX(p.month)},${getY(p.cumulativeSavings)}`).join(" ");

  // Área de Lucro Líquido pós-payback
  let profitPolygon = "";
  if (paybackMonths <= maxMonths) {
    const xBreak = getX(paybackMonths);
    const postPoints = dataPoints.filter((p) => p.month >= paybackMonths);
    if (postPoints.length > 0) {
      const polyCoords = [
        `${xBreak},${yInvest}`,
        ...postPoints.map((p) => `${getX(p.month)},${getY(p.cumulativeSavings)}`),
        `${getX(maxMonths)},${yInvest}`,
      ].join(" ");
      profitPolygon = `<polygon points="${polyCoords}" fill="#10B981" fill-opacity="0.16" />`;
    }
  }

  // Ponto de Corte (Break-even)
  const xCut = getX(Math.min(paybackMonths, maxMonths));
  const yCut = yInvest;
  const clampedXCutBadge = Math.max(padLeft + 80, Math.min(padLeft + plotWidth - 80, xCut));

  const cutMarker = `
    <!-- Linha vertical do ponto de corte até a base -->
    <line x1="${xCut}" y1="${yCut}" x2="${xCut}" y2="${padTop + plotHeight}" stroke="#059669" stroke-width="2" stroke-dasharray="4 3" />
    
    <!-- Círculo com halo de destaque -->
    <circle cx="${xCut}" cy="${yCut}" r="12" fill="#059669" fill-opacity="0.22" />
    <circle cx="${xCut}" cy="${yCut}" r="6.5" fill="#059669" stroke="#FFFFFF" stroke-width="2.5" />
    
    <!-- Badge / Callout Ponto de Corte Centralizado -->
    <g transform="translate(${clampedXCutBadge - 80}, ${Math.max(10, yCut - 34)})">
      <rect width="160" height="25" rx="7" fill="#059669" />
      <text x="80" y="17" fill="#FFFFFF" font-size="11" font-weight="800" font-family="sans-serif" text-anchor="middle">
        Ponto de corte: Mês ${paybackMonths}
      </text>
    </g>
  `;

  return `
    <div style="background: #FAFAFA; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
        <div>
          <strong style="font-size: 13px; color: #0F172A; text-transform: uppercase;">Gráfico do Ponto de Equilíbrio (Curva de Payback)</strong>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748B;">A linha verde cruza a linha tracejada de compra no mês de Payback; a partir dali há lucro líquido real.</p>
        </div>
        <div style="background: #E6FCF5; border: 1px solid #A7F3D0; color: #059669; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; text-align: center; shrink-0;">
          Ponto de corte: Mês ${paybackMonths}
        </div>
      </div>

      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- Eixos Cartesiano -->
        <line x1="${padLeft}" y1="${padTop + plotHeight}" x2="${padLeft + plotWidth}" y2="${padTop + plotHeight}" stroke="#94A3B8" stroke-width="1.5" />
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotHeight}" stroke="#94A3B8" stroke-width="1.5" />

        <!-- Grades e Rótulos -->
        ${gridLines}
        ${xLabels}

        <!-- Zona de Lucro Líquido pós-payback -->
        ${profitPolygon}

        <!-- Linha do Custo de Compra -->
        ${investLine}

        <!-- Linha de Economia Acumulada -->
        <polyline points="${savingsPathPoints}" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Destaque do Ponto de Corte -->
        ${cutMarker}
      </svg>

      <!-- Legenda Centralizada -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 14px; font-size: 11px; color: #475569; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 18px; height: 3px; background: #EF4444; border-top: 2px dashed #EF4444;"></div>
          <span>Preço de Compra (${formatBRL(investmentCost)})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 18px; height: 3px; background: #059669;"></div>
          <span>Economia Acumulada (${formatBRL(monthlySavings)}/mês)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #059669;"></div>
          <span style="font-weight: 700; color: #059669;">Ponto de Corte (Mês ${paybackMonths})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 14px; height: 10px; background: rgba(16, 185, 129, 0.25); border: 1px solid #10B981; border-radius: 2px;"></div>
          <span>Zona de Lucro Líquido</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Gráfico SVG Comparativo da Simulação
 */
function renderSimulationComparisonSvg(
  currentKwh: number,
  simulatedKwh: number,
  currentBrl: number,
  simulatedBrl: number,
  savingsKwh: number,
  savingsBrl: number
): string {
  const width = 740;
  const height = 145;
  const maxKwh = Math.max(currentKwh, simulatedKwh, 60) * 1.15;
  const plotWidth = 370;
  const barHeight = 22;

  const wCurrentKwh = Math.max(12, (currentKwh / maxKwh) * plotWidth);
  const wSimKwh = Math.max(12, (simulatedKwh / maxKwh) * plotWidth);
  const wDiffKwh = Math.max(8, (Math.max(0, currentKwh - simulatedKwh) / maxKwh) * plotWidth);

  return `
    <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
        <strong style="font-size: 13px; color: #0F172A; text-transform: uppercase;">Comparativo Visual de Consumo: Antes vs. Depois</strong>
        <span style="background: #DBEAFE; color: #1D4ED8; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;">
          Economia de ${formatBRL(savingsBrl)}/mês (-${formatNumber(savingsKwh)} kWh)
        </span>
      </div>

      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;">
        <!-- Barra 1: Consumo Atual -->
        <text x="0" y="24" font-size="11" font-weight="700" fill="#475569" font-family="sans-serif">Consumo Atual (Antes):</text>
        <rect x="180" y="8" width="${wCurrentKwh}" height="${barHeight}" rx="4" fill="#94A3B8" />
        <text x="${180 + wCurrentKwh + 10}" y="24" font-size="11.5" font-weight="800" fill="#1E293B" font-family="sans-serif">
          ${formatNumber(currentKwh)} kWh (${formatBRL(currentBrl)}/mês)
        </text>

        <!-- Barra 2: Consumo Simulado -->
        <text x="0" y="66" font-size="11" font-weight="700" fill="#2563EB" font-family="sans-serif">Com Novos Hábitos:</text>
        <rect x="180" y="50" width="${wSimKwh}" height="${barHeight}" rx="4" fill="#2563EB" />
        <text x="${180 + wSimKwh + 10}" y="66" font-size="11.5" font-weight="800" fill="#2563EB" font-family="sans-serif">
          ${formatNumber(simulatedKwh)} kWh (${formatBRL(simulatedBrl)}/mês)
        </text>

        <!-- Barra 3: Alívio / Redução -->
        <text x="0" y="108" font-size="11" font-weight="700" fill="#059669" font-family="sans-serif">Alívio Estimado (Lucro):</text>
        <rect x="180" y="92" width="${wDiffKwh}" height="${barHeight}" rx="4" fill="#10B981" />
        <text x="${180 + wDiffKwh + 10}" y="108" font-size="11.5" font-weight="800" fill="#059669" font-family="sans-serif">
          -${formatNumber(savingsKwh)} kWh (-${formatBRL(savingsBrl)} mensais)
        </text>
      </svg>
    </div>
  `;
}

/**
 * Gráfico SVG Comparativo da Fatura / Leitor de Contas
 */
function renderBillComparisonSvg(kwh: number, billTotal: number): string {
  const width = 740;
  const height = 115;
  const benchmarkKwh = 160; // Média de referência ANEEL
  const maxKwh = Math.max(kwh, benchmarkKwh, 100) * 1.25;
  const plotWidth = 380;
  const barHeight = 22;

  const wCurrent = Math.max(12, (kwh / maxKwh) * plotWidth);
  const wRef = Math.max(12, (benchmarkKwh / maxKwh) * plotWidth);

  return `
    <div style="background: #FFF7ED; border: 1.5px solid #FED7AA; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #FED7AA; padding-bottom: 6px;">
        <strong style="font-size: 13px; color: #9A3412; text-transform: uppercase;">Comparativo Visual de Consumo da Fatura</strong>
        <span style="background: #EA580C; color: #FFFFFF; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;">
          ${formatNumber(kwh)} kWh auditados
        </span>
      </div>

      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;">
        <!-- Fatura Analisada -->
        <text x="0" y="24" font-size="11" font-weight="700" fill="#9A3412" font-family="sans-serif">Consumo Desta Fatura:</text>
        <rect x="180" y="8" width="${wCurrent}" height="${barHeight}" rx="4" fill="#EA580C" />
        <text x="${180 + wCurrent + 10}" y="24" font-size="11.5" font-weight="800" fill="#9A3412" font-family="sans-serif">
          ${formatNumber(kwh)} kWh (${formatBRL(billTotal)})
        </text>

        <!-- Média de Referência -->
        <text x="0" y="66" font-size="11" font-weight="700" fill="#64748B" font-family="sans-serif">Média Familiar Típica:</text>
        <rect x="180" y="50" width="${wRef}" height="${barHeight}" rx="4" fill="#94A3B8" />
        <text x="${180 + wRef + 10}" y="66" font-size="11.5" font-weight="800" fill="#475569" font-family="sans-serif">
          ~${benchmarkKwh} kWh/mês (Padrão ANEEL Ceará)
        </text>
      </svg>
    </div>
  `;
}

/**
 * Gráfico SVG do Dossiê Geral do Aplicativo
 */
function renderAppGeneralChartSvg(diagnoses: SavedDiagnosis[], bills: BillScanRecord[]): string {
  const width = 740;
  const height = 120;
  const diagCount = diagnoses.length;
  const billCount = bills.length;
  const totalItems = Math.max(1, diagCount + billCount);

  const diagKwh = diagnoses.reduce((acc, d) => acc + (d.result.totalEstimated || 0), 0) / Math.max(1, diagCount);
  const billKwh = bills.reduce((acc, b) => acc + (b.bill.consumo_kwh || 0), 0) / Math.max(1, billCount);

  return `
    <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
        <strong style="font-size: 13px; color: #0F172A; text-transform: uppercase;">Comparativo Geral de Médias do Aplicativo</strong>
        <span style="font-size: 11px; color: #64748B;">Dados consolidados</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;">
        <text x="0" y="24" font-size="11" font-weight="700" fill="#087F5B" font-family="sans-serif">Média Diagnósticos:</text>
        <rect x="170" y="8" width="${Math.max(10, Math.min(380, diagKwh * 1.1))}" height="20" rx="4" fill="#087F5B" />
        <text x="${170 + Math.max(10, Math.min(380, diagKwh * 1.1)) + 10}" y="23" font-size="11" font-weight="800" fill="#087F5B" font-family="sans-serif">
          ${formatNumber(diagKwh)} kWh/mês estimados
        </text>

        <text x="0" y="64" font-size="11" font-weight="700" fill="#EA580C" font-family="sans-serif">Média Contas Lidas:</text>
        <rect x="170" y="48" width="${Math.max(10, Math.min(380, billKwh * 1.1))}" height="20" rx="4" fill="#EA580C" />
        <text x="${170 + Math.max(10, Math.min(380, billKwh * 1.1)) + 10}" y="63" font-size="11" font-weight="800" fill="#EA580C" font-family="sans-serif">
          ${formatNumber(billKwh)} kWh faturados
        </text>
      </svg>
    </div>
  `;
}

// -------------------------------------------------------------
// 1. DIAGNÓSTICO ENERGÉTICO (Verde Esmeralda / Teal)
// -------------------------------------------------------------
function compileDiagnosisReport(
  diag: SavedDiagnosis,
  currentDate: string,
  currentHour: string
): CompiledReportResult {
  const themeColor = "#087F5B"; // Verde Esmeralda oficial
  const themeLight = "#E6FCF5";
  const themeAccent = "#0D9488";
  const { input, result, createdAt } = diag;

  const diagDate = new Date(createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const estimatedCost = result.totalEstimated * (result.effectiveCostPerKwh || 0.85);

  // Top 6 aparelhos
  const topAppliances = [...(result.estimates || [])]
    .sort((a, b) => b.monthlyKwh - a.monthlyKwh)
    .slice(0, 6);

  const appliancesRows = topAppliances
    .map((app) => {
      const pct = Math.round((app.monthlyKwh / Math.max(1, result.totalEstimated)) * 100);
      const appCost = app.monthlyKwh * result.effectiveCostPerKwh;
      return `
        <tr>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">
            ${app.label}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">
            ${app.powerWatts} W
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">
            ${app.hoursPerDay}h/dia · ${app.frequency} dias/mês
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #087F5B;">
            ${formatNumber(app.monthlyKwh)} kWh (${pct}%)
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #1E293B;">
            ${formatBRL(appCost)}
          </td>
        </tr>
      `;
    })
    .join("");

  const recommendationsList = (result.recommendations || [])
    .slice(0, 4)
    .map((rec) => `
      <div style="margin-bottom: 10px; padding: 12px; background: #F8FAFC; border-left: 4px solid ${themeColor}; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: #0F172A; font-size: 13px;">${rec.title}</strong>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: #E6FCF5; color: #087F5B; font-weight: 700;">
            ${rec.effort} esforço · ${rec.cost}
          </span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.4;">${rec.action || rec.why}</p>
      </div>
    `)
    .join("");

  const riskSigns = input.safety?.riskSigns || [];
  const safetySection = (result.safetyAlert || riskSigns.length > 0)
    ? `
      <div style="margin-top: 16px; padding: 12px 16px; background: #FEF2F2; border: 1.5px solid #EF4444; border-radius: 8px;">
        <strong style="color: #B91C1C; font-size: 13px; display: block; margin-bottom: 4px;">
          ⚠️ Alerta de Segurança Elétrica Residencial:
        </strong>
        <p style="margin: 0; font-size: 12px; color: #7F1D1D; line-height: 1.4;">
          Foram apontados pontos de risco elétrico na residência: ${riskSigns.join("; ") || "Atenção a condutores aquecidos e disjuntores inadequados"}. Consulte um eletricista habilitado.
        </p>
      </div>
    `
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; background: #FFFFFF;">
      <!-- Header Turn OFF -->
      <div style="border-bottom: 3px solid ${themeColor}; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: ${themeColor}; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 16px;">💡</div>
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0F172A;">Turn<span style="color: ${themeColor};">OFF</span></span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">EEEP Dom Walfrido Teixeira Vieira · GT-02 · Eficiência Energética e Cidadania</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; background: ${themeLight}; color: ${themeColor}; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase;">
            Relatório de Diagnóstico
          </span>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">Emitido em ${currentDate} às ${currentHour}</p>
        </div>
      </div>

      <!-- Resumo Principal em Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Consumo Estimado</span>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 900; color: ${themeColor};">${formatNumber(result.totalEstimated)} <span style="font-size: 12px;">kWh/mês</span></p>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Custo Mensal Previsto</span>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 900; color: #0F172A;">${formatBRL(estimatedCost)}</p>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Economia Potencial</span>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 900; color: #059669;">${formatNumber(result.savings?.probable?.[0] || 0)} <span style="font-size: 12px;">a ${formatNumber(result.savings?.probable?.[1] || 0)} kWh</span></p>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Confiabilidade</span>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 900; color: #3B82F6;">${result.confidenceScore}%</p>
        </div>
      </div>

      <!-- Dados da Residência -->
      <div style="padding: 12px 16px; background: #F1F5F9; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #334155;">
        <strong>Contexto da Residência:</strong> ${input.occupants} moradores · Valor da conta de luz informada: ${formatBRL(input.billValue || 0)} · Consumo informado: ${input.monthlyKwh || 0} kWh · Tarifa real estimada: R$ ${(result.effectiveCostPerKwh || 0.85).toFixed(3)}/kWh.
      </div>

      <!-- Tabela dos Maiores Consumidores -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px;">
          Aparelhos de Maior Consumo (Ranking e Gráfico)
        </h3>
        ${renderDiagnosisVerticalBarsSvg(topAppliances, result.totalEstimated)}
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #F8FAFC; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #CBD5E1;">Aparelho</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #CBD5E1;">Potência</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #CBD5E1;">Uso Médio</th>
              <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #CBD5E1;">Consumo Mensal</th>
              <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #CBD5E1;">Custo Estimado</th>
            </tr>
          </thead>
          <tbody>
            ${appliancesRows}
          </tbody>
        </table>
      </div>

      <!-- Recomendações de Eficiência -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px;">
          Plano de Ação e Economia Recomendado
        </h3>
        ${recommendationsList}
      </div>

      ${safetySection}

      <!-- Rodapé Institucional -->
      <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B;">
        <span>Turn OFF · Aplicativo Educacional e Comunitário de Eficiência Energética</span>
        <span>Relatório emitido para fins pedagógicos e de orientação residencial</span>
      </div>
    </div>
  `;

  return {
    html,
    filename: `Diagnostico_TurnOFF_${diagDate.replace(/\//g, "-")}.pdf`,
    themeColor,
    title: "Diagnóstico Residencial Turn OFF",
  };
}

// -------------------------------------------------------------
// 2. LEITOR DE CONTAS / AUDITORIA (Laranja / Âmbar)
// -------------------------------------------------------------
function compileBillReport(
  bill: ExtractedBill,
  currentDate: string,
  currentHour: string
): CompiledReportResult {
  const themeColor = "#EA580C"; // Laranja oficial do Leitor
  const themeLight = "#FFF7ED";

  const refMonth = bill.mes_referencia || "Mês Atual";
  const dueDate = bill.vencimento || "Não informado";
  const totalValue = bill.valor_total || 0;
  const kwh = bill.consumo_kwh || 0;
  const average12m = bill.consumo_medio_12m_kwh || kwh;
  const unitCode = bill.unidade_consumidora || "Não informada";
  const distributor = bill.distribuidora || "Concessionária de Energia";

  const alertsHtml = (bill.alertas || [])
    .map(
      (a) => `
      <li style="margin-bottom: 6px; font-size: 12px; color: #9A3412;">
        ${a}
      </li>
    `
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; background: #FFFFFF;">
      <!-- Header Turn OFF -->
      <div style="border-bottom: 3px solid ${themeColor}; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: ${themeColor}; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 16px;">📄</div>
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0F172A;">Turn<span style="color: ${themeColor};">OFF</span></span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">EEEP Dom Walfrido Teixeira Vieira · GT-02 · Auditoria de Faturas</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; background: ${themeLight}; color: ${themeColor}; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase;">
            Auditoria da Conta de Luz
          </span>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">Emitido em ${currentDate} às ${currentHour}</p>
        </div>
      </div>

      <!-- Resumo Principal da Conta -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="padding: 14px; background: #FFF7ED; border: 1.5px solid #FFEDD5; border-radius: 8px;">
          <span style="font-size: 11px; color: #9A3412; text-transform: uppercase; font-weight: 700;">Valor Total Faturado</span>
          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: ${themeColor};">${formatBRL(totalValue)}</p>
          <span style="font-size: 11px; color: #64748B;">Vencimento: ${dueDate}</span>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Consumo Faturado</span>
          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #0F172A;">${kwh} <span style="font-size: 13px;">kWh</span></p>
          <span style="font-size: 11px; color: #64748B;">Média 12m: ${average12m} kWh</span>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Tarifa Social</span>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900; color: ${bill.tarifa_social_identificada ? "#059669" : "#64748B"};">
            ${bill.tarifa_social_identificada ? "Benefício Ativo" : "Não Aplicada"}
          </p>
          <span style="font-size: 11px; color: #64748B;">${bill.tarifa_social_identificada ? "Desconto concedido" : "Verifique seu CadÚnico"}</span>
        </div>
      </div>

      <!-- Gráfico Comparativo da Fatura -->
      ${renderBillComparisonSvg(kwh, totalValue)}

      <!-- Detalhamento dos Componentes Tarifários -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px;">
          Dados Cadastrais e Faturamento
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tbody>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569; width: 40%;">Distribuidora:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${distributor}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569;">Unidade Consumidora (UC):</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${unitCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569;">Mês de Referência:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${refMonth}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569;">Bandeira Tarifária:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${bill.bandeira ? bill.bandeira.toUpperCase() : "Bandeira Verde / Padrão"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569;">Contribuição Ilum. Pública (CIP/COSIP):</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${bill.cosip ? formatBRL(bill.cosip) : "Inclusa na fatura"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alertas e Oportunidades Identificadas -->
      ${
        alertsHtml
          ? `
        <div style="margin-bottom: 20px; padding: 14px; background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: 8px;">
          <strong style="color: #B45309; font-size: 13px; display: block; margin-bottom: 6px;">
            Pontos de Atenção na Fatura:
          </strong>
          <ul style="margin: 0; padding-left: 18px;">
            ${alertsHtml}
          </ul>
        </div>
      `
          : ""
      }

      <!-- Rodapé Institucional -->
      <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B;">
        <span>Turn OFF · Auditoria de Faturas e Direitos do Consumidor de Energia</span>
        <span>Projeto do GT-02 · EEEP Dom Walfrido Teixeira Vieira</span>
      </div>
    </div>
  `;

  return {
    html,
    filename: `Auditoria_Conta_${refMonth.replace(/[\/\s]/g, "-")}.pdf`,
    themeColor,
    title: "Auditoria de Conta Turn OFF",
  };
}

// -------------------------------------------------------------
// 3. SIMULADOR DE PAYBACK (Índigo / Violeta)
// -------------------------------------------------------------
function compilePaybackReport(
  payload: Extract<ReportPayload, { type: "payback" }>,
  currentDate: string,
  currentHour: string
): CompiledReportResult {
  const themeColor = "#4F46E5"; // Índigo oficial do Payback
  const themeLight = "#EEF2FF";

  const {
    equipmentName,
    investmentCost,
    monthlySavings,
    paybackMonths,
    return5Years,
  } = payload;

  const return5 = return5Years ?? monthlySavings * 60 - investmentCost;
  const isViable = paybackMonths <= 36;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; background: #FFFFFF;">
      <!-- Header Turn OFF -->
      <div style="border-bottom: 3px solid ${themeColor}; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: ${themeColor}; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 16px;">⚡</div>
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0F172A;">Turn<span style="color: ${themeColor};">OFF</span></span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">EEEP Dom Walfrido Teixeira Vieira · GT-02 · Viabilidade Financeira</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; background: ${themeLight}; color: ${themeColor}; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase;">
            Análise de Retorno (Payback)
          </span>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">Emitido em ${currentDate} às ${currentHour}</p>
        </div>
      </div>

      <!-- Resumo Principal -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="padding: 14px; background: #EEF2FF; border: 1.5px solid #E0E7FF; border-radius: 8px;">
          <span style="font-size: 11px; color: #4338CA; text-transform: uppercase; font-weight: 700;">Tempo de Retorno (Payback)</span>
          <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: ${themeColor};">${paybackMonths} <span style="font-size: 14px;">meses</span></p>
          <span style="font-size: 11px; color: #64748B;">${(paybackMonths / 12).toFixed(1)} anos para recuperar o valor</span>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Economia Mensal</span>
          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #059669;">${formatBRL(monthlySavings)}/mês</p>
          <span style="font-size: 11px; color: #64748B;">${formatBRL(monthlySavings * 12)} ao ano</span>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Lucro Líquido (5 Anos)</span>
          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: ${return5 > 0 ? "#059669" : "#DC2626"};">
            ${formatBRL(return5)}
          </p>
          <span style="font-size: 11px; color: #64748B;">Já descontado o valor de compra</span>
        </div>
      </div>

      <!-- Gráfico da Curva de Retorno e Ponto de Equilíbrio -->
      ${renderPaybackChartSvg({
        investmentCost,
        monthlySavings,
        paybackMonths,
        timeline: payload.timeline,
      })}

      <!-- Detalhamento do Equipamento -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px;">
          Premissas da Substituição
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tbody>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569; width: 45%;">Equipamento Analisado:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${equipmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569;">Preço de Aquisição do Novo Aparelho:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${formatBRL(investmentCost)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #475569;">Veredito de Viabilidade Financeira:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: ${isViable ? "#059669" : "#D97706"};">
                ${isViable ? "✓ Altamente Recomendado (Retorno Eficiente)" : "⚠️ Viabilidade Moderada / Longo Prazo"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Rodapé Institucional -->
      <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B;">
        <span>Turn OFF · Simulador de Payback Energético Residencial</span>
        <span>Projeto do GT-02 · EEEP Dom Walfrido Teixeira Vieira</span>
      </div>
    </div>
  `;

  return {
    html,
    filename: `Payback_${equipmentName.replace(/[\/\s]/g, "_")}.pdf`,
    themeColor,
    title: "Análise de Payback Turn OFF",
  };
}

// -------------------------------------------------------------
// 4. SIMULAÇÃO DE HÁBITOS (Azul Elétrico)
// -------------------------------------------------------------
function compileSimulationReport(
  payload: Extract<ReportPayload, { type: "simulation" }>,
  currentDate: string,
  currentHour: string
): CompiledReportResult {
  const themeColor = "#2563EB"; // Azul Elétrico da Simulação
  const themeLight = "#EFF6FF";

  const { scenario } = payload;
  const scLabel = scenario.label || scenario.summaryTitle || "Simulação de Hábitos";
  const scMonthlyKwh = scenario.monthlyKwh ?? 0;
  const scSavingsKwh = scenario.savingsKwh ?? 0;
  const scSavingsBrl = scenario.savingsBrl ?? 0;
  const scMonthlyCost =
    scenario.monthlyCost ??
    (scenario.baseMonthlyBrl ? Math.max(0, scenario.baseMonthlyBrl - scSavingsBrl) : 0);

  const changes = scenario.changesSummary || [
    "Ajuste na rotina de uso e tempos de operação dos aparelhos",
  ];

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; background: #FFFFFF;">
      <!-- Header Turn OFF -->
      <div style="border-bottom: 3px solid ${themeColor}; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: ${themeColor}; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 16px;">🎛️</div>
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0F172A;">Turn<span style="color: ${themeColor};">OFF</span></span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">EEEP Dom Walfrido Teixeira Vieira · GT-02 · Simulador de Hábitos</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; background: ${themeLight}; color: ${themeColor}; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase;">
            ${scLabel}
          </span>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">Emitido em ${currentDate} às ${currentHour}</p>
        </div>
      </div>

      <!-- Resumo Principal -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="padding: 14px; background: #EFF6FF; border: 1.5px solid #DBEAFE; border-radius: 8px;">
          <span style="font-size: 11px; color: #1D4ED8; text-transform: uppercase; font-weight: 700;">Redução Estimada</span>
          <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: ${themeColor};">${scSavingsKwh >= 0 ? "-" : "+"}${formatNumber(Math.abs(scSavingsKwh))} <span style="font-size: 14px;">kWh</span></p>
          <span style="font-size: 11px; color: #64748B;">Por mês na residência</span>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Economia em Dinheiro</span>
          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #059669;">${formatBRL(scSavingsBrl)}/mês</p>
          <span style="font-size: 11px; color: #64748B;">${formatBRL(scSavingsBrl * 12)} ao ano</span>
        </div>
        <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">Novo Consumo Projetado</span>
          <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #0F172A;">${formatNumber(scMonthlyKwh)} <span style="font-size: 13px;">kWh</span></p>
          <span style="font-size: 11px; color: #64748B;">Nova conta estimada: ${formatBRL(scMonthlyCost)}</span>
        </div>
      </div>

      <!-- Gráfico Comparativo Antes vs Depois -->
      ${renderSimulationComparisonSvg(
        scMonthlyKwh + scSavingsKwh,
        scMonthlyKwh,
        scMonthlyCost + scSavingsBrl,
        scMonthlyCost,
        scSavingsKwh,
        scSavingsBrl
      )}

      <!-- Mudanças Simuladas -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px;">
          Modificações de Hábito Testadas
        </h3>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.6;">
          ${changes.map((c) => `<li>${c}</li>`).join("")}
        </ul>
      </div>

      <!-- Rodapé Institucional -->
      <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B;">
        <span>Turn OFF · Simulação de Hábitos</span>
        <span>Projeto do GT-02 · EEEP Dom Walfrido Teixeira Vieira</span>
      </div>
    </div>
  `;

  return {
    html,
    filename: `Simulacao_TurnOFF_${Date.now()}.pdf`,
    themeColor,
    title: "Simulação de Hábitos Turn OFF",
  };
}

// -------------------------------------------------------------
// 5. RELATÓRIO DO APP GERAL (Ardósia & Esmeralda)
// -------------------------------------------------------------
function compileAppSummaryReport(
  diagnoses: SavedDiagnosis[],
  bills: BillScanRecord[],
  currentDate: string,
  currentHour: string
): CompiledReportResult {
  const themeColor = "#0F172A"; // Ardósia com acento Esmeralda
  const primaryDiagnosis = diagnoses.find((d) => d.kind !== "teste") || diagnoses[0];
  const lastBill = bills[0]?.bill;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; background: #FFFFFF;">
      <!-- Header Turn OFF -->
      <div style="border-bottom: 3px solid #087F5B; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: #087F5B; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 16px;">💡</div>
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0F172A;">Turn<span style="color: #087F5B;">OFF</span></span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">EEEP Dom Walfrido Teixeira Vieira · GT-02 · Eficiência Energética Residencial</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; background: #E6FCF5; color: #087F5B; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase;">
            Dossiê de Eficiência Geral
          </span>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">Emitido em ${currentDate} às ${currentHour}</p>
        </div>
      </div>

      <!-- Apresentação do Projeto -->
      <div style="padding: 14px 18px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #334155; line-height: 1.6;">
        <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 13px; color: #0F172A;">Sobre o Aplicativo Turn OFF:</p>
        O <strong>Turn OFF</strong> é uma plataforma comunitária desenvolvida por estudantes do GT-02 da EEEP Dom Walfrido Teixeira Vieira com o objetivo de democratizar o acesso à eficiência energética, auditoria de contas e segurança elétrica residencial.
      </div>

      <!-- Resumo dos Dados Registrados -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px;">
        <div style="padding: 16px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #087F5B; text-transform: uppercase;">
            Diagnósticos Salvos (${diagnoses.length})
          </h4>
          ${
            primaryDiagnosis
              ? `
            <p style="margin: 0; font-size: 12px; color: #475569;">
              <strong>Último consumo estimado:</strong> ${formatNumber(primaryDiagnosis.result.totalEstimated)} kWh/mês<br>
              <strong>Moradores:</strong> ${primaryDiagnosis.input.occupants} pessoas<br>
              <strong>Confiabilidade:</strong> ${primaryDiagnosis.result.confidenceScore}%
            </p>
          `
              : `<p style="margin: 0; font-size: 12px; color: #94A3B8;">Nenhum diagnóstico registrado ainda.</p>`
          }
        </div>

        <div style="padding: 16px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #EA580C; text-transform: uppercase;">
            Contas Auditadas (${bills.length})
          </h4>
          ${
            lastBill
              ? `
            <p style="margin: 0; font-size: 12px; color: #475569;">
              <strong>Último valor auditado:</strong> ${formatBRL(lastBill.valor_total || 0)}<br>
              <strong>Consumo:</strong> ${lastBill.consumo_kwh || 0} kWh<br>
              <strong>Distribuidora:</strong> ${lastBill.distribuidora || "Não informada"}
            </p>
          `
              : `<p style="margin: 0; font-size: 12px; color: #94A3B8;">Nenhuma conta auditada ainda.</p>`
          }
        </div>
      </div>

      <!-- Gráfico Comparativo Geral -->
      ${renderAppGeneralChartSvg(diagnoses, bills)}

      <!-- Pilares do App -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px;">
          Funcionalidades Integradas
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 12px;">
          <div style="padding: 10px; background: #F8FAFC; border-radius: 6px;">
            <strong style="color: #087F5B;">✓ Diagnóstico Residencial:</strong> Mapeamento cômodo a cômodo com detecção de stand-by.
          </div>
          <div style="padding: 10px; background: #F8FAFC; border-radius: 6px;">
            <strong style="color: #EA580C;">✓ Scanner de Contas:</strong> Leitor com OCR e IA para verificação de tarifas e tributos.
          </div>
          <div style="padding: 10px; background: #F8FAFC; border-radius: 6px;">
            <strong style="color: #2563EB;">✓ Simulação de Hábitos:</strong> Análise de sensibilidade antes de mudar rotinas.
          </div>
          <div style="padding: 10px; background: #F8FAFC; border-radius: 6px;">
            <strong style="color: #4F46E5;">✓ Simulador de Payback:</strong> Cálculo de retorno financeiro para troca de aparelhos.
          </div>
        </div>
      </div>

      <!-- Rodapé Institucional -->
      <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B;">
        <span>Turn OFF · Aplicativo Educacional e Comunitário de Eficiência Energética</span>
        <span>Projeto do GT-02 · EEEP Dom Walfrido Teixeira Vieira</span>
      </div>
    </div>
  `;

  return {
    html,
    filename: `Relatorio_TurnOFF_Geral_${Date.now()}.pdf`,
    themeColor,
    title: "Dossiê Geral Turn OFF",
  };
}

/**
 * Gera um Blob binário de PDF estático diretamente em memória via jsPDF.
 * Bypassa completamente o DOM e o html2canvas, eliminando o travamento da thread
 * principal, repaints pesados e retenção de ponteiro do mouse na UI.
 */
export async function generateStaticPdfBlob(
  payload: ReportPayload
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hourStr = dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const timestamp = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, "0")}${String(dateObj.getDate()).padStart(2, "0")}_${String(dateObj.getHours()).padStart(2, "0")}${String(dateObj.getMinutes()).padStart(2, "0")}`;

  // Cores institucionais estritas por módulo (Diretriz Turn OFF)
  const THEME_DIAGNOSIS: [number, number, number] = [8, 127, 91]; // Verde Esmeralda (#087F5B)
  const THEME_BILL: [number, number, number] = [234, 88, 12]; // Laranja / Âmbar (#EA580C)
  const THEME_PAYBACK: [number, number, number] = [79, 70, 229]; // Índigo / Violeta (#4F46E5)
  const THEME_SIMULATION: [number, number, number] = [37, 99, 235]; // Azul Real (#2563EB)
  const THEME_APP: [number, number, number] = [15, 23, 42]; // Slate / Escuro (#0F172A)

  let themeRgb = THEME_DIAGNOSIS;
  let title = "Relatório de Eficiência Energética";
  let subtitle = "DIAGNÓSTICO RESIDENCIAL";
  let filename = `TurnOFF_Relatorio_${timestamp}.pdf`;

  if (payload.type === "diagnosis") {
    themeRgb = THEME_DIAGNOSIS;
    title = "Relatório de Diagnóstico Residencial";
    subtitle = "AUDITORIA DE CARGAS E CONSUMO";
    filename = `TurnOFF_Diagnostico_${timestamp}.pdf`;
  } else if (payload.type === "bill") {
    themeRgb = THEME_BILL;
    title = "Auditoria de Conta de Energia";
    subtitle = "LEITOR E AUDITOR DE FATURA";
    const distName = (payload.bill.distribuidora || "Fatura").replace(/[^a-zA-Z0-9]/g, "");
    filename = `TurnOFF_Fatura_${distName}_${timestamp}.pdf`;
  } else if (payload.type === "payback") {
    themeRgb = THEME_PAYBACK;
    title = "Simulador de Payback de Equipamento";
    subtitle = "ESTUDO DE RETORNO DO INVESTIMENTO";
    const eqName = (payload.equipmentName || "Equipamento").replace(/[^a-zA-Z0-9]/g, "");
    filename = `TurnOFF_Payback_${eqName}_${timestamp}.pdf`;
  } else if (payload.type === "simulation") {
    themeRgb = THEME_SIMULATION;
    title = "Simulação de Otimização de Hábitos";
    subtitle = "CENÁRIO PROJETADO 'E SE...'";
    filename = `TurnOFF_Simulacao_${timestamp}.pdf`;
  } else {
    themeRgb = THEME_APP;
    title = "Dossiê Geral Turn OFF";
    subtitle = "PANORAMA CONSOLIDADO DE EFICIÊNCIA";
    filename = `TurnOFF_Dossie_Geral_${timestamp}.pdf`;
  }

  let currentY = 32;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 275) {
      doc.addPage();
      currentY = 22;
      // Mini-header em páginas subsequentes
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.rect(0, 0, 210, 11, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`TURN OFF • ${String(title || "RELATÓRIO").toUpperCase()}`, 14, 7.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`${dateStr} às ${hourStr}`, 196, 7.5, { align: "right" });
    }
  };

  // 1. Cabeçalho Oficial
  doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("TURN OFF", 14, 11);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("EFICIÊNCIA ENERGÉTICA INTELIGENTE", 14, 17);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(String(title || "RELATÓRIO").toUpperCase(), 196, 11, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`${subtitle} • ${dateStr} às ${hourStr}`, 196, 17, { align: "right" });

  // 2. Renderização de Seções por Tipo
  if (payload.type === "diagnosis") {
    const diag = payload.diagnosis;
    const billVal = diag.input.billValue || 0;
    const estKwh = diag.result.totalEstimated || 0;
    const potBrl = diag.result.savings?.probable ? diag.result.savings.probable[1] : 0;
    const classification = diag.result.coherence === "coerente" ? "Coerente" : "Auditoria Recomendada";

    // Card de Métricas Principais
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 24, 2.5, 2.5, "FD");

    const metrics = [
      { label: "Consumo Estimado", val: `${formatNumber(estKwh)} kWh/mês`, col: [15, 23, 42] as [number, number, number] },
      { label: "Custo Projetado", val: formatBRL(billVal || estKwh * (diag.result.effectiveCostPerKwh || 0.95)), col: [15, 23, 42] as [number, number, number] },
      { label: "Economia Potencial", val: `${formatBRL(potBrl)}/mês`, col: THEME_DIAGNOSIS },
      { label: "Classificação", val: classification, col: [13, 148, 136] as [number, number, number] },
    ];

    const colW = 182 / metrics.length;
    metrics.forEach((m, idx) => {
      const colX = 14 + idx * colW + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(m.label || "").toUpperCase(), colX, currentY + 7);

      doc.setFontSize(10.5);
      doc.setTextColor(m.col[0], m.col[1], m.col[2]);
      doc.text(m.val, colX, currentY + 16.5);

      if (idx < metrics.length - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.line(14 + (idx + 1) * colW, currentY + 4, 14 + (idx + 1) * colW, currentY + 20);
      }
    });

    currentY += 31;

    // Resumo da Residência
    checkPageBreak(25);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, 182, 18, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("PERFIL DA RESIDÊNCIA", 18, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const activeDiagAppliances = (diag.input.appliances || []).filter((a) => a.present !== false);
    doc.text(`• Ocupantes: ${diag.input.occupants || 1} pessoas`, 18, currentY + 12);
    doc.text(`• Aparelhos Analisados: ${activeDiagAppliances.length} itens`, 75, currentY + 12);
    doc.text(`• Consumo de Referência: ${diag.input.monthlyKwh} kWh/mês`, 135, currentY + 12);

    currentY += 24;

    // Ranking dos Maiores Consumidores
    checkPageBreak(20);
    doc.setFillColor(THEME_DIAGNOSIS[0], THEME_DIAGNOSIS[1], THEME_DIAGNOSIS[2]);
    doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("RANKING DE APARELHOS (MAIORES CARGAS)", 20, currentY + 5);
    currentY += 9;

    const topApps = (diag.result.estimates && diag.result.estimates.length > 0)
      ? [...diag.result.estimates].sort((a, b) => b.monthlyKwh - a.monthlyKwh)
      : activeDiagAppliances.map(a => ({
          label: a.label,
          monthlyKwh: ((a.powerWatts * a.hoursPerDay * (a.frequency || 30)) / 1000),
          powerWatts: a.powerWatts,
          hoursPerDay: a.hoursPerDay,
        })).sort((a, b) => b.monthlyKwh - a.monthlyKwh);

    topApps.slice(0, 10).forEach((app, idx) => {
      checkPageBreak(13);
      const pct = estKwh > 0 ? Math.min(100, Math.round((app.monthlyKwh / estKwh) * 100)) : 0;
      const appCost = (app.monthlyKwh / Math.max(1, estKwh)) * billVal;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(14, currentY, 182, 11.5, 1.5, 1.5, "FD");

      // Posição e Nome
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${app.label.length > 28 ? app.label.slice(0, 27) + "..." : app.label}`, 18, currentY + 5);

      // Especificações
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`${app.powerWatts}W • ${app.hoursPerDay}h/dia`, 18, currentY + 9.5);

      // Barra de Porcentagem
      doc.setFillColor(226, 232, 240);
      doc.rect(95, currentY + 4, 45, 3.5, "F");
      doc.setFillColor(THEME_DIAGNOSIS[0], THEME_DIAGNOSIS[1], THEME_DIAGNOSIS[2]);
      doc.rect(95, currentY + 4, Math.max(1, 45 * (pct / 100)), 3.5, "F");

      // Valores
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(THEME_DIAGNOSIS[0], THEME_DIAGNOSIS[1], THEME_DIAGNOSIS[2]);
      doc.text(`${formatBRL(appCost || 0)}/mês (${pct}%)`, 192, currentY + 5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`${formatNumber(app.monthlyKwh)} kWh/mês`, 192, currentY + 9.5, { align: "right" });

      currentY += 13;
    });

    currentY += 4;

    // Dicas e Recomendações
    if (diag.result.recommendations && diag.result.recommendations.length > 0) {
      checkPageBreak(25);
      doc.setFillColor(THEME_DIAGNOSIS[0], THEME_DIAGNOSIS[1], THEME_DIAGNOSIS[2]);
      doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("PLANO DE AÇÃO E RECOMENDAÇÕES PRIORITÁRIAS", 20, currentY + 5);
      currentY += 9;

      diag.result.recommendations.slice(0, 5).forEach((rec, idx) => {
        checkPageBreak(12);
        const textContent = `${idx + 1}. ${rec.title}: ${rec.actionSimple || rec.action}`;
        const wrappedLines: string[] = doc.splitTextToSize(textContent, 174);
        const boxHeight = Math.max(9, wrappedLines.length * 4.5 + 4);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, currentY, 182, boxHeight, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(wrappedLines, 18, currentY + 5);

        currentY += boxHeight + 2.5;
      });
    }

    // Segurança Elétrica
    if (diag.input.hasSafetyRisk && diag.input.safety?.riskSigns && diag.input.safety.riskSigns.length > 0) {
      checkPageBreak(20);
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(14, currentY, 182, 16, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text("ALERTA DE SEGURANÇA ELÉTRICA IDENTIFICADO", 18, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(153, 27, 27);
      doc.text(`Sinais informados: ${diag.input.safety.riskSigns.join(", ")}. Recomenda-se revisão por eletricista habilitado.`, 18, currentY + 11.5);
      currentY += 20;
    }
  } else if (payload.type === "bill") {
    const bill = payload.bill;
    const kwh = bill.consumo_kwh || 0;
    const total = bill.valor_total || 0;
    const kwhPrice = kwh > 0 ? total / kwh : 0;
    const flagNames: Record<string, string> = {
      verde: "Verde",
      amarela: "Amarela",
      vermelha_1: "Vermelha 1",
      vermelha_2: "Vermelha 2",
    };
    const flag = bill.bandeira ? (flagNames[bill.bandeira] || bill.bandeira) : "Não identificada";

    // Card Métricas Fatura
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(254, 215, 170);
    doc.roundedRect(14, currentY, 182, 24, 2.5, 2.5, "FD");

    const billMetrics = [
      { label: "Consumo Faturado", val: `${formatNumber(kwh)} kWh`, col: [154, 52, 18] as [number, number, number] },
      { label: "Valor Total", val: formatBRL(total), col: THEME_BILL },
      { label: "Preço Efetivo", val: `${formatBRL(kwhPrice)}/kWh`, col: [15, 23, 42] as [number, number, number] },
      { label: "Bandeira", val: flag, col: [154, 52, 18] as [number, number, number] },
    ];

    const bColW = 182 / billMetrics.length;
    billMetrics.forEach((m, idx) => {
      const colX = 14 + idx * bColW + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(154, 52, 18);
      doc.text(String(m.label || "").toUpperCase(), colX, currentY + 7);

      doc.setFontSize(10.5);
      doc.setTextColor(m.col[0], m.col[1], m.col[2]);
      doc.text(m.val, colX, currentY + 16.5);

      if (idx < billMetrics.length - 1) {
        doc.setDrawColor(254, 215, 170);
        doc.line(14 + (idx + 1) * bColW, currentY + 4, 14 + (idx + 1) * bColW, currentY + 20);
      }
    });

    currentY += 31;

    // Dados Cadastrais
    checkPageBreak(25);
    doc.setFillColor(THEME_BILL[0], THEME_BILL[1], THEME_BILL[2]);
    doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("DADOS DA CONCESSIONÁRIA E FATURA", 20, currentY + 5);
    currentY += 9;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 22, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Concessionária: ${bill.distribuidora || "Não identificada"}`, 18, currentY + 7);
    doc.text(`• Mês de Referência: ${bill.mes_referencia || "Atual"}`, 105, currentY + 7);
    doc.text(`• Código / UC: ${bill.unidade_consumidora || "Não informado"}`, 18, currentY + 15);
    doc.text(`• Data de Vencimento: ${bill.vencimento || "Conforme boleto"}`, 105, currentY + 15);

    currentY += 28;

    // Tributos
    if (bill.impostos) {
      checkPageBreak(25);
      doc.setFillColor(THEME_BILL[0], THEME_BILL[1], THEME_BILL[2]);
      doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("COMPOSIÇÃO DE TRIBUTOS E ENCARGOS", 20, currentY + 5);
      currentY += 9;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, 182, 16, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`• ICMS: ${formatBRL(bill.impostos.icms || 0)}`, 18, currentY + 10);
      doc.text(`• PIS/COFINS: ${formatBRL(bill.impostos.pis_cofins || 0)}`, 105, currentY + 10);

      currentY += 22;
    }
  } else if (payload.type === "payback") {
    // Simulador Payback
    const eqName = payload.equipmentName || "Equipamento";
    const invest = payload.investmentCost || 0;
    const mSavings = payload.monthlySavings || 0;
    const pMonths = payload.paybackMonths || 0;
    const ret5y = payload.return5Years ?? (mSavings * 60 - invest);

    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(14, currentY, 182, 24, 2.5, 2.5, "FD");

    const pMetrics = [
      { label: "Investimento", val: formatBRL(invest), col: [67, 56, 202] as [number, number, number] },
      { label: "Economia Mensal", val: `${formatBRL(mSavings)}/mês`, col: [5, 150, 105] as [number, number, number] },
      { label: "Tempo de Payback", val: `${pMonths} meses`, col: THEME_PAYBACK },
      { label: "Retorno em 5 Anos", val: formatBRL(ret5y), col: [5, 150, 105] as [number, number, number] },
    ];

    const pColW = 182 / pMetrics.length;
    pMetrics.forEach((m, idx) => {
      const colX = 14 + idx * pColW + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(79, 70, 229);
      doc.text(String(m.label || "").toUpperCase(), colX, currentY + 7);

      doc.setFontSize(10.5);
      doc.setTextColor(m.col[0], m.col[1], m.col[2]);
      doc.text(m.val, colX, currentY + 16.5);

      if (idx < pMetrics.length - 1) {
        doc.setDrawColor(199, 210, 254);
        doc.line(14 + (idx + 1) * pColW, currentY + 4, 14 + (idx + 1) * pColW, currentY + 20);
      }
    });

    currentY += 31;

    // Parecer Financeiro
    checkPageBreak(25);
    doc.setFillColor(THEME_PAYBACK[0], THEME_PAYBACK[1], THEME_PAYBACK[2]);
    doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("AVALIAÇÃO DE VIABILIDADE", 20, currentY + 5);
    currentY += 9;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 20, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(payload.viable !== false ? 5 : 185, payload.viable !== false ? 150 : 28, payload.viable !== false ? 105 : 28);
    doc.text(`EQUIPAMENTO: ${String(eqName || "EQUIPAMENTO").toUpperCase()} — ${payload.viable !== false ? "INVESTIMENTO VIÁVEL E ALTAMENTE RECOMENDADO" : "INVESTIMENTO DE LONGO PRAZO"}`, 18, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`A economia mensal acumulada cobrirá o custo total de aquisição em ${(pMonths / 12).toFixed(1)} anos (${pMonths} meses). A partir desse marco, todo o valor gerado é lucro líquido real no orçamento doméstico.`, 18, currentY + 14);

    currentY += 26;

    // Projeção Temporal
    checkPageBreak(30);
    doc.setFillColor(THEME_PAYBACK[0], THEME_PAYBACK[1], THEME_PAYBACK[2]);
    doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PROJEÇÃO TEMPORAL DE RETORNO (BREAK-EVEN)", 20, currentY + 5);
    currentY += 9;

    const timelinePoints = [0, 6, 12, 18, 24, 36, 48, 60];
    timelinePoints.forEach((m) => {
      checkPageBreak(10);
      const cumSavings = m * mSavings;
      const net = cumSavings - invest;

      doc.setFillColor(net >= 0 ? 240 : 255, net >= 0 ? 253 : 245, net >= 0 ? 244 : 245);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(14, currentY, 182, 9, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Mês ${m} (${(m / 12).toFixed(1)} ano${m >= 24 ? "s" : ""}):`, 18, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Economia Acumulada: ${formatBRL(cumSavings)}`, 75, currentY + 6);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(net >= 0 ? 5 : 185, net >= 0 ? 150 : 28, net >= 0 ? 105 : 28);
      doc.text(`Saldo Líquido: ${net >= 0 ? "+" : ""}${formatBRL(net)}`, 192, currentY + 6, { align: "right" });

      currentY += 10.5;
    });
  } else if (payload.type === "simulation") {
    const sc = payload.scenario;
    const scLabel = sc.label || sc.summaryTitle || "Cenário de Otimização de Hábitos";
    const scMonthlyKwh = sc.monthlyKwh ?? 0;
    const scSavingsKwh = sc.savingsKwh ?? 0;
    const scSavingsBrl = sc.savingsBrl ?? 0;
    const scMonthlyCost =
      sc.monthlyCost ??
      (sc.baseMonthlyBrl ? Math.max(0, sc.baseMonthlyBrl - scSavingsBrl) : 0);

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(14, currentY, 182, 24, 2.5, 2.5, "FD");

    const simMetrics = [
      { label: "Consumo Simulado", val: `${formatNumber(scMonthlyKwh)} kWh`, col: THEME_SIMULATION },
      { label: "Custo Simulado", val: formatBRL(scMonthlyCost), col: [15, 23, 42] as [number, number, number] },
      { label: "Economia Mensal", val: `${formatBRL(scSavingsBrl)}/mês`, col: [5, 150, 105] as [number, number, number] },
      { label: "Economia Anual", val: `${formatBRL(scSavingsBrl * 12)}/ano`, col: [5, 150, 105] as [number, number, number] },
    ];

    const sColW = 182 / simMetrics.length;
    simMetrics.forEach((m, idx) => {
      const colX = 14 + idx * sColW + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(String(m.label || "").toUpperCase(), colX, currentY + 7);

      doc.setFontSize(10.5);
      doc.setTextColor(m.col[0], m.col[1], m.col[2]);
      doc.text(m.val, colX, currentY + 16.5);

      if (idx < simMetrics.length - 1) {
        doc.setDrawColor(191, 219, 254);
        doc.line(14 + (idx + 1) * sColW, currentY + 4, 14 + (idx + 1) * sColW, currentY + 20);
      }
    });

    currentY += 31;

    // Resumo
    checkPageBreak(25);
    doc.setFillColor(THEME_SIMULATION[0], THEME_SIMULATION[1], THEME_SIMULATION[2]);
    doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`CENÁRIO TESTADO: ${String(scLabel).toUpperCase()}`, 20, currentY + 5);
    currentY += 9;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 18, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Redução estimada de ${formatNumber(Math.abs(scSavingsKwh))} kWh por mês através da readequação de uso dos aparelhos e corte de desperdícios em standby.`, 18, currentY + 10);
    currentY += 24;
  } else {
    // Dossiê Geral (App)
    const diags = payload.diagnoses || [];
    const bills = payload.bills || [];

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 24, 2.5, 2.5, "FD");

    const appMetrics = [
      { label: "Diagnósticos Salvos", val: `${diags.length} avaliações`, col: THEME_DIAGNOSIS },
      { label: "Faturas Auditadas", val: `${bills.length} contas`, col: THEME_BILL },
      { label: "Status Geral", val: "Consolidado", col: [15, 23, 42] as [number, number, number] },
      { label: "Plataforma", val: "Turn OFF", col: THEME_DIAGNOSIS },
    ];

    const aColW = 182 / appMetrics.length;
    appMetrics.forEach((m, idx) => {
      const colX = 14 + idx * aColW + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(String(m.label || "").toUpperCase(), colX, currentY + 7);

      doc.setFontSize(10.5);
      doc.setTextColor(m.col[0], m.col[1], m.col[2]);
      doc.text(m.val, colX, currentY + 16.5);

      if (idx < appMetrics.length - 1) {
        doc.setDrawColor(203, 213, 225);
        doc.line(14 + (idx + 1) * aColW, currentY + 4, 14 + (idx + 1) * aColW, currentY + 20);
      }
    });

    currentY += 31;

    // Listagem resumida
    checkPageBreak(25);
    doc.setFillColor(THEME_APP[0], THEME_APP[1], THEME_APP[2]);
    doc.roundedRect(14, currentY, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("HISTÓRICO RECENTE DE DIAGNÓSTICOS", 20, currentY + 5);
    currentY += 9;

    if (diags.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Nenhum diagnóstico salvo no histórico local.", 18, currentY + 5);
      currentY += 10;
    } else {
      diags.slice(0, 5).forEach((d, idx) => {
        checkPageBreak(12);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(14, currentY, 182, 10, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        const activeCount = (d.input.appliances || []).filter((a) => a.present !== false).length;
        doc.text(`${idx + 1}. Diagnóstico Residencial (${d.input.occupants || 1} pessoas, ${activeCount} aparelhos)`, 18, currentY + 6);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(THEME_DIAGNOSIS[0], THEME_DIAGNOSIS[1], THEME_DIAGNOSIS[2]);
        doc.text(`${formatNumber(d.result.totalEstimated)} kWh/mês (${formatBRL(d.input.billValue)})`, 192, currentY + 6, { align: "right" });

        currentY += 12;
      });
    }
  }

  // 3. Numeração de Páginas e Rodapé Fixo em todas as páginas geradas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 284, 196, 284);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Turn OFF • Plataforma de Eficiência Energética Residencial • Processado 100% no dispositivo", 14, 289);
    doc.text(`Página ${p} de ${totalPages}`, 196, 289, { align: "right" });
  }

  const pdfBlob = doc.output("blob");
  return { blob: pdfBlob, filename };
}

/**
 * Dispara o download de PDF estático sem tocar na DOM e sem dependência de html2canvas.
 * Execução instantânea em memória, 100% livre de travamentos ou interferência na viewport.
 */
export async function downloadPdfReport(payload: ReportPayload): Promise<boolean> {
  try {
    const { blob, filename } = await generateStaticPdfBlob(payload);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return true;
  } catch (error) {
    console.error("Falha ao gerar PDF estático em memória:", error);
    return false;
  }
}

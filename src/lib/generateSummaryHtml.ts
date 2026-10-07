import { SavedDiagnosis, BillScanRecord } from '../types';
import { formatBRL, formatNumber } from './energy';

export function generateSummaryHtml(diagnoses: SavedDiagnosis[], bills: BillScanRecord[]) {
  const latestDiag = diagnoses[0];
  const totalBills = bills.length;
  
  let html = `
    <div style="font-family: sans-serif; padding: 40px; color: #1e293b;">
      <h1 style="color: #047857; margin-bottom: 5px;">Relatório Geral - Turn OFF</h1>
      <p style="color: #64748b; margin-top: 0; margin-bottom: 30px;">Eficiência Energética Residencial</p>
      
      <div style="margin-bottom: 30px;">
        <h2 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Faturas Lidas</h2>
        <p>Total de contas escaneadas: <strong>${totalBills}</strong></p>
  `;
  
  if (totalBills > 0) {
    const latestBill = bills[0].bill;
    html += `
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
          <p style="margin: 0;">Última conta lida: <strong>${latestBill.mes_referencia || 'Atual'}</strong></p>
          <p style="margin: 5px 0;">Consumo Faturado: <strong>${latestBill.consumo_kwh ?? 0} kWh</strong></p>
          <p style="margin: 5px 0;">Valor: <strong>${formatBRL(latestBill.valor_total || 0)}</strong></p>
        </div>
    `;
  }
  
  html += `
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Diagnóstico Energético</h2>
  `;
  
  if (latestDiag) {
    html += `
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
          <p style="margin: 0;">Total Estimado: <strong>${formatNumber(latestDiag.result.totalEstimated)} kWh/mês</strong></p>
          <p style="margin: 5px 0;">Vilão do Consumo: <strong>${latestDiag.result.topContributors?.[0]?.label || latestDiag.result.attention?.label || 'N/A'}</strong></p>
          <h4 style="margin: 15px 0 5px;">Principais Recomendações:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${latestDiag.result.recommendations?.slice(0, 3).map(r => `<li>${r.title}</li>`).join('')}
          </ul>
        </div>
    `;
  } else {
    html += `<p>Nenhum diagnóstico salvo ainda.</p>`;
  }
  
  html += `
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px;">Gerado automaticamente pelo aplicativo Turn OFF.</p>
    </div>
  `;
  
  return html;
}

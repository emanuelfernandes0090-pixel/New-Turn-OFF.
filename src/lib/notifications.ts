import { loadBillScans } from './storage';
import { BillScanRecord } from '../types';

const NOTIFICATIONS_KEY = "@turnoff_notifications_sent";

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export function checkUpcomingBills() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const bills = loadBillScans();
  const sent = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "{}");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  bills.forEach(scan => {
    if (!scan.bill.vencimento || !scan.bill.lembrete_vencimento) return;
    
    // Parse vencimento (assuming DD/MM/YYYY or YYYY-MM-DD format)
    let dueDate: Date | null = null;
    const parts = scan.bill.vencimento.split('/');
    if (parts.length === 3) {
      dueDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    } else {
      dueDate = new Date(scan.bill.vencimento);
    }
    
    if (isNaN(dueDate.getTime())) return;
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 2) {
      const notificationId = `bill_${scan.id}_${diffDays}`;
      if (!sent[notificationId]) {
        let message = "";
        if (diffDays === 2) message = `Faltam 2 dias para o vencimento da sua conta de luz.`;
        if (diffDays === 1) message = `Sua conta de luz vence amanhã!`;
        if (diffDays === 0) message = `Sua conta de luz vence HOJE!`;
        
        new Notification("Turn OFF - Lembrete", {
          body: message,
          icon: "/icon.png"
        });
        
        sent[notificationId] = true;
      }
    }
  });
  
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(sent));
}

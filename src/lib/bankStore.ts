import type { BankDashboard } from './csvParser';

const KEY = 'bank_dashboard_v1';

export function saveDashboard(data: BankDashboard): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full — ignore
  }
}

export function loadDashboard(): BankDashboard | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Rehydrate Date objects
    parsed.transactions = parsed.transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
    }));
    return parsed as BankDashboard;
  } catch {
    return null;
  }
}

export function clearDashboard(): void {
  localStorage.removeItem(KEY);
}

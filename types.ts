export interface MonthlyRevenue {
  id?: number;
  month: string;
  year: number;
  revenue: number;
  opco: number;
  sabrina: number;
  giovani: number;
  gabriella: number;
  isHighlight?: boolean;
}

export interface ClientData {
  rank: number;
  name: string;
  revenue: number;
  percentage: number;
}

export interface OperatorPayout {
  name: string;
  total: number;
  percentage: number;
}

export interface DashboardKPIs {
  totalRevenue: number;
  bestMonth: { month: string; value: number };
  monthlyAverage: number;
  totalPayouts: number;
  yoyGrowth: number;
}

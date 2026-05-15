import { MonthlyRevenue, ClientData, OperatorPayout, DashboardKPIs } from './types';

export const KPIS: DashboardKPIs = {
  totalRevenue: 5643434.24,
  bestMonth: { month: 'Out/25', value: 2388611.98 },
  monthlyAverage: 512948,
  totalPayouts: 640125.26,
  yoyGrowth: -74.0,
};

export const REVENUE_DATA: MonthlyRevenue[] = [
  { month: 'Abr/25', year: 2025, revenue: 202379.73, opco: 16935.77, sabrina: 2415.41, giovani: 2415.41, gabriella: 0 },
  { month: 'Mai/25', year: 2025, revenue: 77359.85, opco: 6790.93, sabrina: 943.19, giovani: 943.19, gabriella: 0 },
  { month: 'Jun/25', year: 2025, revenue: 65200.59, opco: 7359.46, sabrina: 1378.30, giovani: 1378.30, gabriella: 0 },
  { month: 'Set/25', year: 2025, revenue: 282971.13, opco: 19295.37, sabrina: 2679.91, giovani: 2679.91, gabriella: 0 },
  { month: 'Out/25', year: 2025, revenue: 2388611.98, opco: 293437.50, sabrina: 6509.74, giovani: 6509.74, gabriella: 45266.70, isHighlight: true },
  { month: 'Nov/25', year: 2025, revenue: 646377.67, opco: 42804.69, sabrina: 6575.95, giovani: 6575.95, gabriella: 0 },
  { month: 'Dez/25', year: 2025, revenue: 262303.84, opco: 18051.47, sabrina: 2507.15, giovani: 2507.15, gabriella: 0 },
  { month: 'Fev/26', year: 2026, revenue: 174867.23, opco: 9504.93, sabrina: 1320.13, giovani: 1320.13, gabriella: 0 },
  { month: 'Fev/26C', year: 2026, revenue: 1068875.70, opco: 57688.72, sabrina: 8884.81, giovani: 8884.81, gabriella: 15704.73 },
  { month: 'Mar/26', year: 2026, revenue: 105050.89, opco: 9996.60, sabrina: 1388.42, giovani: 1388.42, gabriella: 0 },
  { month: 'Abr/26', year: 2026, revenue: 369435.63, opco: 21977.52, sabrina: 3052.43, giovani: 3052.43, gabriella: 0 },
];

export const CLIENT_DATA: ClientData[] = [
  { rank: 1, name: 'JAPAN GRACE CO LTD', revenue: 2044324.54, percentage: 60.5 },
  { rank: 2, name: 'GEBECO', revenue: 1171416.45, percentage: 34.7 },
  { rank: 3, name: 'IKARUS TOURS GMBH', revenue: 358584.31, percentage: 10.6 },
  { rank: 4, name: 'PHOENIX REISEN', revenue: 240245.95, percentage: 7.1 },
  { rank: 5, name: 'DREAMLINES', revenue: 154226.00, percentage: 4.6 },
];

export const OPERATOR_DATA: OperatorPayout[] = [
  { name: 'OPCO', total: 503842.95, percentage: 78.7 },
  { name: 'SABRINA', total: 37655.44, percentage: 5.9 },
  { name: 'GIOVANI', total: 37655.44, percentage: 5.9 },
  { name: 'GABRIELLA', total: 60971.43, percentage: 9.5 },
];

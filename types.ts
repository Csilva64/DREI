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
  organizationId?: string;
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

export interface Organization {
  id: string;
  slug: string;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  suspendedAt?: string | null;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
}

export interface OrganizationBranding {
  organizationId: string;
  companyName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  locale: string;
  currency: string;
  customDomain?: string | null;
}

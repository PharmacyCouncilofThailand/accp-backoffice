export type ReportTab = 'overview' | 'attendance' | 'registrations' | 'finance';

export interface CountryStats {
    total: number;
    withCountry: number;
    unknown: number;
    byCountry: { country: string; count: number }[];
}

export interface AddonStats {
    total: number;
    gala: number;
    workshop: number;
    ticketOnly: number;
}

export interface CheckinStats {
    total: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
    duplicateScans?: number;
    sessionBreakdown?: SessionBreakdownItem[];
}

export interface SessionBreakdownItem {
    sessionId: number;
    sessionName: string;
    sessionType: string | null;
    room: string | null;
    startTime: string;
    endTime: string;
    total: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
}

export interface MemberStats {
    total: number;
    active: number;
    pending: number;
    rejected: number;
}

export interface AbstractStats {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
}

export interface FinanceStats {
    totalRevenue: number;
    orderCount: number;
    currency: string;
    byTicket: { ticketName: string; count: number; amount: number }[];
}

export interface ReportsData {
    countryStats: CountryStats | null;
    addonStats: AddonStats | null;
    checkinStats: CheckinStats | null;
    memberStats: MemberStats | null;
    abstractStats: AbstractStats | null;
    financeStats: FinanceStats | null;
    registrationTrend: RegistrationTrendPoint[];
}

export interface RegistrationTrendPoint {
    date: string;
    count: number;
}

export interface ReportsOverviewResponse {
    generatedAt: string;
    eventId: number;
    countryStats: CountryStats;
    addonStats: AddonStats;
    checkinStats: CheckinStats;
    memberStats: MemberStats;
    abstractStats: AbstractStats;
    financeStats: FinanceStats;
    registrationTrend: { points: RegistrationTrendPoint[] };
}

export interface EventOption {
    id: number;
    name: string;
    code?: string;
}

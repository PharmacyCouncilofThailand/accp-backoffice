import { api } from '@/lib/api';
import { getBackofficeToken } from './token';

export type ExportType =
    | 'registrations'
    | 'orders'
    | 'members'
    | 'checkins'
    | 'abstracts'
    | 'sessions';

export interface ExportOptions {
    eventId?: number;
    sessionId?: number;
    status?: 'accepted' | 'pending' | 'rejected';
    presentationType?: 'oral' | 'poster';
}

export async function downloadReportExport(
    type: ExportType,
    opts?: ExportOptions
): Promise<void> {
    const token = getBackofficeToken();
    await api.reports.downloadExport(token, type, opts);
}

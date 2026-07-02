import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getBackofficeToken } from '../lib/token';
import type { ReportsData } from '../types';

const emptyData: ReportsData = {
    countryStats: null,
    addonStats: null,
    checkinStats: null,
    memberStats: null,
    abstractStats: null,
    financeStats: null,
    registrationTrend: [],
};

export function useReportsData(eventId: number | null) {
    const [data, setData] = useState<ReportsData>(emptyData);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!eventId) {
            setData(emptyData);
            setGeneratedAt(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        const token = getBackofficeToken();

        try {
            const res = await api.reports.overview(token, eventId);
            const overview = res.data;

            setData({
                countryStats: overview.countryStats,
                addonStats: overview.addonStats,
                checkinStats: overview.checkinStats,
                memberStats: overview.memberStats,
                abstractStats: overview.abstractStats,
                financeStats: overview.financeStats,
                registrationTrend: overview.registrationTrend?.points ?? [],
            });
            setGeneratedAt(overview.generatedAt);
        } catch (err) {
            console.error('Failed to load reports:', err);
            setError('Failed to load report data');
            setData(emptyData);
            setGeneratedAt(null);
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        load();
    }, [load]);

    return { data, isLoading, error, generatedAt, refresh: load };
}

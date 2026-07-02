'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { IconRefresh, IconLoader2, IconCalendarEvent } from '@tabler/icons-react';
import type { Session } from '@/types/api';
import type { EventOption, ReportTab } from './types';
import { useReportsData } from './hooks/useReportsData';
import { getBackofficeToken } from './lib/token';
import { ReportsKpiRow } from './components/ReportsKpiRow';
import { ReportsTabs } from './components/ReportsTabs';
import { OverviewPanel } from './components/OverviewPanel';
import { AttendancePanel } from './components/AttendancePanel';
import { RegistrationsPanel } from './components/RegistrationsPanel';
import { FinancePanel } from './components/FinancePanel';
import { ExportCenter } from './components/ExportCenter';

export default function ReportsPage() {
    const { currentEvent, setCurrentEvent, isAdmin, getAccessibleEventIds } = useAuth();
    const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(currentEvent?.id ?? null);
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);

    const { data, isLoading, error, generatedAt, refresh } = useReportsData(selectedEventId);

    const selectedEventName =
        eventOptions.find((e) => e.id === selectedEventId)?.name ||
        currentEvent?.name ||
        'Event';

    useEffect(() => {
        let cancelled = false;

        async function loadEvents() {
            setIsLoadingEvents(true);
            try {
                const token = getBackofficeToken();
                const res = await api.backofficeEvents.list(token, 'limit=100');
                let opts = (res.events as Record<string, unknown>[]).map((e) => ({
                    id: e.id as number,
                    name: e.eventName as string,
                    code: e.eventCode as string,
                }));

                if (!isAdmin) {
                    const allowed = new Set(getAccessibleEventIds());
                    opts = opts.filter((e) => allowed.has(e.id));
                }

                if (cancelled) return;
                setEventOptions(opts);

                if (opts.length > 0) {
                    setSelectedEventId((prev) => {
                        if (prev && opts.some((e) => e.id === prev)) return prev;
                        if (currentEvent?.id && opts.some((e) => e.id === currentEvent.id)) {
                            return currentEvent.id;
                        }
                        return opts[0].id;
                    });
                }
            } catch (err) {
                console.error('Failed to load events:', err);
            } finally {
                if (!cancelled) setIsLoadingEvents(false);
            }
        }

        loadEvents();
        return () => {
            cancelled = true;
        };
    }, [isAdmin, getAccessibleEventIds, currentEvent?.id]);

    useEffect(() => {
        if (!selectedEventId || eventOptions.length === 0) return;
        const match = eventOptions.find((e) => e.id === selectedEventId);
        if (match && currentEvent?.id !== match.id) {
            setCurrentEvent({ id: match.id, code: match.code || '', name: match.name });
        }
    }, [selectedEventId, eventOptions, currentEvent?.id, setCurrentEvent]);

    useEffect(() => {
        if (!selectedEventId) {
            setSessions([]);
            return;
        }

        const token = getBackofficeToken();
        api.sessions
            .list(token, `eventId=${selectedEventId}&limit=100`)
            .then((res) => setSessions(res.sessions))
            .catch(() => setSessions([]));
    }, [selectedEventId]);

    const handleEventChange = (eventId: string) => {
        const id = Number(eventId);
        setSelectedEventId(id);
        const match = eventOptions.find((e) => e.id === id);
        if (match) {
            setCurrentEvent({ id: match.id, code: match.code || '', name: match.name });
        }
    };

    const pageTitle = selectedEventId
        ? `Reports: ${selectedEventName}`
        : 'Reports & Analytics';

    return (
        <AdminLayout title={pageTitle}>
            {/* Header controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <IconCalendarEvent size={20} className="text-gray-400 shrink-0" />
                    <select
                        value={selectedEventId ?? ''}
                        onChange={(e) => handleEventChange(e.target.value)}
                        className="input-field flex-1 md:w-64"
                        disabled={isLoadingEvents || eventOptions.length === 0}
                    >
                        {eventOptions.length === 0 ? (
                            <option value="">No events available</option>
                        ) : (
                            eventOptions.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <button
                    onClick={refresh}
                    disabled={isLoading || !selectedEventId}
                    className="btn-secondary flex items-center gap-2"
                >
                    {isLoading ? (
                        <IconLoader2 size={18} className="animate-spin" />
                    ) : (
                        <IconRefresh size={18} />
                    )}
                    Refresh
                </button>
            </div>

            {!selectedEventId && !isLoadingEvents ? (
                <div className="card py-16 text-center">
                    <IconCalendarEvent size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Select an event to view reports</p>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {generatedAt && (
                        <p className="text-xs text-gray-400 mb-4">
                            Last updated: {new Date(generatedAt).toLocaleString('th-TH')}
                        </p>
                    )}

                    <ReportsKpiRow data={data} isLoading={isLoading} />

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        <div className="xl:col-span-7">
                            <ReportsTabs active={activeTab} onChange={setActiveTab} />
                            {activeTab === 'overview' && (
                                <OverviewPanel data={data} isLoading={isLoading} />
                            )}
                            {activeTab === 'attendance' && (
                                <AttendancePanel data={data} isLoading={isLoading} />
                            )}
                            {activeTab === 'registrations' && selectedEventId && (
                                <RegistrationsPanel
                                    data={data}
                                    isLoading={isLoading}
                                    eventId={selectedEventId}
                                />
                            )}
                            {activeTab === 'finance' && (
                                <FinancePanel data={data} isLoading={isLoading} />
                            )}
                        </div>

                        <div className="xl:col-span-5">
                            <ExportCenter
                                eventId={selectedEventId}
                                data={data}
                                sessions={sessions}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}

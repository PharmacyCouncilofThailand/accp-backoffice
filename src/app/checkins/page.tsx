'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import { getFullName } from '@/lib/name';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/common';
import { downloadReportExport } from '@/app/reports/lib/exports';
import toast from 'react-hot-toast';
import {
    IconScan,
    IconSearch,
    IconRefresh,
    IconLoader2,
    IconDownload,
    IconCalendarEvent,
    IconCheck,
    IconClock,
    IconAlertTriangle,
    IconUsers,
} from '@tabler/icons-react';

interface CheckinRow {
    id: number;
    scannedAt: string;
    regCode: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    email: string;
    ticketName: string | null;
    sessionName: string | null;
    eventName: string | null;
    scannedBy: { firstName?: string; lastName?: string } | null;
}

interface SessionBreakdownItem {
    sessionId: number;
    sessionName: string;
    room: string | null;
    total: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
}

interface Stats {
    total: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
    duplicateScans?: number;
    sessionBreakdown?: SessionBreakdownItem[];
}

const getBackofficeToken = () =>
    localStorage.getItem('backoffice_token') ||
    sessionStorage.getItem('backoffice_token') ||
    '';

export default function CheckinsPage() {
    const { currentEvent, setCurrentEvent, isAdmin, getAccessibleEventIds } = useAuth();

    const [eventOptions, setEventOptions] = useState<{ id: number; name: string; code: string }[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(currentEvent?.id ?? null);
    const [sessionOptions, setSessionOptions] = useState<{ id: number; name: string }[]>([]);
    const [sessionFilter, setSessionFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [checkins, setCheckins] = useState<CheckinRow[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        let cancelled = false;
        const token = getBackofficeToken();

        api.backofficeEvents.list(token, 'limit=100').then((res) => {
            if (cancelled) return;
            let opts = (res.events as Record<string, unknown>[]).map((e) => ({
                id: e.id as number,
                name: e.eventName as string,
                code: e.eventCode as string,
            }));
            if (!isAdmin) {
                const allowed = new Set(getAccessibleEventIds());
                opts = opts.filter((e) => allowed.has(e.id));
            }
            setEventOptions(opts);
            if (opts.length > 0) {
                setSelectedEventId((prev) => {
                    if (prev && opts.some((e) => e.id === prev)) return prev;
                    if (currentEvent?.id && opts.some((e) => e.id === currentEvent.id)) return currentEvent.id;
                    return opts[0].id;
                });
            }
        }).catch(() => {});

        return () => { cancelled = true; };
    }, [isAdmin, getAccessibleEventIds, currentEvent?.id]);

    useEffect(() => {
        if (!selectedEventId || eventOptions.length === 0) return;
        const match = eventOptions.find((e) => e.id === selectedEventId);
        if (match && currentEvent?.id !== match.id) {
            setCurrentEvent({ id: match.id, code: match.code, name: match.name });
        }
    }, [selectedEventId, eventOptions, currentEvent?.id, setCurrentEvent]);

    useEffect(() => {
        if (!selectedEventId) {
            setSessionOptions([]);
            setSessionFilter('');
            return;
        }
        const token = getBackofficeToken();
        api.sessions.list(token, `eventId=${selectedEventId}&limit=100`).then((res) => {
            setSessionOptions(
                res.sessions.map((s) => ({ id: s.id, name: s.sessionName }))
            );
        }).catch(() => setSessionOptions([]));
        setSessionFilter('');
        setPage(1);
    }, [selectedEventId]);

    const fetchData = useCallback(async () => {
        if (!selectedEventId) {
            setCheckins([]);
            setStats(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const token = getBackofficeToken();
        const params = new URLSearchParams({
            page: String(page),
            limit: '15',
            eventId: String(selectedEventId),
        });
        if (sessionFilter) params.set('sessionId', sessionFilter);
        if (debouncedSearch) params.set('search', debouncedSearch);

        try {
            const [listRes, statsRes] = await Promise.all([
                api.checkins.list(token, params.toString()),
                api.checkins.stats(token, `eventId=${selectedEventId}${sessionFilter ? `&sessionId=${sessionFilter}` : ''}`),
            ]);

            setCheckins(listRes.checkins as CheckinRow[]);
            setTotalPages(listRes.pagination.totalPages);
            setTotalCount(listRes.pagination.total);
            setStats(statsRes as Stats);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch check-ins:', err);
            toast.error('Failed to load check-in data');
        } finally {
            setIsLoading(false);
        }
    }, [selectedEventId, sessionFilter, debouncedSearch, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = async () => {
        if (!selectedEventId) return;
        setIsExporting(true);
        try {
            await downloadReportExport('checkins', { eventId: selectedEventId });
            toast.success('Export downloaded');
        } catch {
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const selectedEventName = eventOptions.find((e) => e.id === selectedEventId)?.name || 'Event';
    const sessions = stats?.sessionBreakdown || [];

    return (
        <AdminLayout title="Attendance Log">
            {/* Ops header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-900 text-white mb-6 px-6 py-5">
                <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_70%_20%,#34d399_0%,transparent_50%)]" />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-emerald-300/80 text-xs font-semibold uppercase tracking-widest mb-1">
                            Operations · Live Attendance
                        </p>
                        <h2 className="text-xl font-bold">{selectedEventName}</h2>
                        {lastUpdated && (
                            <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Updated {lastUpdated.toLocaleTimeString('th-TH')}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/checkin" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors">
                            <IconScan size={18} /> Open Scanner
                        </Link>
                        <button onClick={fetchData} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors">
                            {isLoading ? <IconLoader2 size={18} className="animate-spin" /> : <IconRefresh size={18} />}
                            Refresh
                        </button>
                        <button onClick={handleExport} disabled={!selectedEventId || isExporting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors disabled:opacity-50">
                            {isExporting ? <IconLoader2 size={18} className="animate-spin" /> : <IconDownload size={18} />}
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Event</label>
                        <select
                            value={selectedEventId ?? ''}
                            onChange={(e) => { setSelectedEventId(Number(e.target.value)); setPage(1); }}
                            className="input-field w-full"
                        >
                            {eventOptions.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Session</label>
                        <select
                            value={sessionFilter}
                            onChange={(e) => { setSessionFilter(e.target.value); setPage(1); }}
                            className="input-field w-full"
                        >
                            <option value="">All sessions</option>
                            {sessionOptions.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Search</label>
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Name or reg code..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="input-field-search w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard icon={IconUsers} label="Total Slots" value={stats.total} tone="slate" />
                    <StatCard icon={IconCheck} label="Checked In" value={stats.checkedIn} tone="emerald" />
                    <StatCard icon={IconClock} label="Remaining" value={stats.remaining} tone="amber" />
                    <StatCard icon={IconAlertTriangle} label="Duplicate Scans" value={stats.duplicateScans ?? 0} tone="orange" />
                    <div className="card py-4 flex flex-col items-center justify-center col-span-2 lg:col-span-1">
                        <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="15.5" fill="none"
                                    stroke="#10b981" strokeWidth="3"
                                    strokeDasharray={`${stats.percentage} 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-600">
                                {stats.percentage}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Check-in Rate</p>
                    </div>
                </div>
            )}

            {/* Session breakdown */}
            {sessions.length > 0 && (
                <div className="card mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <IconCalendarEvent size={16} className="text-emerald-600" />
                        By Session
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {sessions.map((s) => {
                            const active = sessionFilter === String(s.sessionId);
                            return (
                                <button
                                    key={s.sessionId}
                                    onClick={() => {
                                        setSessionFilter(active ? '' : String(s.sessionId));
                                        setPage(1);
                                    }}
                                    className={`text-left px-3 py-2 rounded-xl border text-sm transition-all ${
                                        active
                                            ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="font-medium text-gray-800 block truncate max-w-[200px]">{s.sessionName}</span>
                                    <span className="text-xs text-gray-500">
                                        {s.checkedIn}/{s.total}
                                        <span className={`ml-1 font-semibold ${s.percentage >= 90 ? 'text-emerald-600' : 'text-gray-600'}`}>
                                            ({s.percentage}%)
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="px-4 py-3 font-semibold">Reg Code</th>
                                <th className="px-4 py-3 font-semibold">Attendee</th>
                                <th className="px-4 py-3 font-semibold hidden md:table-cell">Ticket</th>
                                <th className="px-4 py-3 font-semibold">Session</th>
                                <th className="px-4 py-3 font-semibold">Checked In</th>
                                <th className="px-4 py-3 font-semibold hidden lg:table-cell">By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                                        <IconLoader2 size={28} className="animate-spin mx-auto mb-2" />
                                        Loading...
                                    </td>
                                </tr>
                            ) : checkins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                                        No check-ins found
                                    </td>
                                </tr>
                            ) : (
                                checkins.map((row) => (
                                    <tr key={row.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-emerald-700 font-medium">{row.regCode}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-800">
                                                {getFullName(row.firstName, row.middleName, row.lastName)}
                                            </p>
                                            <p className="text-xs text-gray-400 md:hidden">{row.ticketName}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{row.ticketName || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{row.sessionName || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                            {new Date(row.scannedAt).toLocaleString('th-TH')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                                            {row.scannedBy?.firstName
                                                ? getFullName(row.scannedBy.firstName, null, row.scannedBy.lastName || '')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={15}
                    onPageChange={setPage}
                    itemName="check-ins"
                    hideIfSinglePage
                />
            </div>
        </AdminLayout>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof IconCheck;
    label: string;
    value: number;
    tone: 'slate' | 'emerald' | 'amber' | 'orange';
}) {
    const tones = {
        slate: 'bg-slate-50 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        orange: 'bg-orange-50 text-orange-700',
    };
    const iconTones = {
        slate: 'text-slate-500',
        emerald: 'text-emerald-500',
        amber: 'text-amber-500',
        orange: 'text-orange-500',
    };

    return (
        <div className="card py-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
                    <Icon size={20} className={iconTones[tone]} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

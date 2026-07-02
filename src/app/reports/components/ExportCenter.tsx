'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconDownload, IconLoader2, IconDatabaseExport } from '@tabler/icons-react';
import { downloadReportExport, type ExportType } from '../lib/exports';
import type { ReportsData } from '../types';
import type { Session } from '@/types/api';

interface ExportCenterProps {
    eventId: number | null;
    data: ReportsData;
    sessions: Session[];
    disabled?: boolean;
}

type LoadingKey = ExportType | 'abstracts-filtered';

export function ExportCenter({ eventId, data, sessions, disabled }: ExportCenterProps) {
    const [loadingKey, setLoadingKey] = useState<LoadingKey | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [abstractStatus, setAbstractStatus] = useState<'' | 'accepted' | 'pending' | 'rejected'>('');
    const [abstractPresentationType, setAbstractPresentationType] = useState<'' | 'oral' | 'poster'>('');

    const checkedIn = data.checkinStats?.checkedIn ?? 0;
    const duplicateScans = data.checkinStats?.duplicateScans ?? 0;

    const runExport = async (
        key: ExportType,
        opts?: { status?: 'accepted' | 'pending' | 'rejected'; presentationType?: 'oral' | 'poster' }
    ) => {
        if (key !== 'members' && !eventId) {
            toast.error('Please select an event first');
            return;
        }

        if (key === 'sessions' && !selectedSessionId) {
            toast.error('Please select a session');
            return;
        }

        if (opts?.presentationType && opts.status !== 'accepted') {
            toast.error('Presentation type filter requires Accepted status');
            return;
        }

        setLoadingKey(key);
        try {
            await downloadReportExport(key, {
                eventId: eventId ?? undefined,
                sessionId: key === 'sessions' ? Number(selectedSessionId) : undefined,
                status: opts?.status,
                presentationType: opts?.presentationType,
            });
            toast.success('Export downloaded');
        } catch (err) {
            console.error('Export failed:', err);
            toast.error(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setLoadingKey(null);
        }
    };

    const exportAbstracts = async () => {
        const status = abstractStatus || undefined;
        const presentationType =
            abstractStatus === 'accepted' && abstractPresentationType
                ? abstractPresentationType
                : undefined;
        setLoadingKey('abstracts-filtered');
        try {
            await downloadReportExport('abstracts', {
                eventId: eventId ?? undefined,
                status,
                presentationType,
            });
            toast.success('Export downloaded');
        } catch (err) {
            console.error('Export failed:', err);
            toast.error(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setLoadingKey(null);
        }
    };

    return (
        <div className="card lg:sticky lg:top-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <IconDatabaseExport size={20} className="text-blue-600" />
                Export Center
            </h3>
            <p className="text-xs text-gray-400 mb-4">Server-side CSV downloads</p>

            <div className="space-y-3">
                {/* Registrations */}
                <ExportCard
                    title="Registrations"
                    description="Confirmed registrants with ticket and contact info"
                    count={data.addonStats?.total ?? null}
                    loading={loadingKey === 'registrations'}
                    disabled={disabled || !eventId}
                    onExport={() => runExport('registrations')}
                />

                {/* Orders */}
                <ExportCard
                    title="Orders"
                    description="Paid orders with payment and item details"
                    count={data.financeStats?.orderCount ?? null}
                    loading={loadingKey === 'orders'}
                    disabled={disabled || !eventId}
                    onExport={() => runExport('orders')}
                />

                {/* Members */}
                <ExportCard
                    title="Members"
                    description="All member accounts (global)"
                    count={data.memberStats?.total ?? null}
                    loading={loadingKey === 'members'}
                    disabled={disabled}
                    onExport={() => runExport('members')}
                />

                {/* Check-ins */}
                <ExportCard
                    title="Check-ins"
                    description={
                        duplicateScans > 0
                            ? `Checked-in records · ${duplicateScans.toLocaleString()} duplicate scan${duplicateScans === 1 ? '' : 's'}`
                            : 'Scanned attendance records'
                    }
                    count={checkedIn}
                    loading={loadingKey === 'checkins'}
                    disabled={disabled || !eventId}
                    onExport={() => runExport('checkins')}
                />

                {/* Abstracts */}
                <div className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-sm">Abstracts</p>
                            <p className="text-xs text-gray-400 mt-0.5">Submitted abstracts with author info</p>
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">
                            {(data.abstractStats?.total ?? 0).toLocaleString()}
                        </span>
                    </div>
                    <select
                        value={abstractStatus}
                        onChange={(e) => {
                            const val = e.target.value as typeof abstractStatus;
                            setAbstractStatus(val);
                            if (val !== 'accepted') setAbstractPresentationType('');
                        }}
                        className="input-field w-full text-sm mb-2"
                        disabled={disabled || !eventId}
                    >
                        <option value="">All statuses</option>
                        <option value="accepted">Accepted only</option>
                        <option value="pending">Pending only</option>
                        <option value="rejected">Rejected only</option>
                    </select>
                    {abstractStatus === 'accepted' && (
                        <select
                            value={abstractPresentationType}
                            onChange={(e) => setAbstractPresentationType(e.target.value as typeof abstractPresentationType)}
                            className="input-field w-full text-sm mb-2"
                            disabled={disabled || !eventId}
                        >
                            <option value="">All presentation types</option>
                            <option value="oral">Oral only</option>
                            <option value="poster">Poster only</option>
                        </select>
                    )}
                    <button
                        onClick={exportAbstracts}
                        disabled={disabled || !eventId || loadingKey === 'abstracts-filtered'}
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
                    >
                        {loadingKey === 'abstracts-filtered' ? <IconLoader2 size={16} className="animate-spin" /> : <IconDownload size={16} />}
                        Export CSV
                    </button>
                </div>

                {/* Sessions */}
                <div className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-sm">Session Participants</p>
                            <p className="text-xs text-gray-400 mt-0.5">Per-session participant list</p>
                        </div>
                    </div>
                    {sessions.length > 0 && (
                        <select
                            value={selectedSessionId}
                            onChange={(e) => setSelectedSessionId(e.target.value)}
                            className="input-field w-full text-sm mb-2"
                            disabled={disabled || !eventId}
                        >
                            <option value="">Select session…</option>
                            {sessions.map((s) => (
                                <option key={s.id} value={String(s.id)}>
                                    {s.sessionName} ({s.sessionCode})
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => runExport('sessions')}
                        disabled={disabled || !eventId || loadingKey === 'sessions' || sessions.length === 0}
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
                    >
                        {loadingKey === 'sessions' ? <IconLoader2 size={16} className="animate-spin" /> : <IconDownload size={16} />}
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExportCard({
    title,
    description,
    count,
    loading,
    disabled,
    onExport,
}: {
    title: string;
    description: string;
    count: number | null;
    loading: boolean;
    disabled?: boolean;
    onExport: () => void;
}) {
    return (
        <div className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </div>
                {count !== null && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">
                        {count.toLocaleString()}
                    </span>
                )}
            </div>
            <button
                onClick={onExport}
                disabled={disabled || loading}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
            >
                {loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconDownload size={16} />}
                Export CSV
            </button>
        </div>
    );
}

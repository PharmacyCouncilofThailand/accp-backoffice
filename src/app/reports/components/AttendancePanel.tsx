'use client';

import { IconCalendarEvent } from '@tabler/icons-react';
import type { ReportsData } from '../types';

interface AttendancePanelProps {
    data: ReportsData;
    isLoading: boolean;
}

export function AttendancePanel({ data, isLoading }: AttendancePanelProps) {
    if (isLoading) {
        return (
            <div className="card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-8 bg-gray-100 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    const checkin = data.checkinStats;
    const sessions = checkin?.sessionBreakdown || [];

    if (!checkin) {
        return <EmptyState message="No attendance data available" />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Slots" value={checkin.total} color="text-gray-800" />
                <StatCard label="Checked In" value={checkin.checkedIn} color="text-green-600" />
                <StatCard label="Remaining" value={checkin.remaining} color="text-amber-600" />
                <StatCard
                    label="Duplicate Scans"
                    value={checkin.duplicateScans ?? 0}
                    color="text-orange-600"
                />
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <IconCalendarEvent size={20} className="text-blue-600" />
                        Check-in by Session
                    </h3>
                    <a href="/checkins" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                        View full log →
                    </a>
                </div>
                {sessions.length === 0 ? (
                    <EmptyState message="No session breakdown for this event" />
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => {
                            const percent = session.total > 0
                                ? Math.round((session.checkedIn / session.total) * 100)
                                : 0;
                            return (
                                <div key={session.sessionId}>
                                    <div className="flex items-center justify-between mb-1 gap-2">
                                        <span className="text-sm text-gray-600 truncate flex-1">
                                            {session.sessionName}
                                            {session.room && (
                                                <span className="text-gray-400 ml-1">· {session.room}</span>
                                            )}
                                        </span>
                                        <span className="text-sm font-medium text-gray-800 shrink-0">
                                            {session.checkedIn}/{session.total}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                percent >= 90
                                                    ? 'bg-green-500'
                                                    : percent >= 50
                                                      ? 'bg-blue-500'
                                                      : percent > 0
                                                        ? 'bg-yellow-500'
                                                        : 'bg-gray-300'
                                            }`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="card py-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="card py-12 text-center text-gray-400 text-sm">{message}</div>
    );
}

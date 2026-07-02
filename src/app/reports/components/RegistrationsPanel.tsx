'use client';

import Link from 'next/link';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    IconWorld,
    IconGlassFull,
    IconTool,
    IconTicket,
    IconExternalLink,
} from '@tabler/icons-react';
import type { ReportsData } from '../types';

interface RegistrationsPanelProps {
    data: ReportsData;
    isLoading: boolean;
    eventId: number;
}

export function RegistrationsPanel({ data, isLoading, eventId }: RegistrationsPanelProps) {
    if (isLoading) {
        return (
            <div className="card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
                <div className="h-64 bg-gray-100 rounded" />
            </div>
        );
    }

    const countryData = data.countryStats?.byCountry || [];
    const addon = data.addonStats;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    Confirmed registrations for the selected event
                </p>
                <Link
                    href={`/registrations?eventId=${eventId}`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    View all <IconExternalLink size={14} />
                </Link>
            </div>

            {addon && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <AddonCard icon={IconTicket} label="Total" value={addon.total} color="bg-blue-50 text-blue-700" />
                    <AddonCard icon={IconGlassFull} label="Gala" value={addon.gala} color="bg-purple-50 text-purple-700" />
                    <AddonCard icon={IconTool} label="Workshop" value={addon.workshop} color="bg-emerald-50 text-emerald-700" />
                    <AddonCard icon={IconTicket} label="Ticket Only" value={addon.ticketOnly} color="bg-gray-50 text-gray-700" />
                </div>
            )}

            <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <IconWorld size={20} className="text-blue-600" />
                    Country Distribution
                </h3>
                {countryData.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No country data</p>
                ) : (
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={countryData.slice(0, 15)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="country"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={70}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

function AddonCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: typeof IconTicket;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className={`card py-4 ${color}`}>
            <div className="flex items-center gap-3">
                <Icon size={22} />
                <div>
                    <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                    <p className="text-sm opacity-80">{label}</p>
                </div>
            </div>
        </div>
    );
}

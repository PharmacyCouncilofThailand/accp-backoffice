'use client';

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { IconUsers, IconGlassFull, IconCheck, IconTrendingUp } from '@tabler/icons-react';
import type { ReportsData } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

interface OverviewPanelProps {
    data: ReportsData;
    isLoading: boolean;
}

export function OverviewPanel({ data, isLoading }: OverviewPanelProps) {
    if (isLoading) {
        return <PanelSkeleton rows={2} />;
    }

    const countryData = (data.countryStats?.byCountry || []).slice(0, 10);
    const trendData = (data.registrationTrend || []).map((p) => ({
        ...p,
        label: p.date.slice(5), // MM-DD for compact axis
    }));
    const addonData = data.addonStats
        ? [
              { name: 'Gala', value: data.addonStats.gala },
              { name: 'Workshop', value: data.addonStats.workshop },
              { name: 'Ticket Only', value: data.addonStats.ticketOnly },
          ].filter((d) => d.value > 0)
        : [];

    const checkin = data.checkinStats;

    return (
        <div className="space-y-6">
            {checkin && checkin.total > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <IconCheck size={20} className="text-purple-600" />
                        Check-in Progress
                    </h3>
                    <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-gray-600">
                            {checkin.checkedIn.toLocaleString()} of {checkin.total.toLocaleString()} session slots
                        </span>
                        <span className="font-semibold text-gray-800">{checkin.percentage}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-purple-500 transition-all"
                            style={{ width: `${checkin.percentage}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <IconTrendingUp size={20} className="text-indigo-600" />
                        Registration Trend
                    </h3>
                    {trendData.length === 0 ? (
                        <EmptyChart message="No registration data yet" />
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorRegTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRegTrend)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <IconUsers size={20} className="text-blue-600" />
                        Registrations by Country
                    </h3>
                    {countryData.length === 0 ? (
                        <EmptyChart message="No country data for this event" />
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={countryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="country"
                                        width={100}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {data.countryStats && data.countryStats.unknown > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                            {data.countryStats.unknown} registrant(s) with unknown country
                        </p>
                    )}
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <IconGlassFull size={20} className="text-emerald-600" />
                        Add-on Breakdown
                    </h3>
                    {addonData.length === 0 ? (
                        <EmptyChart message="No add-on data for this event" />
                    ) : (
                        <div className="flex items-center gap-6 h-72">
                            <div className="w-44 h-44 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={addonData}
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {addonData.map((_, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-3">
                                {addonData.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span className="text-sm text-gray-600">{item.name}</span>
                                        </div>
                                        <span className="font-semibold text-gray-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{message}</div>
    );
}

function PanelSkeleton({ rows }: { rows: number }) {
    return (
        <div className="space-y-6">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
                    <div className="h-64 bg-gray-100 rounded" />
                </div>
            ))}
        </div>
    );
}

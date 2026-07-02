'use client';

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { IconCreditCard, IconReceipt } from '@tabler/icons-react';
import type { ReportsData } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

interface FinancePanelProps {
    data: ReportsData;
    isLoading: boolean;
}

export function FinancePanel({ data, isLoading }: FinancePanelProps) {
    if (isLoading) {
        return (
            <div className="card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
                <div className="h-64 bg-gray-100 rounded" />
            </div>
        );
    }

    const finance = data.financeStats;

    if (!finance) {
        return (
            <div className="card py-12 text-center text-gray-400 text-sm">
                No finance data available
            </div>
        );
    }

    const pieData = finance.byTicket.map((t) => ({
        name: t.ticketName,
        value: t.amount,
        count: t.count,
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <IconCreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">฿{finance.totalRevenue.toLocaleString()}</p>
                            <p className="text-emerald-100 text-sm">Total Revenue (Paid)</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                            <IconReceipt size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{finance.orderCount.toLocaleString()}</p>
                            <p className="text-gray-500 text-sm">Paid Orders</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Ticket Type</h3>
                {pieData.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No paid orders for this event</p>
                ) : (
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                        <div className="w-48 h-48 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number | undefined) => `฿${(value || 0).toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                            {finance.byTicket.map((item, index) => (
                                <div key={item.ticketName} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm text-gray-600 truncate">{item.ticketName}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="font-semibold text-gray-800">
                                            ฿{item.amount.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-2">({item.count} items)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import {
    IconCreditCard,
    IconUsers,
    IconCheck,
    IconFileText,
    IconUserCircle,
} from '@tabler/icons-react';
import type { ReportsData } from '../types';

interface ReportsKpiRowProps {
    data: ReportsData;
    isLoading: boolean;
}

function KpiSkeleton() {
    return (
        <div className="card py-4 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="space-y-2 flex-1">
                    <div className="h-6 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-100 rounded w-28" />
                </div>
            </div>
        </div>
    );
}

export function ReportsKpiRow({ data, isLoading }: ReportsKpiRowProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <KpiSkeleton key={i} />
                ))}
            </div>
        );
    }

    const revenue = data.financeStats?.totalRevenue ?? 0;
    const registrations = data.addonStats?.total ?? 0;
    const checkinRate = data.checkinStats?.percentage ?? 0;
    const checkedIn = data.checkinStats?.checkedIn ?? 0;
    const members = data.memberStats?.total ?? 0;
    const abstracts = data.abstractStats?.total ?? 0;

    const cards = [
        {
            label: 'Total Revenue',
            value: `฿${revenue.toLocaleString()}`,
            icon: IconCreditCard,
            accent: 'from-blue-500 to-blue-600 text-white',
            iconBg: 'bg-white/20 text-white',
            valueClass: 'text-white',
            labelClass: 'text-blue-100',
            featured: true,
        },
        {
            label: 'Registrations',
            value: registrations.toLocaleString(),
            icon: IconUsers,
            accent: '',
            iconBg: 'bg-green-100 text-green-600',
            valueClass: 'text-gray-800',
            labelClass: 'text-gray-500',
            featured: false,
        },
        {
            label: 'Checked In',
            value: `${checkedIn.toLocaleString()} (${checkinRate}%)`,
            icon: IconCheck,
            accent: '',
            iconBg: 'bg-purple-100 text-purple-600',
            valueClass: 'text-gray-800 text-xl',
            labelClass: 'text-gray-500',
            featured: false,
        },
        {
            label: 'Members',
            value: members.toLocaleString(),
            icon: IconUserCircle,
            accent: '',
            iconBg: 'bg-amber-100 text-amber-600',
            valueClass: 'text-gray-800',
            labelClass: 'text-gray-500',
            featured: false,
        },
        {
            label: 'Abstracts',
            value: abstracts.toLocaleString(),
            icon: IconFileText,
            accent: '',
            iconBg: 'bg-rose-100 text-rose-600',
            valueClass: 'text-gray-800',
            labelClass: 'text-gray-500',
            featured: false,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className={`card py-4 ${card.featured ? `bg-gradient-to-br ${card.accent}` : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                                <Icon size={24} />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-2xl font-bold truncate ${card.valueClass}`}>{card.value}</p>
                                <p className={`text-sm ${card.labelClass}`}>{card.label}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

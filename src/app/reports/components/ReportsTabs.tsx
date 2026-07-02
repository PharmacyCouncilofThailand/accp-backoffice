'use client';

import type { ReportTab } from '../types';

const TABS: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'registrations', label: 'Registrations' },
    { id: 'finance', label: 'Finance' },
];

interface ReportsTabsProps {
    active: ReportTab;
    onChange: (tab: ReportTab) => void;
}

export function ReportsTabs({ active, onChange }: ReportsTabsProps) {
    return (
        <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        active === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

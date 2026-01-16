'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import {
    IconUsers,
    IconSearch,
    IconEye,
    IconPrinter,
    IconDownload,
    IconUserPlus,
    IconLoader2,
    IconX,
} from '@tabler/icons-react';

const statusColors: { [key: string]: string } = {
    confirmed: 'badge-success',
    pending: 'badge-warning',
    cancelled: 'badge-error',
};

interface Registration {
    id: number;
    regCode: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt: string;
    ticketName: string;
    eventName: string;
    eventCode: string;
}

export default function RegistrationsPage() {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    useEffect(() => {
        fetchRegistrations();
    }, [page, searchTerm, statusFilter]);

    const fetchRegistrations = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const params: any = { page, limit: 10 };
            if (statusFilter) params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const res = await api.registrations.list(token, new URLSearchParams(params).toString());
            setRegistrations(res.registrations);
            setTotalCount(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch registrations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout title="Registrations">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <IconUsers size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{isLoading ? '-' : totalCount}</p>
                            <p className="text-sm text-gray-500">Total Registrations</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="card mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or code..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="input-field pl-10"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="input-field w-auto"
                        >
                            <option value="">All Status</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button className="btn-secondary flex items-center gap-2">
                            <IconDownload size={18} /> Export
                        </button>
                        {/* Add Registration manually implementation pending */}
                        {/* <button className="btn-primary flex items-center gap-2">
                            <IconUserPlus size={18} /> Add Registration
                        </button> */}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <IconLoader2 size={32} className="animate-spin text-blue-600" />
                    </div>
                ) : registrations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No registrations found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Attendee</th>
                                    <th>Event</th>
                                    <th>Ticket</th>
                                    <th>Status</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.map((reg) => (
                                    <tr key={reg.id} className="animate-fade-in">
                                        <td className="font-mono text-sm text-gray-600">{reg.regCode}</td>
                                        <td>
                                            <div>
                                                <p className="font-medium text-gray-800">{reg.firstName} {reg.lastName}</p>
                                                <p className="text-sm text-gray-500">{reg.email}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge bg-gray-100 text-gray-800">
                                                {reg.eventCode}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge bg-blue-50 text-blue-700">
                                                {reg.ticketName}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusColors[reg.status] || 'bg-gray-100'}`}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-1 justify-center">
                                                <button
                                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                    title="View"
                                                    onClick={() => { setSelectedReg(reg); setShowViewModal(true); }}
                                                >
                                                    <IconEye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                        Showing {registrations.length} of {totalCount} registrations
                    </p>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">{page}</span>
                        <button
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {showViewModal && selectedReg && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Registration Details</h3>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <IconX size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Reg Code</p>
                                    <p className="font-mono font-semibold">{selectedReg.regCode}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <span className={`badge ${statusColors[selectedReg.status] || 'bg-gray-100'}`}>
                                        {selectedReg.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Name</p>
                                    <p className="font-semibold">{selectedReg.firstName} {selectedReg.lastName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p>{selectedReg.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Ticket</p>
                                    <p>{selectedReg.ticketName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Event</p>
                                    <p>{selectedReg.eventName} ({selectedReg.eventCode})</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowViewModal(false)} className="btn-secondary">Close</button>
                            <button className="btn-primary flex items-center gap-2">
                                <IconPrinter size={18} /> Print Badge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

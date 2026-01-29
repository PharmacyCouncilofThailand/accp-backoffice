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
            setRegistrations(res.registrations as unknown as Registration[]);
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
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <IconLoader2 size={32} className="animate-spin text-blue-600" />
                    </div>
                ) : registrations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No registrations found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Attendee</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Event</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Ticket</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {registrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {reg.regCode}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{reg.firstName} {reg.lastName}</p>
                                                    <p className="text-sm text-gray-500">{reg.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                    {reg.eventCode}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                    {reg.ticketName}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${reg.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    reg.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                    {reg.status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                                                    {reg.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>}
                                                    {reg.status === 'cancelled' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                                    {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex gap-1 justify-center items-center">
                                                    <button
                                                        className="p-2 hover:bg-blue-50 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="View Details"
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

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium">{registrations.length}</span> of <span className="font-medium">{totalCount}</span> registrations
                            </p>
                            <div className="flex gap-2">
                                <button
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm">{page}</span>
                                <button
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
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
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${selectedReg.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                            selectedReg.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {selectedReg.status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                                        {selectedReg.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>}
                                        {selectedReg.status === 'cancelled' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                        {selectedReg.status.charAt(0).toUpperCase() + selectedReg.status.slice(1)}
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

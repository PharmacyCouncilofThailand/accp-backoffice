'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import {
    IconDiscount,
    IconPlus,
    IconPencil,
    IconTrash,
    IconSearch,
    IconCheck,
    IconX,
    IconCopy,
    IconCalendarEvent,
    IconPercentage,
    IconLoader2,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: { [key: string]: string } = {
    active: 'badge-success',
    expired: 'badge-error',
    inactive: 'badge-warning',
};

interface PromoCode {
    id: number;
    eventId: number | null;
    code: string;
    description: string | null;
    discountType: string;
    discountValue: string;
    maxUses: number;
    usedCount: number;
    validFrom: string | null;
    validUntil: string | null;
    isActive: boolean;
    status: string;
    eventCode?: string;
    eventName?: string;
}

interface EventOption {
    id: number;
    code: string;
    name: string;
}

export default function PromoCodesPage() {
    const { isAdmin } = useAuth();
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [events, setEvents] = useState<EventOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState<number | ''>('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        eventId: null as number | null,
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 100,
        validFrom: '',
        validUntil: '',
        isActive: true,
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        fetchPromoCodes();
    }, [page, eventFilter, statusFilter]);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const res = await api.backofficeEvents.list(token, 'limit=100');
            setEvents(res.events.map((e: any) => ({
                id: e.id,
                code: e.eventCode,
                name: e.eventName
            })));
        } catch (error) {
            console.error('Failed to fetch events:', error);
        }
    };

    const fetchPromoCodes = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const params: any = { page, limit: 10 };
            if (eventFilter) params.eventId = eventFilter;
            if (statusFilter) params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const res = await api.promoCodes.list(token, new URLSearchParams(params).toString());
            setPromoCodes(res.promoCodes);
            setTotalCount(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch promo codes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = {
        total: totalCount,
        active: promoCodes.filter(p => p.status === 'active').length,
        expired: promoCodes.filter(p => p.status === 'expired').length,
        totalUsed: promoCodes.reduce((sum, p) => sum + p.usedCount, 0),
    };

    const getEventName = (eventId: number | null) => {
        if (!eventId) return 'All Events';
        return events.find(e => e.id === eventId)?.code || 'Unknown';
    };

    const handleCreate = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.promoCodes.create(token, {
                ...formData,
                eventId: formData.eventId || null,
            });
            alert('Promo code created successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchPromoCodes();
        } catch (error: any) {
            alert(error.message || 'Failed to create promo code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedPromo) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.promoCodes.update(token, selectedPromo.id, {
                ...formData,
                eventId: formData.eventId || null,
            });
            alert('Promo code updated successfully!');
            setShowEditModal(false);
            setSelectedPromo(null);
            fetchPromoCodes();
        } catch (error: any) {
            alert(error.message || 'Failed to update promo code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPromo) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.promoCodes.delete(token, selectedPromo.id);
            alert('Promo code deleted successfully!');
            setShowDeleteModal(false);
            setSelectedPromo(null);
            fetchPromoCodes();
        } catch (error: any) {
            alert(error.message || 'Failed to delete promo code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDuplicate = (promo: PromoCode) => {
        setFormData({
            eventId: promo.eventId,
            code: promo.code + '-COPY',
            description: promo.description || '',
            discountType: promo.discountType,
            discountValue: parseFloat(promo.discountValue),
            maxUses: promo.maxUses,
            validFrom: promo.validFrom ? promo.validFrom.split('T')[0] : '',
            validUntil: promo.validUntil ? promo.validUntil.split('T')[0] : '',
            isActive: true,
        });
        setShowCreateModal(true);
    };

    const resetForm = () => {
        setFormData({
            eventId: events[0]?.id || null,
            code: '',
            description: '',
            discountType: 'percentage',
            discountValue: 10,
            maxUses: 100,
            validFrom: '',
            validUntil: '',
            isActive: true,
        });
    };

    const openEditModal = (promo: PromoCode) => {
        setSelectedPromo(promo);
        setFormData({
            eventId: promo.eventId,
            code: promo.code,
            description: promo.description || '',
            discountType: promo.discountType,
            discountValue: parseFloat(promo.discountValue),
            maxUses: promo.maxUses,
            validFrom: promo.validFrom ? promo.validFrom.split('T')[0] : '',
            validUntil: promo.validUntil ? promo.validUntil.split('T')[0] : '',
            isActive: promo.isActive,
        });
        setShowEditModal(true);
    };

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code });
    };

    const handleSearch = () => {
        setPage(1);
        fetchPromoCodes();
    };

    return (
        <AdminLayout title="Promo Codes">
            {/* Event Filter - Above Content */}
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <IconCalendarEvent className="text-blue-600" size={20} />
                </div>
                <span className="text-sm font-medium text-gray-700">Select Event:</span>
                <select
                    value={eventFilter}
                    onChange={(e) => { setEventFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
                    className="input-field pr-8 min-w-[250px] font-semibold bg-white"
                >
                    <option value="">All Events</option>
                    {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <IconDiscount size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{isLoading ? '-' : stats.total}</p>
                            <p className="text-sm text-gray-500">Total Codes</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                            <IconCheck size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                            <p className="text-sm text-gray-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                            <IconX size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                            <p className="text-sm text-gray-500">Expired</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                            <IconPercentage size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{stats.totalUsed}</p>
                            <p className="text-sm text-gray-500">Total Used</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {eventFilter ? `Promo Codes for ${events.find(e => e.id === eventFilter)?.name || 'Event'}` : 'All Promo Codes'}
                    </h2>
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <IconPlus size={18} />
                        Add Promo Code
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                        <input
                            type="text"
                            placeholder="Search by code or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="input-field pl-10"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="input-field w-auto"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <IconLoader2 size={32} className="animate-spin text-blue-600" />
                    </div>
                ) : promoCodes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No promo codes found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Promo Code</th>
                                    <th>Event</th>
                                    <th>Discount</th>
                                    <th>Usage</th>
                                    <th>Status</th>
                                    <th>Period</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promoCodes.map((promo) => {
                                    const usagePercentage = promo.maxUses ? (promo.usedCount / promo.maxUses) * 100 : 0;
                                    return (
                                        <tr key={promo.id} className="animate-fade-in">
                                            <td>
                                                <div>
                                                    <p className="font-mono font-semibold text-gray-800">{promo.code}</p>
                                                    <p className="text-sm text-gray-500">{promo.description || '-'}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-gray-100 text-gray-800">
                                                    {promo.eventCode || getEventName(promo.eventId)}
                                                </span>
                                            </td>
                                            <td>
                                                <p className="font-semibold text-green-600">
                                                    {promo.discountType === 'percentage'
                                                        ? `${promo.discountValue}%`
                                                        : `฿${parseFloat(promo.discountValue).toLocaleString()}`}
                                                </p>
                                            </td>
                                            <td>
                                                <div className="w-20">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">{promo.usedCount}/{promo.maxUses}</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${usagePercentage >= 100 ? 'bg-red-500' : usagePercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${statusColors[promo.status]}`}>
                                                    {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                                                </span>
                                            </td>
                                            <td>
                                                <p className="text-sm text-gray-600">{promo.validFrom?.split('T')[0] || '-'}</p>
                                                <p className="text-sm text-gray-400">to {promo.validUntil?.split('T')[0] || '-'}</p>
                                            </td>
                                            <td>
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                        title="Duplicate"
                                                        onClick={() => handleDuplicate(promo)}
                                                    >
                                                        <IconCopy size={18} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                        title="Edit"
                                                        onClick={() => openEditModal(promo)}
                                                    >
                                                        <IconPencil size={18} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 hover:bg-red-100 rounded text-red-600"
                                                        title="Delete"
                                                        onClick={() => { setSelectedPromo(promo); setShowDeleteModal(true); }}
                                                    >
                                                        <IconTrash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Showing page {page} of {totalPages} ({totalCount} total)
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn-secondary px-3 py-1 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="btn-secondary px-3 py-1 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <IconDiscount size={20} /> {showCreateModal ? 'Create Promo Code' : 'Edit Promo Code'}
                                </h3>
                                <button
                                    onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <IconX size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                                <select
                                    className="input-field"
                                    value={formData.eventId || ''}
                                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value ? Number(e.target.value) : null })}
                                >
                                    <option value="">All Events</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.code} - {event.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input-field font-mono flex-1"
                                        placeholder="PROMO2026"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                    <button
                                        type="button"
                                        onClick={generateCode}
                                        className="btn-secondary whitespace-nowrap"
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="รายละเอียดโค้ดส่วนลด"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                                    <select
                                        className="input-field"
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (฿)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Discount Value *
                                    </label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses *</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="100"
                                    value={formData.maxUses}
                                    onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) || 1 })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                                className="btn-secondary"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showCreateModal ? handleCreate : handleEdit}
                                className="btn-primary flex items-center gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <IconLoader2 size={18} className="animate-spin" />}
                                {showCreateModal ? 'Create Code' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedPromo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-red-600 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <IconTrash size={20} /> Delete Promo Code
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IconTrash size={32} className="text-red-600" />
                            </div>
                            <p className="mb-2">Are you sure you want to delete this promo code?</p>
                            <p className="font-mono font-semibold text-gray-800 text-lg">{selectedPromo.code}</p>
                            {selectedPromo.usedCount > 0 && (
                                <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded">
                                    ⚠️ This code has been used {selectedPromo.usedCount} time(s)
                                </p>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn-secondary"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <IconLoader2 size={18} className="animate-spin" />}
                                Delete Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

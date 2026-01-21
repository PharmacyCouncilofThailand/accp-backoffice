'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import {
    IconTicket,
    IconPlus,
    IconPencil,
    IconTrash,
    IconSearch,
    IconCheck,
    IconX,
    IconCopy,
    IconLoader2,
    IconCalendarEvent,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

const categoryColors: { [key: string]: { bg: string; text: string } } = {
    primary: { bg: 'bg-blue-100', text: 'text-blue-800' },
    addon: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

const typeColors: { [key: string]: string } = {
    thai_student: 'bg-green-100 text-green-800',
    thai_pharmacy: 'bg-blue-100 text-blue-800',
    intl_student: 'bg-yellow-100 text-yellow-800',
    intl_pharmacy: 'bg-purple-100 text-purple-800',
    general: 'bg-gray-100 text-gray-800', // fallback
};

interface Ticket {
    id: number;
    eventId: number;
    name: string; // ticketTypes.name
    category: string;
    price: number;
    currency: string;
    originalPrice?: number | null; // not standard in schema, maybe omitted or custom
    quota: number;
    sold: number;
    status?: string;
    startDate?: string; // saleStartDate
    endDate?: string; // saleEndDate
    type: string; // mapped from allowedRoles? or just logic
    allowedRoles: string[];
    eventCode?: string;
}

interface EventOption {
    id: number;
    code: string;
    name: string;
}

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [events, setEvents] = useState<EventOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState<number | ''>('');
    const [categoryFilter, setCategoryFilter] = useState<'primary' | 'addon' | ''>('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        eventId: 0,
        name: '',
        category: 'primary',
        price: 0,
        currency: 'THB',
        quota: 100,
        saleStartDate: '',
        saleEndDate: '',
        allowedRoles: ['thai_pharmacy'], // Default
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [page, searchTerm, eventFilter, categoryFilter, roleFilter]);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const res = await api.backofficeEvents.list(token, 'limit=100'); // Get enough for dropdown
            const mappedEvents = res.events.map((e: Record<string, unknown>) => ({
                id: e.id as number,
                code: e.eventCode as string,
                name: e.eventName as string
            }));
            setEvents(mappedEvents);
            if (mappedEvents.length > 0 && formData.eventId === 0) {
                setFormData(prev => ({ ...prev, eventId: mappedEvents[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
        }
    };

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const params: any = { page, limit: 10 };
            if (eventFilter) params.eventId = eventFilter;
            if (searchTerm) params.search = searchTerm;
            if (categoryFilter) params.category = categoryFilter;
            if (roleFilter) params.role = roleFilter;

            const res = await api.tickets.list(token, new URLSearchParams(params).toString());

            const mappedTickets = res.tickets.map((t: any) => {
                // Parse allowedRoles - could be JSON string or array
                let roles: string[] = [];
                if (t.allowedRoles) {
                    try {
                        roles = typeof t.allowedRoles === 'string'
                            ? JSON.parse(t.allowedRoles)
                            : t.allowedRoles;
                    } catch {
                        roles = [];
                    }
                }
                return {
                    id: t.id,
                    eventId: t.eventId,
                    name: t.name,
                    category: t.category,
                    price: parseFloat(t.price),
                    currency: t.currency || 'THB',
                    quota: t.quota,
                    sold: t.sold,
                    startDate: t.startDate,
                    endDate: t.endDate,
                    type: roles.length > 0 ? roles[0] : 'general',
                    allowedRoles: roles,
                    eventCode: t.eventCode
                };
            });

            setTickets(mappedTickets);
            setTotalCount(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.eventId) { toast.error('Please select an event'); return; }
        if (formData.quota < 1) {
            toast.error('Quota must be at least 1');
            return;
        }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            // Build payload with only schema-valid fields
            const payload: Record<string, unknown> = {
                name: formData.name,
                category: formData.category,
                price: String(formData.price),
                currency: formData.currency,
                quota: formData.quota,
                allowedRoles: JSON.stringify(formData.allowedRoles),
            };
            // Convert dates to ISO format only if provided
            if (formData.saleStartDate) {
                payload.saleStartDate = new Date(formData.saleStartDate).toISOString();
            }
            if (formData.saleEndDate) {
                payload.saleEndDate = new Date(formData.saleEndDate).toISOString();
            }
            await api.backofficeEvents.createTicket(token, formData.eventId, payload);
            toast.success('Ticket created successfully!');
            setShowCreateModal(false);
            fetchTickets();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedTicket || !formData.eventId) return;
        if (formData.quota < 1) {
            toast.error('Quota must be at least 1');
            return;
        }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            // Build payload with only schema-valid fields
            const payload: Record<string, unknown> = {
                name: formData.name,
                category: formData.category,
                price: String(formData.price),
                currency: formData.currency,
                quota: formData.quota,
                allowedRoles: JSON.stringify(formData.allowedRoles),
            };
            // Convert dates to ISO format only if provided
            if (formData.saleStartDate) {
                payload.saleStartDate = new Date(formData.saleStartDate).toISOString();
            }
            if (formData.saleEndDate) {
                payload.saleEndDate = new Date(formData.saleEndDate).toISOString();
            }
            // Use API update
            await api.backofficeEvents.updateTicket(token, formData.eventId, selectedTicket.id, payload);
            toast.success('Ticket updated successfully!');
            setShowEditModal(false);
            fetchTickets();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTicket) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.backofficeEvents.deleteTicket(token, selectedTicket.eventId, selectedTicket.id);
            toast.success('Ticket deleted successfully!');
            setShowDeleteModal(false);
            fetchTickets();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDuplicate = (ticket: Ticket) => {
        setFormData({
            eventId: ticket.eventId,
            name: ticket.name + ' (Copy)',
            category: ticket.category,
            price: ticket.price,
            currency: ticket.currency,
            quota: ticket.quota,
            saleStartDate: ticket.startDate ? new Date(ticket.startDate).toISOString().split('T')[0] : '',
            saleEndDate: ticket.endDate ? new Date(ticket.endDate).toISOString().split('T')[0] : '',
            allowedRoles: ticket.allowedRoles,
        });
        setShowCreateModal(true);
    };

    const openEditModal = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setFormData({
            eventId: ticket.eventId,
            name: ticket.name,
            category: ticket.category,
            price: ticket.price,
            currency: ticket.currency,
            quota: ticket.quota,
            saleStartDate: ticket.startDate ? new Date(ticket.startDate).toISOString().split('T')[0] : '',
            saleEndDate: ticket.endDate ? new Date(ticket.endDate).toISOString().split('T')[0] : '',
            allowedRoles: ticket.type === 'general' ? ['thai_pharmacy'] : [ticket.type], // Simplify for now
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            eventId: events[0]?.id || 1,
            name: '',
            category: 'primary',
            price: 0,
            currency: 'THB',
            quota: 100,
            saleStartDate: '',
            saleEndDate: '',
            allowedRoles: ['thai_pharmacy'],
        });
    };

    // Calculate stats from loaded tickets (approximate since paginated, but real API would need stat endpoint)
    // We'll hide accurate stats for now unless we fetch all or have a stats endpoint.
    // Displaying simple count from total.
    const stats = {
        total: totalCount,
    };

    return (
        <AdminLayout title="Ticket Management">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <IconTicket size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{isLoading ? '-' : stats.total}</p>
                            <p className="text-sm text-gray-500">Total Tickets</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {eventFilter ? `Tickets for ${events.find(e => e.id === eventFilter)?.name || 'Event'}` : 'All Tickets'}
                    </h2>
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <IconPlus size={18} />
                        Add Ticket
                    </button>
                </div>

                {/* Search & Category Filter */}
                <div className="mb-6 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="input-field pl-10"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value as 'primary' | 'addon' | ''); setPage(1); }}
                        className="input-field min-w-[150px]"
                    >
                        <option value="">All Categories</option>
                        <option value="primary">Primary</option>
                        <option value="addon">Add-on</option>
                    </select>
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        className="input-field min-w-[180px]"
                    >
                        <option value="">All Roles</option>
                        <option value="thai_student">Thai Student</option>
                        <option value="thai_pharmacy">Thai Pharmacy</option>
                        <option value="intl_student">International Student</option>
                        <option value="intl_pharmacy">International Pharmacy</option>
                    </select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <IconLoader2 size={32} className="animate-spin text-blue-600" />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No tickets found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Event</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Quota</th>
                                    <th>Sales Period</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => {
                                    const soldPercentage = ticket.quota > 0 ? (ticket.sold / ticket.quota) * 100 : 0;
                                    return (
                                        <tr key={ticket.id} className="animate-fade-in">
                                            <td>
                                                <p className="font-medium text-gray-800">{ticket.name}</p>
                                            </td>
                                            <td>
                                                <span className="badge bg-gray-100 text-gray-800">
                                                    {ticket.eventCode || events.find(e => e.id === ticket.eventId)?.code || 'Unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${categoryColors[ticket.category]?.bg || 'bg-gray-100'} ${categoryColors[ticket.category]?.text || 'text-gray-800'}`}>
                                                    {ticket.category === 'primary' ? 'Primary' : 'Add-on'}
                                                </span>
                                                <span className={`badge ml-1 ${typeColors[ticket.type] || 'bg-gray-100 text-gray-600'}`}>
                                                    {ticket.type.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{ticket.currency === 'USD' ? '$' : '฿'}{ticket.price.toLocaleString()}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="w-24">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">{ticket.sold}/{ticket.quota}</span>
                                                        <span className={soldPercentage >= 90 ? 'text-red-600' : soldPercentage >= 70 ? 'text-yellow-600' : 'text-green-600'}>
                                                            {Math.round(soldPercentage)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${soldPercentage >= 90 ? 'bg-red-500' : soldPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-sm text-gray-600">{ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : 'N/A'}</p>
                                                <p className="text-sm text-gray-400">to {ticket.endDate ? new Date(ticket.endDate).toLocaleDateString() : 'N/A'}</p>
                                            </td>
                                            <td>
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                        title="Duplicate"
                                                        onClick={() => handleDuplicate(ticket)}
                                                    >
                                                        <IconCopy size={18} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                        title="Edit"
                                                        onClick={() => openEditModal(ticket)}
                                                    >
                                                        <IconPencil size={18} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 hover:bg-red-100 rounded text-red-600"
                                                        title="Delete"
                                                        onClick={() => { setSelectedTicket(ticket); setShowDeleteModal(true); }}
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                        Showing {tickets.length} of {totalCount} tickets
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

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <IconTicket size={20} /> {showCreateModal ? 'Create Ticket' : 'Edit Ticket'}
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
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
                                    <select
                                        className="input-field"
                                        value={formData.eventId}
                                        onChange={(e) => setFormData({ ...formData, eventId: Number(e.target.value) })}
                                        disabled={!showCreateModal} // Disable creating/moving ticket to another event if editing (usually locked)
                                    >
                                        {events.map((event) => (
                                            <option key={event.id} value={event.id}>{event.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                    <select
                                        className="input-field"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="primary">Primary</option>
                                        <option value="addon">Add-on</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience (Role) *</label>
                                <select
                                    className="input-field"
                                    value={formData.allowedRoles[0]}
                                    onChange={(e) => setFormData({ ...formData, allowedRoles: [e.target.value] })}
                                >
                                    <option value="thai_student">Thai Student</option>
                                    <option value="thai_pharmacy">Thai Pharmacy</option>
                                    <option value="intl_student">International Student</option>
                                    <option value="intl_pharmacy">International Pharmacy</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quota *</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.quota || ''}
                                    onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) || 0 })}
                                    placeholder="100"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Name *</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Early Bird - Member"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    maxLength={255}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                                    <select
                                        className="input-field"
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        <option value="THB">THB (฿)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.saleStartDate}
                                        onChange={(e) => setFormData({ ...formData, saleStartDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.saleEndDate}
                                        onChange={(e) => setFormData({ ...formData, saleEndDate: e.target.value })}
                                    />
                                </div>
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
                                {showCreateModal ? 'Create Ticket' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedTicket && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-red-600 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <IconTrash size={20} /> Delete Ticket
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <p className="mb-2">Are you sure you want to delete this ticket?</p>
                            <p className="font-semibold text-gray-800">{selectedTicket.name}</p>
                            {selectedTicket.sold > 0 && (
                                <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                                    ⚠️ Warning: {selectedTicket.sold} tickets have been sold!
                                </p>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                            <button
                                onClick={handleDelete}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <IconLoader2 size={18} className="animate-spin" /> : 'Delete Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

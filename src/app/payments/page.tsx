'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import { getFullName } from '@/lib/name';
import { Pagination } from '@/components/common';
import {
    IconCreditCard,
    IconSearch,
    IconDownload,
    IconEye,
    IconCheck,
    IconLoader2,
    IconX,
} from '@tabler/icons-react';
import type { OrderListItem, OrderStats } from '@/types/api';

const getBackofficeToken = () =>
    localStorage.getItem('backoffice_token') ||
    sessionStorage.getItem('backoffice_token') ||
    '';

function formatPaymentChannel(channel: string | null, provider?: string): string {
    if (!channel) return provider || '—';
    const map: Record<string, string> = {
        credit_card: 'Credit Card',
        qr_promptpay: 'QR PromptPay',
        bank_transfer: 'Bank Transfer',
        mobile_banking: 'Mobile Banking',
        free: 'Free',
    };
    return map[channel] || channel;
}

const roleLabels: Record<string, string> = {
    thstd: 'TH Student',
    interstd: 'Inter Student',
    thpro: 'TH Professional',
    interpro: 'Inter Professional',
    general: 'General',
    admin: 'Admin',
};

// ── Order Detail Modal ──────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: OrderListItem; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Order Detail</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <IconX size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Order Info */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Order</h4>
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Order Number</span>
                                <span className="text-sm font-mono font-medium text-gray-800">{order.orderNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Status</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <IconCheck size={12} /> Paid
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Date</span>
                                <span className="text-sm text-gray-800">
                                    {order.payment?.paidAt
                                        ? new Date(order.payment.paidAt).toLocaleString('th-TH')
                                        : new Date(order.createdAt).toLocaleString('th-TH')
                                    }
                                </span>
                            </div>
                            {order.regCode && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Reg Code</span>
                                    <span className="text-sm font-mono text-blue-600">{order.regCode}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">User</h4>
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Name</span>
                                <Link
                                    href={`/members?search=${encodeURIComponent(order.user.email)}`}
                                    className="text-sm font-medium text-blue-600 hover:underline"
                                >
                                    {getFullName(order.user.firstName, order.user.middleName, order.user.lastName)}
                                </Link>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Email</span>
                                <span className="text-sm text-gray-800">{order.user.email}</span>
                            </div>
                            {order.user.phone && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Phone</span>
                                    <span className="text-sm text-gray-800">{order.user.phone}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Role</span>
                                <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                    {roleLabels[order.user.role] || order.user.role}
                                </span>
                            </div>
                            {order.user.institution && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Institution</span>
                                    <span className="text-sm text-gray-800 text-right max-w-[220px]">{order.user.institution}</span>
                                </div>
                            )}
                            {order.user.country && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Country</span>
                                    <span className="text-sm text-gray-800">{order.user.country}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</h4>
                        {order.items.length > 0 ? (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ticket</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {order.items.map((item, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-gray-800">{item.ticketName}</td>
                                                <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right text-gray-800">
                                                    {order.currency === 'USD' ? '$' : '฿'}{Number(item.price).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No items</p>
                        )}
                        {order.addonSessions.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {order.addonSessions.map((ws, i) => {
                                    const typeMeta: Record<string, { label: string; bg: string; text: string; accent: string; muted: string }> = {
                                        workshop: { label: 'Workshop', bg: 'bg-purple-50', text: 'text-purple-800', accent: 'text-purple-600', muted: 'text-purple-500' },
                                        gala_dinner: { label: 'Gala Dinner', bg: 'bg-amber-50', text: 'text-amber-800', accent: 'text-amber-600', muted: 'text-amber-500' },
                                        lecture: { label: 'Lecture', bg: 'bg-blue-50', text: 'text-blue-800', accent: 'text-blue-600', muted: 'text-blue-500' },
                                        ceremony: { label: 'Ceremony', bg: 'bg-rose-50', text: 'text-rose-800', accent: 'text-rose-600', muted: 'text-rose-500' },
                                    };
                                    const meta = typeMeta[ws.sessionType] || { label: 'Session', bg: 'bg-gray-50', text: 'text-gray-800', accent: 'text-gray-600', muted: 'text-gray-500' };
                                    return (
                                        <div key={i} className={`flex items-start gap-2 ${meta.bg} rounded-lg px-3 py-2`}>
                                            <span className={`text-xs font-medium ${meta.accent} whitespace-nowrap mt-0.5`}>{meta.label}</span>
                                            <div className={`text-xs ${meta.text}`}>
                                                <span className="font-medium">{ws.sessionName}</span>
                                                {ws.room && <span className={`${meta.muted} ml-1`}>({ws.room})</span>}
                                                <div className={meta.muted}>
                                                    {new Date(ws.startTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                                    {' — '}
                                                    {new Date(ws.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Payment Summary */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment</h4>
                        <div className="space-y-1.5">
                            {order.subtotalAmount && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Subtotal</span>
                                    <span className="text-sm text-gray-800">
                                        {order.currency === 'USD' ? '$' : '฿'}{Number(order.subtotalAmount).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {order.promoCode && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Promo Code</span>
                                    <span className="text-sm text-purple-600 font-medium">{order.promoCode}</span>
                                </div>
                            )}
                            {order.discountAmount && Number(order.discountAmount) > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Discount</span>
                                    <span className="text-sm text-green-600">
                                        -{order.currency === 'USD' ? '$' : '฿'}{Number(order.discountAmount).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {(() => {
                                const subtotal = Number(order.subtotalAmount || 0);
                                const discount = Number(order.discountAmount || 0);
                                const total = Number(order.totalAmount);
                                const fee = Math.round((total - (subtotal - discount)) * 100) / 100;
                                return fee > 0 ? (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Processing Fee</span>
                                        <span className="text-sm text-gray-800">
                                            {order.currency === 'USD' ? '$' : '฿'}{fee.toLocaleString()}
                                        </span>
                                    </div>
                                ) : null;
                            })()}
                            <div className="flex justify-between pt-1.5 border-t border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">Total</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {order.currency === 'USD' ? '$' : '฿'}{Number(order.totalAmount).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Method</span>
                                <span className="text-sm text-gray-800">
                                    {formatPaymentChannel(order.payment?.channel || null, order.payment?.provider)}
                                </span>
                            </div>
                            {order.event && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Event</span>
                                    <span className="text-sm text-gray-800">{order.event.name}</span>
                                </div>
                            )}
                            {order.needTaxInvoice && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Tax Invoice</span>
                                    <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">Requested</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
                    <a
                        href={order.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
                    >
                        <IconDownload size={16} />
                        Download Receipt
                    </a>
                    <button onClick={onClose} className="btn-primary text-sm px-4 py-2">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────
export default function PaymentsPage() {
    const [orders, setOrders] = useState<OrderListItem[]>([]);
    const [stats, setStats] = useState<OrderStats>({ successCount: 0, totalCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
        const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 20;

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = getBackofficeToken();
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(limit));
            if (activeSearch) params.set('search', activeSearch);

            const res = await api.orders.list(token, params.toString());
            setOrders(res.orders);
            setStats(res.stats);
            setTotalPages(res.pagination.totalPages);
            setTotalCount(res.pagination.total);
        } catch {
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [page, activeSearch]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleSearch = () => {
        setActiveSearch(searchInput.trim());
        setPage(1);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setActiveSearch('');
        setPage(1);
    };

    return (
        <AdminLayout title="Payment Management">
            {/* Order Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                            <IconCheck size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.successCount}</p>
                            <p className="text-gray-500 text-sm">Successful Payments</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                            <IconCreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.totalCount}</p>
                            <p className="text-gray-500 text-sm">Total Transactions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="card">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <IconCreditCard size={20} className="text-blue-600" />
                        Transactions
                    </h2>
                </div>

                {/* Search with button */}
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex gap-2 max-w-lg">
                        <div className="relative flex-1">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by payment Order ID..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="input-field-search"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="btn-primary flex items-center gap-1.5 px-4 py-2 whitespace-nowrap"
                        >
                            <IconSearch size={16} />
                            Search
                        </button>
                        {activeSearch && (
                            <button
                                onClick={handleClearSearch}
                                className="btn-secondary flex items-center gap-1.5 px-3 py-2"
                                title="Clear search"
                            >
                                <IconX size={16} />
                            </button>
                        )}
                    </div>
                    {activeSearch && (
                        <p className="text-xs text-gray-500 mt-2">
                            Searching: <span className="font-mono font-medium text-gray-700">{activeSearch}</span>
                            {' '}— {totalCount} result{totalCount !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Loading */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <IconLoader2 size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        {order.orderNumber}
                                                    </span>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {formatPaymentChannel(order.payment?.channel || null, order.payment?.provider)}
                                                    </div>
                                                    {order.regCode && (
                                                        <div className="text-xs text-blue-500 mt-0.5">{order.regCode}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Link
                                                        href={`/members?search=${encodeURIComponent(order.user.email)}`}
                                                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                                    >
                                                        {getFullName(order.user.firstName, order.user.middleName, order.user.lastName)}
                                                    </Link>
                                                    <div className="text-sm text-gray-500">{order.user.email}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                                            {roleLabels[order.user.role] || order.user.role}
                                                        </span>
                                                        {order.user.institution && (
                                                            <span className="text-xs text-gray-400 truncate max-w-35" title={order.user.institution}>
                                                                {order.user.institution}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm text-gray-600">
                                                        {order.items.map((item, i) => (
                                                            <div key={i}>
                                                                {item.ticketName}
                                                                {item.quantity > 1 && <span className="text-gray-400"> ×{item.quantity}</span>}
                                                            </div>
                                                        ))}
                                                        {order.items.length === 0 && <span className="text-gray-400">—</span>}
                                                    </div>
                                                    {order.event && (
                                                        <div className="text-xs text-gray-400 mt-0.5">{order.event.name}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="font-bold text-gray-900">
                                                        {order.currency === 'USD' ? '$' : '฿'}
                                                        {Number(order.totalAmount).toLocaleString()}
                                                    </div>
                                                    {order.promoCode && (
                                                        <div className="text-xs text-purple-600 mt-0.5">
                                                            {order.promoCode}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <IconCheck size={14} />
                                                        <span>Paid</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm text-gray-600">
                                                    {order.payment?.paidAt
                                                        ? new Date(order.payment.paidAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
                                                        : new Date(order.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
                                                    }
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="p-2 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg transition-colors"
                                                            title="View Detail"
                                                        >
                                                            <IconEye size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {orders.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-8 text-gray-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                            <IconCreditCard size={24} className="text-gray-400" />
                                                        </div>
                                                        <p>No transactions found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-4">
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalCount={totalCount}
                                    pageSize={limit}
                                    onPageChange={setPage}
                                    showPageInfo
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

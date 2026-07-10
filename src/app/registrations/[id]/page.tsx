'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import { getFullName } from '@/lib/name';
import {
    IconArrowLeft,
    IconLoader2,
    IconUser,
    IconMail,
    IconPhone,
    IconBuilding,
    IconWorld,
    IconTicket,
    IconCalendar,
    IconMapPin,
    IconClock,
    IconCheck,
    IconX,
    IconPrinter,
    IconEdit,
    IconUserPlus,
    IconDownload,
    IconReceipt,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

const getBackofficeToken = () =>
    localStorage.getItem('backoffice_token') ||
    sessionStorage.getItem('backoffice_token') ||
    '';

interface RegistrationSession {
    id: number;
    sessionId: number;
    ticketTypeId: number;
    checkedInAt: string | null;
    checkedInById: number | null;
    createdAt: string;
    sessionCode: string;
    sessionName: string;
    sessionType: string;
    startTime: string;
    endTime: string;
    room: string | null;
    ticketName: string;
    ticketCategory: string;
    ticketPrice?: string;
    ticketCurrency?: string;
    checkedInByFirstName: string | null;
    checkedInByMiddleName: string | null;
    checkedInByLastName: string | null;
}

interface RegistrationDetail {
    id: number;
    regCode: string;
    email: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dietaryRequirements: string | null;
    status: string;
    source: string;
    addedNote: string | null;
    createdAt: string;
    eventId: number;
    eventName: string;
    eventCode: string;
    ticketTypeId: number;
    ticketName: string;
    ticketCategory: string;
    ticketPrice: string;
    ticketCurrency: string;
    userId: number | null;
    userPhone: string | null;
    userRole: string | null;
    userInstitution: string | null;
    userCountry: string | null;
    addedById: number | null;
    addedByFirstName: string | null;
    addedByMiddleName: string | null;
    addedByLastName: string | null;
    sessions: RegistrationSession[];
    offlineOrder?: {
        orderId: number;
        orderNumber: string;
        receiptUrl: string;
        status: string;
    } | null;
}

const sessionTypeConfig: Record<string, { label: string; bg: string; text: string }> = {
    workshop: { label: 'Workshop', bg: 'bg-orange-100', text: 'text-orange-700' },
    gala_dinner: { label: 'Gala Dinner', bg: 'bg-pink-100', text: 'text-pink-700' },
    lecture: { label: 'Lecture', bg: 'bg-blue-100', text: 'text-blue-700' },
    ceremony: { label: 'Ceremony', bg: 'bg-purple-100', text: 'text-purple-700' },
    break: { label: 'Break', bg: 'bg-gray-100', text: 'text-gray-600' },
    other: { label: 'Other', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export default function RegistrationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [registration, setRegistration] = useState<RegistrationDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showReceiptForm, setShowReceiptForm] = useState(false);
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [receiptForm, setReceiptForm] = useState({
        channel: 'card' as 'card' | 'alipay' | 'promptpay',
        amount: '',
        paidAt: '',
        sendReceipt: true,
    });

    useEffect(() => {
        if (id) {
            fetchRegistration();
        }
    }, [id]);

    const fetchRegistration = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = getBackofficeToken();
            const res = await api.registrations.get(token, parseInt(id));
            setRegistration(res.registration as unknown as RegistrationDetail);
        } catch (err: any) {
            console.error('Failed to fetch registration:', err);
            setError(err.message || 'Failed to load registration');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecordOfflinePayment = async () => {
        if (!registration) return;
        const amount = Number(receiptForm.amount);
        if (!Number.isFinite(amount) || amount < 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }
        setIsRecordingPayment(true);
        const t = toast.loading('Creating receipt...');
        try {
            const token = getBackofficeToken();
            const res = await api.registrations.recordOfflinePayment(token, registration.id, {
                channel: receiptForm.channel,
                amount,
                currency: 'THB',
                ...(receiptForm.paidAt ? { paidAt: new Date(receiptForm.paidAt).toISOString() } : {}),
                sendReceipt: receiptForm.sendReceipt,
            });
            toast.success(
                receiptForm.sendReceipt
                    ? `Receipt created & email sent (${res.offlineOrder.orderNumber})`
                    : `Receipt created (${res.offlineOrder.orderNumber})`,
                { id: t },
            );
            setShowReceiptForm(false);
            await fetchRegistration();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create receipt', { id: t });
        } finally {
            setIsRecordingPayment(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    if (isLoading) {
        return (
            <AdminLayout title="Registration Details">
                <div className="flex justify-center items-center py-20">
                    <IconLoader2 size={40} className="animate-spin text-blue-600" />
                </div>
            </AdminLayout>
        );
    }

    if (error || !registration) {
        return (
            <AdminLayout title="Registration Details">
                <div className="text-center py-20">
                    <p className="text-red-600 mb-4">{error || 'Registration not found'}</p>
                    <Link href="/registrations" className="btn-secondary">
                        <IconArrowLeft size={18} className="mr-2" />
                        Back to Registrations
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const mainSessions = registration.sessions.filter(s => s.ticketCategory === 'primary');
    const addonSessions = registration.sessions.filter(s => s.ticketCategory === 'addon');
    const estimatedThbReceiptAmount = (() => {
        let total = 0;
        if (registration.ticketCurrency === 'THB') {
            const primary = Number(registration.ticketPrice);
            if (Number.isFinite(primary)) total += primary;
        }
        const seenAddonIds = new Set<number>();
        for (const session of addonSessions) {
            if (session.ticketTypeId === registration.ticketTypeId || seenAddonIds.has(session.ticketTypeId)) {
                continue;
            }
            seenAddonIds.add(session.ticketTypeId);
            if (session.ticketCurrency !== 'THB') continue;
            const price = Number(session.ticketPrice ?? 0);
            if (Number.isFinite(price)) total += price;
        }
        return total;
    })();
    const hasNonThbTickets =
        registration.ticketCurrency !== 'THB' ||
        addonSessions.some((s) => s.ticketCurrency && s.ticketCurrency !== 'THB');
    const hasReceipt = Boolean(registration.offlineOrder?.receiptUrl);
    const canIssueReceipt = registration.status === 'confirmed' && registration.userId && !hasReceipt;

    return (
        <AdminLayout title="Registration Details">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/registrations"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <IconArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {getFullName(registration.firstName, registration.middleName, registration.lastName)}
                        </h1>
                        <p className="text-gray-500 font-mono">{registration.regCode}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary flex items-center gap-2">
                        <IconPrinter size={18} /> Print Badge
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Registration Info Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Registration Information</h2>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
                                registration.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                registration.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                            }`}>
                                {registration.status === 'confirmed' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                {registration.status === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
                                {registration.status === 'cancelled' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Event</p>
                                <p className="font-medium text-gray-900">{registration.eventName}</p>
                                <span className="inline-flex px-2 py-0.5 mt-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    {registration.eventCode}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Primary Ticket</p>
                                <p className="font-medium text-gray-900">{registration.ticketName}</p>
                                <p className="text-sm text-gray-500">
                                    {registration.ticketCurrency} {parseFloat(registration.ticketPrice).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Registration Date</p>
                                <p className="font-medium text-gray-900">{formatDateTime(registration.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Source</p>
                                {registration.source === 'manual' ? (
                                    <div>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                            <IconUserPlus size={14} /> Manual
                                        </span>
                                        {registration.addedByFirstName && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Added by {getFullName(registration.addedByFirstName, registration.addedByMiddleName, registration.addedByLastName)}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                                        Purchase
                                    </span>
                                )}
                            </div>
                            {registration.addedNote && (
                                <div className="md:col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Note</p>
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{registration.addedNote}</p>
                                </div>
                            )}
                            {registration.dietaryRequirements && (
                                <div className="md:col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Dietary Requirements</p>
                                    <p className="text-gray-700">{registration.dietaryRequirements}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sessions Card */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Registered Sessions</h2>

                        {registration.sessions.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No sessions registered</p>
                        ) : (
                            <div className="space-y-4">
                                {/* Main Sessions */}
                                {mainSessions.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-2">Main Conference</p>
                                        <div className="space-y-2">
                                            {mainSessions.map((session) => (
                                                <SessionCard key={session.id} session={session} formatTime={formatTime} formatDate={formatDate} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Add-on Sessions */}
                                {addonSessions.length > 0 && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm font-medium text-gray-500 mb-2">Add-on Sessions</p>
                                        <div className="space-y-2">
                                            {addonSessions.map((session) => (
                                                <SessionCard key={session.id} session={session} formatTime={formatTime} formatDate={formatDate} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Attendee Info */}
                <div className="space-y-6">
                    {/* Attendee Card */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Attendee Information</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <IconUser size={20} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Name</p>
                                    <p className="font-medium text-gray-900">{registration.firstName} {registration.lastName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <IconMail size={20} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900 break-all">{registration.email}</p>
                                </div>
                            </div>
                            {registration.userPhone && (
                                <div className="flex items-start gap-3">
                                    <IconPhone size={20} className="text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <p className="font-medium text-gray-900">{registration.userPhone}</p>
                                    </div>
                                </div>
                            )}
                            {registration.userInstitution && (
                                <div className="flex items-start gap-3">
                                    <IconBuilding size={20} className="text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Institution</p>
                                        <p className="font-medium text-gray-900">{registration.userInstitution}</p>
                                    </div>
                                </div>
                            )}
                            {registration.userCountry && (
                                <div className="flex items-start gap-3">
                                    <IconWorld size={20} className="text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Country</p>
                                        <p className="font-medium text-gray-900">{registration.userCountry}</p>
                                    </div>
                                </div>
                            )}
                            {registration.userRole && (
                                <div className="flex items-start gap-3">
                                    <IconTicket size={20} className="text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Role</p>
                                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                            {registration.userRole}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment / Receipt */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <IconReceipt size={20} />
                            Payment Receipt
                        </h2>

                        {hasReceipt && registration.offlineOrder ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Order number</p>
                                    <p className="font-medium text-gray-900">{registration.offlineOrder.orderNumber}</p>
                                </div>
                                <a
                                    href={registration.offlineOrder.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                                >
                                    <IconDownload size={16} />
                                    Download Receipt (PDF)
                                </a>
                            </div>
                        ) : canIssueReceipt ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Enter the paid amount in THB
                                    {estimatedThbReceiptAmount > 0
                                        ? ` (THB list price: ฿${estimatedThbReceiptAmount.toLocaleString()})`
                                        : hasNonThbTickets
                                            ? ' — USD ticket, please enter THB amount manually'
                                            : ''}.
                                </p>

                                {!showReceiptForm ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReceiptForm((prev) => ({
                                                ...prev,
                                                amount: estimatedThbReceiptAmount > 0 ? String(estimatedThbReceiptAmount) : '',
                                            }));
                                            setShowReceiptForm(true);
                                        }}
                                        className="btn-primary w-full text-sm"
                                    >
                                        Issue Receipt
                                    </button>
                                ) : (
                                    <div className="space-y-3 border-t border-gray-100 pt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment channel</label>
                                            <select
                                                value={receiptForm.channel}
                                                onChange={(e) => setReceiptForm((prev) => ({
                                                    ...prev,
                                                    channel: e.target.value as typeof prev.channel,
                                                }))}
                                                className="input-field"
                                            >
                                                <option value="card">Credit / Debit Card</option>
                                                <option value="promptpay">QR PromptPay</option>
                                                <option value="alipay">Alipay</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Amount (THB) *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={receiptForm.amount}
                                                onChange={(e) => setReceiptForm((prev) => ({ ...prev, amount: e.target.value }))}
                                                className="input-field"
                                                placeholder={estimatedThbReceiptAmount > 0 ? String(estimatedThbReceiptAmount) : '0'}
                                                required
                                            />
                                            {estimatedThbReceiptAmount > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    THB ticket list price: ฿{estimatedThbReceiptAmount.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
                                            <input
                                                type="datetime-local"
                                                value={receiptForm.paidAt}
                                                onChange={(e) => setReceiptForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                                                className="input-field"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={receiptForm.sendReceipt}
                                                onChange={(e) => setReceiptForm((prev) => ({ ...prev, sendReceipt: e.target.checked }))}
                                                className="accent-blue-600"
                                            />
                                            <span className="text-sm text-gray-700">Send receipt email</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowReceiptForm(false)}
                                                className="btn-secondary flex-1 text-sm"
                                                disabled={isRecordingPayment}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRecordOfflinePayment}
                                                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                                                disabled={isRecordingPayment}
                                            >
                                                {isRecordingPayment ? (
                                                    <IconLoader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <IconReceipt size={16} />
                                                )}
                                                Create Receipt
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">
                                {!registration.userId
                                    ? 'Cannot issue receipt — no linked user account.'
                                    : registration.status !== 'confirmed'
                                        ? 'Receipt is only available for confirmed registrations.'
                                        : 'No receipt available.'}
                            </p>
                        )}
                    </div>

                    {/* Check-in Summary */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Check-in Status</h2>
                        <div className="space-y-3">
                            {registration.sessions.length === 0 ? (
                                <p className="text-gray-500 text-sm">No sessions to check in</p>
                            ) : (
                                registration.sessions.map((session) => (
                                    <div key={session.id} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700 truncate flex-1 mr-2">{session.sessionName}</span>
                                        {session.checkedInAt ? (
                                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                <IconCheck size={14} /> Checked In
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                                <IconX size={14} /> Not Yet
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function SessionCard({ session, formatTime, formatDate }: { session: RegistrationSession; formatTime: (d: string) => string; formatDate: (d: string) => string }) {
    const typeConfig = sessionTypeConfig[session.sessionType] || sessionTypeConfig.other;

    return (
        <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{session.sessionCode}</span>
                    </div>
                    <p className="font-medium text-gray-900">{session.sessionName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <IconCalendar size={14} />
                            {formatDate(session.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                            <IconClock size={14} />
                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </span>
                        {session.room && (
                            <span className="flex items-center gap-1">
                                <IconMapPin size={14} />
                                {session.room}
                            </span>
                        )}
                    </div>
                </div>
                            </div>
        </div>
    );
}

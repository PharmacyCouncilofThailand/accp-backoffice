'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import { getFullName } from '@/lib/name';
import { useDebounce } from '@/hooks/useDebounce';
import {
    IconSearch,
    IconArrowLeft,
    IconLoader2,
    IconCalendar,
    IconTicket,
    IconMapPin,
    IconUser,
    IconUserPlus,
    IconX,
    IconCheck,
    IconAlertCircle,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

const getBackofficeToken = () =>
    localStorage.getItem('backoffice_token') ||
    sessionStorage.getItem('backoffice_token') ||
    '';

export default function AddRegistrationPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state - now supports multiple users
    const [form, setForm] = useState({
        eventId: 0,
        ticketTypeId: 0,
        addonTicketTypeIds: [] as number[],
        sessionIds: [] as number[],
        note: '',
    });

    // Data states
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [registeredUserIds, setRegisteredUserIds] = useState<Set<number>>(new Set());
    const [ticketCategory, setTicketCategory] = useState<string | null>(null);
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [ticketsList, setTicketsList] = useState<any[]>([]);
    const [sessionsList, setSessionsList] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [ticketSearch, setTicketSearch] = useState('');
    const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false);
    const ticketDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler for ticket dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ticketDropdownRef.current && !ticketDropdownRef.current.contains(event.target as Node)) {
                setIsTicketDropdownOpen(false);
                // Restore ticket name if one is selected
                if (selectedTicket) {
                    setTicketSearch(selectedTicket.name);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedTicket]);

    // Fetch events on mount
    useEffect(() => {
        const token = getBackofficeToken();
        api.backofficeEvents.list(token).then(res => {
            setEventsList(res.events as any[]);
        }).catch(() => {});
    }, []);

    // Fetch tickets + sessions when event changes
    useEffect(() => {
        if (form.eventId > 0) {
            const token = getBackofficeToken();

            api.backofficeEvents.get(token, form.eventId).then(res => {
                setSelectedEvent(res.event);
                setTicketsList(res.tickets as any[]);
                setSessionsList((res as any).sessions as any[] || []);
            }).catch(() => {});

            // Reset ticket selection
            setForm(prev => ({ ...prev, ticketTypeId: 0, addonTicketTypeIds: [], sessionIds: [] }));
            setSelectedTicket(null);
            setTicketSearch('');
            setIsTicketDropdownOpen(false);
        } else {
            setSelectedEvent(null);
            setTicketsList([]);
            setSessionsList([]);
            setRegisteredUserIds(new Set());
        }
    }, [form.eventId]);

    // Fetch registered users when event + ticket changes
    useEffect(() => {
        if (form.eventId > 0 && form.ticketTypeId > 0) {
            const token = getBackofficeToken();
            // Clear selected users when ticket changes (registered check context changes)
            setSelectedUsers([]);
            setUserSearch('');
            setUserResults([]);
            api.registrations.getRegisteredUsers(token, form.eventId, form.ticketTypeId)
                .then(res => {
                    setRegisteredUserIds(new Set(res.registeredUserIds));
                    setTicketCategory(res.ticketCategory || null);
                })
                .catch(() => {
                    setRegisteredUserIds(new Set());
                    setTicketCategory(null);
                });
        } else {
            setRegisteredUserIds(new Set());
            setTicketCategory(null);
        }
    }, [form.eventId, form.ticketTypeId]);

    // Update selected ticket
    useEffect(() => {
        if (form.ticketTypeId > 0) {
            const ticket = ticketsList.find((t: any) => t.id === form.ticketTypeId);
            setSelectedTicket(ticket || null);
        } else {
            setSelectedTicket(null);
        }
    }, [form.ticketTypeId, ticketsList]);

    const getTicketSessionIds = (ticket: any) => {
        const sessionIds = Array.isArray(ticket?.sessionIds) ? ticket.sessionIds : [];
        const legacySessionIds = ticket?.sessionId ? [ticket.sessionId] : [];
        return [...new Set([...sessionIds, ...legacySessionIds])]
            .filter((id): id is number => Number.isInteger(id) && id > 0);
    };

    const getTicketSessions = (ticket: any) => {
        const sessionIds = new Set(getTicketSessionIds(ticket));
        if (sessionIds.size === 0) return [];
        return sessionsList.filter((session: any) => sessionIds.has(session.id));
    };

    const primaryTickets = ticketsList.filter((ticket: any) =>
        ticket.category === 'primary' &&
        ticket.isActive !== false
    );
    const addonTickets = ticketsList.filter((ticket: any) =>
        ticket.category === 'addon' &&
        ticket.id !== form.ticketTypeId &&
        ticket.isActive !== false
    );
    const selectedAddonTickets = addonTickets.filter((ticket: any) =>
        form.addonTicketTypeIds.includes(ticket.id)
    );
    const linkedSessionIdsForSelectedTickets = new Set([
        ...getTicketSessionIds(selectedTicket),
        ...selectedAddonTickets.flatMap((ticket: any) => getTicketSessionIds(ticket)),
    ]);
    const linkedSessionsForSelectedTickets = sessionsList.filter((session: any) =>
        linkedSessionIdsForSelectedTickets.has(session.id)
    );
    const selectedTickets = selectedTicket ? [selectedTicket, ...selectedAddonTickets] : [];

    const isWorkshopTicket = (ticket: any) =>
        (ticket?.groupName || '').toLowerCase() === 'workshop' ||
        getTicketSessions(ticket).some((session: any) => session.sessionType === 'workshop');

    const getDefaultSessionIdsForTicket = (ticket: any) => {
        const linkedIds = getTicketSessionIds(ticket);
        if (isWorkshopTicket(ticket) && linkedIds.length > 1) return [];
        return linkedIds;
    };

    const getSelectedSessionIdsForTicket = (ticket: any) => {
        const linkedIds = new Set(getTicketSessionIds(ticket));
        return form.sessionIds.filter((sessionId) => linkedIds.has(sessionId));
    };

    const getTicketSessionSelections = () =>
        selectedTickets.map((ticket: any) => ({
            ticketTypeId: ticket.id,
            sessionIds: getSelectedSessionIdsForTicket(ticket),
        }));

    useEffect(() => {
        if (selectedTicket?.category !== 'primary' && form.addonTicketTypeIds.length > 0) {
            setForm(prev => ({ ...prev, addonTicketTypeIds: [], sessionIds: getTicketSessionIds(selectedTicket) }));
        }
    }, [selectedTicket, form.addonTicketTypeIds.length]);

    useEffect(() => {
        if (!selectedTicket || form.sessionIds.length === 0) return;

        const cleanedSessionIds = form.sessionIds.filter((id) => linkedSessionIdsForSelectedTickets.has(id));

        if (cleanedSessionIds.length !== form.sessionIds.length) {
            setForm(prev => ({
                ...prev,
                sessionIds: prev.sessionIds.filter((id) => linkedSessionIdsForSelectedTickets.has(id)),
            }));
        }
    }, [selectedTicket, form.sessionIds, linkedSessionsForSelectedTickets]);

    const getSoldCount = (ticket: any) => ticket.soldCount ?? ticket.sold ?? 0;
    const formatTicketPrice = (ticket: any) => {
        const price = Number(ticket.price);
        const amount = Number.isFinite(price) ? price.toLocaleString() : ticket.price;
        return `${ticket.currency || 'THB'} ${amount}`;
    };

    // Debounced user search
    const debouncedUserSearch = useDebounce(userSearch, 300);
    useEffect(() => {
        if (debouncedUserSearch && debouncedUserSearch.length >= 2) {
            const token = getBackofficeToken();
            api.members.list(token, `search=${encodeURIComponent(debouncedUserSearch)}&limit=20&status=active`)
                .then(res => setUserResults(res.members as any[]))
                .catch(() => setUserResults([]));
        } else {
            setUserResults([]);
        }
    }, [debouncedUserSearch]);

    const handleUserSelect = (user: any) => {
        // Check if already selected
        if (selectedUsers.some(u => u.id === user.id)) {
            return;
        }
        setSelectedUsers(prev => [...prev, user]);
        setUserSearch('');
        setUserResults([]);
    };

    const handleUserRemove = (userId: number) => {
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedUsers.length === 0 || !form.eventId || !form.ticketTypeId) {
            toast.error('Please select at least one user, event, and ticket type');
            return;
        }

        // Filter out already registered users
        const validUsers = selectedUsers.filter(u => !registeredUserIds.has(u.id));
        if (validUsers.length === 0) {
            toast.error('All selected users are already registered');
            return;
        }

        const ticketSessionSelections = getTicketSessionSelections();
        for (const ticket of selectedTickets) {
            const linkedSessionIds = getTicketSessionIds(ticket);
            const selectedSessionIds = getSelectedSessionIdsForTicket(ticket);
            if (linkedSessionIds.length > 0 && selectedSessionIds.length === 0) {
                toast.error(`Please select at least one session for ${ticket.name}`);
                return;
            }
            if (isWorkshopTicket(ticket) && selectedSessionIds.length !== 1) {
                toast.error(`Please select exactly one workshop session for ${ticket.name}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const token = getBackofficeToken();
            const userIds = validUsers.map(u => u.id);

            const result = await api.registrations.batchManualAdd(token, {
                userIds,
                eventId: form.eventId,
                ticketTypeId: form.ticketTypeId,
                addonTicketTypeIds: form.addonTicketTypeIds.length > 0 ? form.addonTicketTypeIds : undefined,
                ticketSessionSelections,
                note: form.note || undefined,
            });

            if (result.addedCount > 0) {
                toast.success(`${result.addedCount} registration(s) added successfully!`);
            }
            if (result.skippedList.length > 0) {
                toast(`${result.skippedList.length} user(s) skipped`, { icon: '⚠️' });
            }

            router.push('/registrations');
        } catch (err: any) {
            toast.error(err.message || 'Failed to add registrations');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Add Registration">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/registrations"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <IconArrowLeft size={18} />
                        Back to Registrations
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Add Registration</h1>
                    <p className="text-gray-600 mt-1">Manually register a user for an event</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Step 1: Event Selection */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <IconCalendar size={20} />
                            Event Selection
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
                            <select
                                value={form.eventId}
                                onChange={(e) => {
                                    const eid = Number(e.target.value);
                                    setForm(prev => ({ ...prev, eventId: eid, ticketTypeId: 0, addonTicketTypeIds: [], sessionIds: [] }));
                                }}
                                className="input-field"
                            >
                                <option value={0}>Select Event</option>
                                {eventsList.map((ev: any) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.eventName} ({ev.eventCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedEvent && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900">{selectedEvent.eventName}</p>
                                {selectedEvent.location && (
                                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                        <IconMapPin size={14} />
                                        {selectedEvent.location}
                                    </p>
                                )}
                                {selectedEvent.startDate && selectedEvent.endDate && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Ticket Selection */}
                    {primaryTickets.length > 0 && (
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <IconTicket size={20} />
                                Primary Ticket Type
                            </h2>

                            <div className="relative" ref={ticketDropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Ticket Type *</label>
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search tickets..."
                                        value={ticketSearch}
                                        onChange={(e) => {
                                            setTicketSearch(e.target.value);
                                            setIsTicketDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsTicketDropdownOpen(true)}
                                        className="input-field !pl-12"
                                    />
                                    {selectedTicket && !isTicketDropdownOpen && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm(prev => ({ ...prev, ticketTypeId: 0, addonTicketTypeIds: [], sessionIds: [] }));
                                                setSelectedTicket(null);
                                                setTicketSearch('');
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <IconX size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Ticket dropdown */}
                                {isTicketDropdownOpen && (
                                    <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto z-10">
                                        {primaryTickets
                                            .filter((t: any) =>
                                                t.name.toLowerCase().includes(ticketSearch.toLowerCase())
                                            )
                                            .map((t: any) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm(prev => ({
                                                            ...prev,
                                                            ticketTypeId: t.id,
                                                            addonTicketTypeIds: [],
                                                            sessionIds: getDefaultSessionIdsForTicket(t),
                                                        }));
                                                        setSelectedTicket(t);
                                                        setTicketSearch(t.name);
                                                        setIsTicketDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer ${
                                                        form.ticketTypeId === t.id ? 'bg-blue-50' : ''
                                                    }`}
                                                >
                                                    <div className="font-medium text-gray-900">{t.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {getSoldCount(t)} sold / {t.quota} available
                                                        {t.category && (
                                                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                                                t.category === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                                {t.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        {primaryTickets.filter((t: any) =>
                                            t.name.toLowerCase().includes(ticketSearch.toLowerCase())
                                        ).length === 0 && (
                                            <div className="px-4 py-3 text-gray-500 text-center">
                                                No tickets found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedTicket && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">{selectedTicket.name}</p>
                                    {selectedTicket.description && (
                                        <p className="text-sm text-gray-600">{selectedTicket.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                        {getSoldCount(selectedTicket)} sold / {selectedTicket.quota} available
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add-ons Selection */}
                    {selectedTicket?.category === 'primary' && addonTickets.length > 0 && (
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <IconTicket size={20} />
                                Add-ons
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Optional: add Gala or other add-on tickets in the same registration. Add-on sessions will be linked from the selected add-on ticket type.
                            </p>

                            <div className="space-y-3">
                                {addonTickets.map((ticket: any) => {
                                    const checked = form.addonTicketTypeIds.includes(ticket.id);
                                    const soldCount = getSoldCount(ticket);
                                    const soldOut = ticket.quota > 0 && soldCount >= ticket.quota;

                                    return (
                                        <label
                                            key={ticket.id}
                                            className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                                                soldOut
                                                    ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                                                    : checked
                                                        ? 'bg-pink-50 border-pink-300'
                                                        : 'bg-white border-gray-200 hover:border-pink-200 cursor-pointer'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={soldOut}
                                                onChange={(e) => {
                                                    const ticketSessionIds = getTicketSessionIds(ticket);
                                                    const defaultSessionIds = getDefaultSessionIdsForTicket(ticket);
                                                    const ids = e.target.checked
                                                        ? [...form.addonTicketTypeIds, ticket.id]
                                                        : form.addonTicketTypeIds.filter((id: number) => id !== ticket.id);
                                                    setForm(prev => ({
                                                        ...prev,
                                                        addonTicketTypeIds: ids,
                                                        sessionIds: e.target.checked
                                                            ? [...new Set([...prev.sessionIds, ...defaultSessionIds])]
                                                            : prev.sessionIds.filter((id) => !ticketSessionIds.includes(id)),
                                                    }));
                                                }}
                                                className="mt-1 accent-pink-600"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-medium text-gray-900">{ticket.name}</p>
                                                    {ticket.groupName && (
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700">
                                                            {ticket.groupName}
                                                        </span>
                                                    )}
                                                    {soldOut && (
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                                            Sold out
                                                        </span>
                                                    )}
                                                </div>
                                                {ticket.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                                                    <span>{formatTicketPrice(ticket)}</span>
                                                    <span>{soldCount} sold / {ticket.quota > 0 ? ticket.quota : 'unlimited'} available</span>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sessions Selection */}
                    {selectedTicket && (() => {
                        const mainSessions = linkedSessionsForSelectedTickets.filter((s: any) => s.isMainSession);
                        const subSessions = linkedSessionsForSelectedTickets.filter((s: any) => !s.isMainSession);

                        const sessionTypeConfig: Record<string, { label: string; bg: string; border: string; text: string }> = {
                            workshop: { label: 'Workshop', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                            gala_dinner: { label: 'Gala Dinner', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
                            lecture: { label: 'Lecture', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                            ceremony: { label: 'Ceremony', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                            break: { label: 'Break', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
                            other: { label: 'Other', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
                        };

                        const groupedSubSessions = subSessions.reduce((acc: Record<string, any[]>, session: any) => {
                            const type = session.sessionType || 'other';
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(session);
                            return acc;
                        }, {});

                        const renderSessionItem = (session: any, colorConfig: typeof sessionTypeConfig[string]) => {
                            const ownerTicket = selectedAddonTickets.find((ticket: any) =>
                                getTicketSessionIds(ticket).includes(session.id)
                            ) || selectedTicket;
                            const ownerSessionIds = getTicketSessionIds(ownerTicket);
                            const ownerIsWorkshop = isWorkshopTicket(ownerTicket);
                            const checked = form.sessionIds.includes(session.id);

                            return (
                                <label
                                    key={session.id}
                                    className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${colorConfig.bg} ${colorConfig.border} ${
                                        checked ? 'ring-1 ring-green-300' : 'opacity-75'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                            setForm(prev => {
                                                const withoutThisTicket = prev.sessionIds.filter((id) => !ownerSessionIds.includes(id));
                                                const withoutThisSession = prev.sessionIds.filter((id) => id !== session.id);
                                                const sessionIds = e.target.checked
                                                    ? ownerIsWorkshop
                                                        ? [...withoutThisTicket, session.id]
                                                        : [...new Set([...prev.sessionIds, session.id])]
                                                    : withoutThisSession;
                                                return { ...prev, sessionIds };
                                            });
                                        }}
                                        className="mt-1 accent-current"
                                    />
                                    <div className="flex-1">
                                        <p className={`font-medium ${colorConfig.text}`}>{session.sessionName}</p>
                                        {session.description && (
                                            <p className="text-sm text-gray-600 mt-0.5">{session.description}</p>
                                        )}
                                        {ownerTicket && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Linked from {ownerTicket.name}{ownerIsWorkshop ? ' - select one workshop session only.' : ''}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                            {session.startTime && (
                                                <span>{new Date(session.startTime).toLocaleString()}</span>
                                            )}
                                            {session.room && <span>• {session.room}</span>}
                                        </div>
                                    </div>
                                </label>
                            );
                        };

                        return (
                            <div className="card">
                                <h2 className="text-lg font-semibold mb-2">Linked Sessions</h2>
                                <p className="text-sm text-gray-600 mb-4">
                                    Showing sessions linked to the selected primary ticket and selected add-ons.
                                </p>

                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                                    {linkedSessionsForSelectedTickets.length === 0 && (
                                        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            No sessions are linked to the selected ticket type.
                                        </p>
                                    )}

                                    {/* Main Sessions */}
                                    {mainSessions.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                Main Sessions
                                            </h3>
                                            <div className="space-y-2">
                                                {mainSessions.map((session: any) =>
                                                    renderSessionItem(session, { label: 'Main', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' })
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub Sessions grouped by type */}
                                    {Object.keys(groupedSubSessions).length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                Sub Sessions
                                            </h3>
                                            <div className="space-y-4">
                                                {Object.entries(groupedSubSessions).map(([type, sessions]) => {
                                                    const config = sessionTypeConfig[type] || sessionTypeConfig.other;
                                                    return (
                                                        <div key={type}>
                                                            <p className={`text-xs font-medium ${config.text} mb-2 uppercase tracking-wide`}>
                                                                {config.label}
                                                            </p>
                                                            <div className="space-y-2">
                                                                {(sessions as any[]).map((session: any) =>
                                                                    renderSessionItem(session, config)
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* User Selection - after Event/Ticket so registeredUserIds is populated */}
                    {form.eventId > 0 && form.ticketTypeId > 0 && (
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <IconUser size={20} />
                                User Selection
                            </h2>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Users * <span className="text-gray-400 font-normal">(select multiple)</span>
                                </label>
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="input-field !pl-12"
                                    />
                                </div>

                                {/* User results dropdown */}
                                {userResults.length > 0 && (
                                    <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto z-10">
                                        {userResults.map((user: any) => {
                                            const isAlreadySelected = selectedUsers.some(u => u.id === user.id);
                                            const isRegistered = registeredUserIds.has(user.id);
                                            const isDisabled = isAlreadySelected || isRegistered;

                                            return (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => !isDisabled && handleUserSelect(user)}
                                                    disabled={isDisabled}
                                                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 flex items-center justify-between ${
                                                        isDisabled
                                                            ? 'bg-gray-50 cursor-not-allowed opacity-60'
                                                            : 'hover:bg-blue-50 cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">
                                                            {getFullName(user.firstName, user.middleName, user.lastName)}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {user.role} {user.institution ? `• ${user.institution}` : ''}
                                                        </div>
                                                    </div>
                                                    {isRegistered && (
                                                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1 shrink-0">
                                                            <IconAlertCircle size={12} />
                                                            {ticketCategory === 'primary' ? 'Has Primary Ticket' : 'Has This Add-on'}
                                                        </span>
                                                    )}
                                                    {isAlreadySelected && !isRegistered && (
                                                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1 shrink-0">
                                                            <IconCheck size={12} />
                                                            Selected
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Selected Users List */}
                            {selectedUsers.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Selected Users ({selectedUsers.length})
                                    </p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedUsers.map((user: any) => {
                                            const isRegistered = registeredUserIds.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg ${
                                                        isRegistered ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50'
                                                    }`}
                                                >
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${isRegistered ? 'text-yellow-800' : 'text-blue-900'}`}>
                                                            {getFullName(user.firstName, user.middleName, user.lastName)}
                                                        </p>
                                                        <p className={`text-sm ${isRegistered ? 'text-yellow-700' : 'text-blue-700'}`}>
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                    {isRegistered && (
                                                        <span className="mr-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full shrink-0">
                                                            {ticketCategory === 'primary' ? 'Has Primary Ticket' : 'Has This Add-on'}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUserRemove(user.id)}
                                                        className={`p-1 rounded-full hover:bg-opacity-50 ${
                                                            isRegistered ? 'text-yellow-600 hover:bg-yellow-200' : 'text-blue-600 hover:bg-blue-200'
                                                        }`}
                                                    >
                                                        <IconX size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedUsers.some(u => registeredUserIds.has(u.id)) && (
                                        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                                            <IconAlertCircle size={14} />
                                            {ticketCategory === 'primary'
                                            ? 'Users with a primary ticket (Early Bird / Regular) will be skipped'
                                            : 'Users who already have this add-on will be skipped'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Note */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Note</h2>
                        <textarea
                            value={form.note}
                            onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="เหตุผลที่ add เช่น VIP guest, Speaker, จ่ายเงินสดหน้างาน..."
                            className="input-field"
                            rows={4}
                        />
                    </div>

                    {/* Review & Submit */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Review</h2>

                        {selectedUsers.length > 0 && selectedEvent && selectedTicket ? (
                            <div className="space-y-3 text-sm">
                                <div className="py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Users:</span>
                                    <div className="mt-1">
                                        {selectedUsers.filter(u => !registeredUserIds.has(u.id)).length > 0 ? (
                                            <span className="font-medium text-green-700">
                                                {selectedUsers.filter(u => !registeredUserIds.has(u.id)).length} user(s) will be registered
                                            </span>
                                        ) : (
                                            <span className="font-medium text-yellow-700">
                                                No valid users to register
                                            </span>
                                        )}
                                        {selectedUsers.filter(u => registeredUserIds.has(u.id)).length > 0 && (
                                            <span className="text-yellow-600 ml-2">
                                                ({selectedUsers.filter(u => registeredUserIds.has(u.id)).length} already registered, will be skipped)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Event:</span>
                                    <span className="font-medium">{selectedEvent.eventName}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Ticket:</span>
                                    <span className="font-medium">{selectedTicket.name}</span>
                                </div>
                                {selectedAddonTickets.length > 0 && (
                                    <div className="py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Add-ons:</span>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {selectedAddonTickets.map((ticket: any) => (
                                                <span key={ticket.id} className="px-2 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">
                                                    {ticket.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {form.sessionIds.length > 0 && (
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Selected Sessions:</span>
                                        <span className="font-medium">{form.sessionIds.length} selected</span>
                                    </div>
                                )}
                                {form.note && (
                                    <div className="py-2">
                                        <span className="text-gray-600">Note:</span>
                                        <p className="font-medium mt-1">{form.note}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Please select at least one user, event, and ticket type to review.</p>
                        )}

                        <div className="flex gap-3 mt-6">
                            <Link href="/registrations" className="btn-secondary">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                className="btn-primary flex items-center gap-2"
                                disabled={isSubmitting || selectedUsers.length === 0 || !form.eventId || !form.ticketTypeId || selectedUsers.filter(u => !registeredUserIds.has(u.id)).length === 0}
                            >
                                {isSubmitting ? (
                                    <>
                                        <IconLoader2 size={18} className="animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <IconUserPlus size={18} />
                                        Add {selectedUsers.filter(u => !registeredUserIds.has(u.id)).length || ''} Registration{selectedUsers.filter(u => !registeredUserIds.has(u.id)).length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
    IconCalendarEvent,
    IconLayoutGrid,
    IconTicket,
    IconPhoto,
    IconArrowLeft,
    IconCheck,
    IconPlus,
    IconTrash,
    IconX,
    IconLoader2,
    IconMicrophone,
    IconPencil,
    IconTarget,
} from '@tabler/icons-react';

interface Speaker {
    id: number;
    firstName: string;
    lastName: string;
    organization: string | null;
}

// Types
interface SessionData {
    id?: number;
    sessionCode: string;
    sessionName: string;
    description: string;
    room: string;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    selectedSpeakerIds?: number[];
    isNew?: boolean;
}

interface TicketData {
    id?: number;
    name: string;
    category: 'primary' | 'addon';
    price: string;
    currency: 'THB' | 'USD';
    quota: string;
    saleStartDate: string;
    saleEndDate: string;
    allowedRoles: string[];
    sessionIds?: number[];
    sessionId?: number;
    isNew?: boolean;
}

interface VenueImage {
    id?: number;
    imageUrl: string;
    caption: string;
    isNew?: boolean;
}

interface EventFormData {
    eventCode: string;
    eventName: string;
    description: string;
    eventType: 'single_room' | 'multi_session';
    location: string;
    mapUrl: string;
    startDate: string;
    endDate: string;
    maxCapacity: number;
    conferenceCode: string;
    cpeCredits: string;
    status: 'draft' | 'published' | 'cancelled' | 'completed';
}

const roleOptions = [
    { value: 'medical_physician', label: 'Medical Physician' },
    { value: 'medical_student', label: 'Medical Student' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'allied_health', label: 'Allied Health' },
    { value: 'general_public', label: 'General Public' },
];

// Helper to convert ISO date to datetime-local format
const toDateTimeLocal = (isoString: string): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toISOString().slice(0, 16);
    } catch {
        return '';
    }
};

// Helper function to format datetime
const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '-';
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } catch {
        return dateTimeStr;
    }
};

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;

    const [activeTab, setActiveTab] = useState<'details' | 'sessions' | 'tickets' | 'venue'>('details');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [formData, setFormData] = useState<EventFormData>({
        eventCode: '',
        eventName: '',
        description: '',
        eventType: 'single_room',
        location: '',
        mapUrl: '',
        startDate: '',
        endDate: '',
        maxCapacity: 100,
        conferenceCode: '',
        cpeCredits: '',
        status: 'draft',
    });

    // Sessions, Tickets, Images
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [venueImages, setVenueImages] = useState<VenueImage[]>([]);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [imageCaption, setImageCaption] = useState('');

    // Modals
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [editingTicketId, setEditingTicketId] = useState<number | null>(null);

    // Session form
    const [sessionForm, setSessionForm] = useState<SessionData>({
        sessionCode: '',
        sessionName: '',
        description: '',
        room: '',
        startTime: '',
        endTime: '',
        maxCapacity: 50,
        selectedSpeakerIds: [],
    });

    // Ticket form
    const [ticketForm, setTicketForm] = useState<TicketData>({
        name: '',
        category: 'primary',
        price: '',
        currency: 'THB',
        quota: '100',
        saleStartDate: '',
        saleEndDate: '',
        allowedRoles: [],
        sessionIds: [],
    });

    const shouldShowSessions = formData.eventType === 'multi_session';

    // Fetch existing event data and speakers
    useEffect(() => {
        const fetchSpeakers = async () => {
            try {
                const token = localStorage.getItem('backoffice_token') || '';
                const res = await api.speakers.list(token);
                setSpeakers(res.speakers as unknown as Speaker[]);
            } catch (err) {
                console.error('Failed to fetch speakers:', err);
            }
        };
        fetchSpeakers();

        const fetchEvent = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('backoffice_token') || '';
                const response = await api.backofficeEvents.get(token, parseInt(eventId));
                const event = response.event;

                setFormData({
                    eventCode: event.eventCode || '',
                    eventName: event.eventName || '',
                    description: event.description || '',
                    eventType: event.eventType || 'single_room',
                    location: event.location || '',
                    mapUrl: event.mapUrl || '',
                    startDate: toDateTimeLocal(event.startDate),
                    endDate: toDateTimeLocal(event.endDate),
                    maxCapacity: event.maxCapacity || 100,
                    conferenceCode: event.conferenceCode || '',
                    cpeCredits: event.cpeCredits || '',
                    status: event.status || 'draft',
                });

                // Load sessions
                if (response.sessions) {
                    setSessions(response.sessions.map((s: any) => ({
                        id: s.id,
                        sessionCode: s.sessionCode,
                        sessionName: s.sessionName,
                        description: s.description || '',
                        room: s.room || '',
                        startTime: toDateTimeLocal(s.startTime),
                        endTime: toDateTimeLocal(s.endTime),
                        maxCapacity: s.maxCapacity || 50,
                    })));
                }

                // Load tickets
                if (response.tickets) {
                    setTickets(response.tickets.map((t: any) => {
                        // Parse allowedRoles from JSON string
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
                            name: t.name,
                            category: t.category,
                            price: t.price,
                            currency: t.currency || 'THB',
                            quota: String(t.quota || 0),
                            saleStartDate: t.saleStartDate ? toDateTimeLocal(t.saleStartDate) : '',
                            saleEndDate: t.saleEndDate ? toDateTimeLocal(t.saleEndDate) : '',
                            allowedRoles: roles,
                            sessionIds: t.sessionIds || (t.sessionId ? [t.sessionId] : []),
                        };
                    }));
                }

                // Load venue images
                if (response.venueImages) {
                    setVenueImages(response.venueImages.map((img: any) => ({
                        id: img.id,
                        imageUrl: img.imageUrl,
                        caption: img.caption || '',
                    })));
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch event');
            } finally {
                setIsLoading(false);
            }
        };

        if (eventId) {
            fetchEvent();
        }
    }, [eventId]);

    // Add/Update session
    const handleAddSession = async () => {
        if (!sessionForm.sessionCode || !sessionForm.sessionName) return;
        try {
            const token = localStorage.getItem('backoffice_token') || '';

            // Get speaker names from selected IDs
            const speakerNames = (sessionForm.selectedSpeakerIds || []).map(id => {
                const speaker = speakers.find(s => s.id === id);
                return speaker ? `${speaker.firstName} ${speaker.lastName}` : '';
            }).filter(Boolean);

            if (editingSessionId) {
                // Update existing session
                await api.backofficeEvents.updateSession(token, parseInt(eventId), editingSessionId, {
                    sessionCode: sessionForm.sessionCode,
                    sessionName: sessionForm.sessionName,
                    description: sessionForm.description || undefined,
                    room: sessionForm.room || undefined,
                    startTime: new Date(sessionForm.startTime).toISOString(),
                    endTime: new Date(sessionForm.endTime).toISOString(),
                    speakers: JSON.stringify(speakerNames),
                    maxCapacity: sessionForm.maxCapacity,
                });
                setSessions(prev => prev.map(s =>
                    s.id === editingSessionId ? {
                        ...sessionForm,
                        id: editingSessionId,
                    } : s
                ));
                setEditingSessionId(null);
                toast.success('Session updated successfully');
            } else {
                // Create new session
                const response = await api.backofficeEvents.createSession(token, parseInt(eventId), {
                    sessionCode: sessionForm.sessionCode,
                    sessionName: sessionForm.sessionName,
                    description: sessionForm.description || undefined,
                    room: sessionForm.room || undefined,
                    startTime: new Date(sessionForm.startTime).toISOString(),
                    endTime: new Date(sessionForm.endTime).toISOString(),
                    speakers: JSON.stringify(speakerNames),
                    maxCapacity: sessionForm.maxCapacity,
                });
                const session = response.session as Record<string, unknown>;
                setSessions(prev => [...prev, {
                    id: session.id as number,
                    sessionCode: session.sessionCode as string,
                    sessionName: session.sessionName as string,
                    description: (session.description as string) || '',
                    room: (session.room as string) || '',
                    startTime: toDateTimeLocal(session.startTime as string),
                    endTime: toDateTimeLocal(session.endTime as string),
                    maxCapacity: (session.maxCapacity as number) || 50,
                    selectedSpeakerIds: sessionForm.selectedSpeakerIds,
                }]);
                toast.success('Session created successfully');
            }
            setSessionForm({ sessionCode: '', sessionName: '', description: '', room: '', startTime: '', endTime: '', maxCapacity: 50, selectedSpeakerIds: [] });
            setShowSessionModal(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save session');
        }
    };

    // Edit session
    const handleEditSession = (session: SessionData) => {
        setSessionForm({
            sessionCode: session.sessionCode,
            sessionName: session.sessionName,
            description: session.description || '',
            room: session.room || '',
            startTime: session.startTime,
            endTime: session.endTime,
            maxCapacity: session.maxCapacity,
            selectedSpeakerIds: session.selectedSpeakerIds || [],
        });
        setEditingSessionId(session.id!);
        setShowSessionModal(true);
    };

    // Delete session
    const handleDeleteSession = async (id: number) => {
        if (!confirm('Delete this session?')) return;
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.backofficeEvents.deleteSession(token, parseInt(eventId), id);
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete session');
        }
    };

    // Add ticket
    const handleAddTicket = async () => {
        if (!ticketForm.name || !ticketForm.price) return;
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            // Build payload with correct types for backend
            const ticketPayload: Record<string, unknown> = {
                name: ticketForm.name,
                category: ticketForm.category,
                price: ticketForm.price, // Keep as string
                currency: ticketForm.currency,
                quota: parseInt(ticketForm.quota) || 0,
                allowedRoles: JSON.stringify(ticketForm.allowedRoles),
                sessionIds: ticketForm.category === 'addon' ? ticketForm.sessionIds : [],
            };
            if (ticketForm.saleEndDate) {
                ticketPayload.saleEndDate = new Date(ticketForm.saleEndDate).toISOString();
            }

            if (editingTicketId) {
                // Update existing ticket
                await api.backofficeEvents.updateTicket(token, parseInt(eventId), editingTicketId, ticketPayload);

                // Fetch the updated ticket from response or just update local state
                // Since updateTicket returns the updated ticket, we use it
                // But simplified here, we construct it from form

                setTickets(prev => prev.map(t =>
                    t.id === editingTicketId ? {
                        ...t,
                        id: editingTicketId,
                        name: ticketForm.name,
                        category: ticketForm.category,
                        price: ticketForm.price,
                        currency: ticketForm.currency,
                        quota: ticketForm.quota,
                        allowedRoles: ticketForm.allowedRoles,
                        saleStartDate: ticketForm.saleStartDate,
                        saleEndDate: ticketForm.saleEndDate,
                        sessionIds: ticketForm.category === 'addon' ? ticketForm.sessionIds : [],
                    } : t
                ));
                setEditingTicketId(null);
                toast.success('Ticket updated successfully');
            } else {
                // Create new ticket
                const response = await api.backofficeEvents.createTicket(token, parseInt(eventId), ticketPayload);
                const ticket = response.ticket as Record<string, unknown>;
                // Parse allowedRoles back from JSON string
                let roles: string[] = [];
                if (ticket.allowedRoles) {
                    try {
                        roles = typeof ticket.allowedRoles === 'string'
                            ? JSON.parse(ticket.allowedRoles)
                            : ticket.allowedRoles as string[];
                    } catch {
                        roles = [];
                    }
                }
                setTickets(prev => [...prev, {
                    id: ticket.id as number,
                    name: ticket.name as string,
                    category: ticket.category as 'primary' | 'addon',
                    price: String(ticket.price),
                    currency: (ticket.currency as 'THB' | 'USD') || 'THB',
                    quota: String(ticket.quota || 0),
                    saleStartDate: ticket.saleStartDate ? toDateTimeLocal(ticket.saleStartDate as string) : '',
                    saleEndDate: ticket.saleEndDate ? toDateTimeLocal(ticket.saleEndDate as string) : '',
                    allowedRoles: roles,
                    sessionIds: (ticket.sessionIds as number[]) || (ticket.sessionId ? [ticket.sessionId as number] : []),
                }]);
                toast.success('Ticket created successfully');
            }

            setTicketForm({
                name: '',
                category: 'primary',
                price: '',
                currency: 'THB',
                quota: '100',
                saleStartDate: '',
                saleEndDate: '',
                allowedRoles: [],
                sessionIds: [],
            });
            setShowTicketModal(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save ticket');
        }
    };

    // Edit ticket
    const handleEditTicket = (ticket: TicketData) => {
        setTicketForm({
            name: ticket.name,
            category: ticket.category,
            price: ticket.price,
            currency: ticket.currency,
            quota: ticket.quota,
            saleStartDate: ticket.saleStartDate,
            saleEndDate: ticket.saleEndDate,
            allowedRoles: ticket.allowedRoles || [],
            sessionIds: ticket.sessionIds || (ticket.sessionId ? [ticket.sessionId] : []),
        });
        setEditingTicketId(ticket.id!);
        setShowTicketModal(true);
    };

    // Delete ticket
    const handleDeleteTicket = async (id: number) => {
        if (!confirm('Delete this ticket?')) return;
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.backofficeEvents.deleteTicket(token, parseInt(eventId), id);
            setTickets(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete ticket');
        }
    };

    // Delete venue image
    const handleDeleteImage = async (id: number) => {
        if (!confirm('Delete this image?')) return;
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.backofficeEvents.deleteImage(token, parseInt(eventId), id);
            setVenueImages(prev => prev.filter(img => img.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete image');
        }
    };

    // Generate upload handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large (max 5MB)');
            return;
        }

        setIsUploading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const formData = new FormData();
            formData.append('file', file);

            // 1. Upload to Drive
            const uploadRes = await api.upload.venueImage(token, formData);

            // 2. Add to DB
            const dbRes = await api.backofficeEvents.addImage(token, parseInt(eventId), {
                url: uploadRes.url,
                caption: imageCaption || file.name,
            });

            const image = dbRes.image as Record<string, unknown>;
            setVenueImages(prev => [...prev, {
                id: image.id as number,
                imageUrl: (image.imageUrl as string) || (image.url as string) || uploadRes.url,
                caption: (image.caption as string) || imageCaption || file.name,
            }]);
            setImageCaption('');
            e.target.value = ''; // Reset input
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    // Save event details
    const handleSaveDetails = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const eventData = {
                eventCode: formData.eventCode,
                eventName: formData.eventName,
                description: formData.description || undefined,
                eventType: formData.eventType,
                location: formData.location || undefined,
                mapUrl: formData.mapUrl || undefined,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                maxCapacity: formData.maxCapacity,
                conferenceCode: formData.conferenceCode || undefined,
                cpeCredits: formData.cpeCredits || undefined,
                status: formData.status,
            };

            await api.backofficeEvents.update(token, parseInt(eventId), eventData);
            toast.success('Event details saved!');
        } catch (err: any) {
            setError(err.message || 'Failed to save event');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout title="Edit Event">
                <div className="flex items-center justify-center py-12">
                    <IconLoader2 size={32} className="animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-500">Loading event...</span>
                </div>
            </AdminLayout>
        );
    }

    const tabs = [
        { id: 'details', label: 'Event Details', icon: IconCalendarEvent },
        ...(shouldShowSessions ? [{ id: 'sessions', label: 'Sessions', icon: IconLayoutGrid }] : []),
        { id: 'tickets', label: 'Tickets', icon: IconTicket },
        { id: 'venue', label: 'Venue/Images', icon: IconPhoto },
    ];

    return (
        <AdminLayout title={`Edit Event`}>
            {/* Back Button */}
            <div className="mb-4">
                <Link href="/events" className="btn-secondary inline-flex items-center gap-2">
                    <IconArrowLeft size={18} /> Back to Events
                </Link>
            </div>

            {/* Prominent Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <IconCalendarEvent size={32} />
                        </div>
                        <div>
                            <p className="text-blue-200 text-sm font-medium mb-1">{formData.eventCode}</p>
                            <h1 className="text-2xl font-bold">{formData.eventName || 'Untitled Event'}</h1>
                            <p className="text-blue-200 text-sm mt-1">
                                {formData.location || 'No location set'} • {formData.conferenceCode && `CPE: ${formData.conferenceCode}`}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${formData.status === 'published' ? 'bg-green-500' :
                            formData.status === 'draft' ? 'bg-yellow-500' :
                                formData.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                            }`}>
                            {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                        </span>
                        <p className="text-blue-200 text-sm mt-2">
                            {formData.startDate && new Date(formData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Event Details Tab */}
            {activeTab === 'details' && (
                <div className="card">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Code *</label>
                            <input
                                type="text"
                                className="input-field"
                                value={formData.eventCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventCode: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                            <select
                                className="input-field"
                                value={formData.eventType}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value as any }))}
                            >
                                <option value="single_room">Single Room</option>
                                <option value="multi_session">Multi Session</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.eventName}
                            onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="input-field h-24"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                            <input
                                type="datetime-local"
                                className="input-field"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                            <input
                                type="datetime-local"
                                className="input-field"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                className="input-field"
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
                            <input
                                type="url"
                                className="input-field"
                                value={formData.mapUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, mapUrl: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.maxCapacity}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 100 }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conference Code (CPE)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g., ACCP2026"
                                value={formData.conferenceCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, conferenceCode: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CPE Credits</label>
                            <input
                                type="text"
                                className="input-field"
                                value={formData.cpeCredits}
                                onChange={(e) => setFormData(prev => ({ ...prev, cpeCredits: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="input-field w-48"
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <hr className="my-6" />

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveDetails}
                            disabled={isSubmitting}
                            className="btn-primary flex items-center gap-2"
                        >
                            {isSubmitting ? <IconLoader2 size={18} className="animate-spin" /> : <IconCheck size={18} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && shouldShowSessions && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Sessions</h3>
                        <button onClick={() => setShowSessionModal(true)} className="btn-primary flex items-center gap-2">
                            <IconPlus size={18} /> Add Session
                        </button>
                    </div>

                    {/* Sessions Table */}
                    {sessions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Session Name</th>
                                        <th>Room</th>
                                        <th>Time</th>
                                        <th>Capacity</th>
                                        <th className="w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session) => (
                                        <tr key={session.id}>
                                            <td className="font-mono text-sm">{session.sessionCode}</td>
                                            <td>{session.sessionName}</td>
                                            <td>{session.room || '-'}</td>
                                            <td className="text-sm">{formatDateTime(session.startTime)}</td>
                                            <td>{session.maxCapacity}</td>
                                            <td className="flex gap-1">
                                                <button
                                                    onClick={() => handleEditSession(session)}
                                                    className="p-1.5 hover:bg-blue-100 rounded"
                                                >
                                                    <IconPencil size={18} className="text-blue-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSession(session.id!)}
                                                    className="p-1.5 hover:bg-red-100 rounded"
                                                >
                                                    <IconTrash size={18} className="text-red-600" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No sessions yet. Click "Add Session" to create one.
                        </div>
                    )}
                </div>
            )
            }

            {/* Tickets Tab */}
            {
                activeTab === 'tickets' && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Ticket Types</h3>
                            <button onClick={() => setShowTicketModal(true)} className="btn-primary flex items-center gap-2">
                                <IconPlus size={18} /> Add Ticket
                            </button>
                        </div>

                        {tickets.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Ticket Name</th>
                                            <th>Category</th>
                                            <th>Price</th>
                                            <th>Quota</th>
                                            <th>Allowed Roles</th>
                                            <th>Sale Period</th>
                                            <th className="w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((ticket) => (
                                            <tr key={ticket.id}>
                                                <td className="font-medium">{ticket.name}</td>
                                                <td>
                                                    <span className={`badge ${ticket.category === 'primary' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                        {ticket.category === 'primary' ? 'Primary' : 'Add-on'}
                                                    </span>
                                                    {ticket.category === 'addon' && ticket.sessionIds && ticket.sessionIds.length > 0 && (
                                                        <div className="text-xs text-purple-600 mt-1">
                                                            {ticket.sessionIds.length === 1 ? (
                                                                <>→ {sessions.find(s => s.id === ticket.sessionIds![0])?.sessionName || `Session #${ticket.sessionIds![0]}`}</>
                                                            ) : (
                                                                <>→ {ticket.sessionIds.length} sessions linked</>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="font-semibold">{ticket.currency} {Number(ticket.price).toLocaleString()}</td>
                                                <td>{ticket.quota}</td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1">
                                                        {ticket.allowedRoles?.length ? (
                                                            ticket.allowedRoles.map(role => (
                                                                <span key={role} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                                    {roleOptions.find(r => r.value === role)?.label || role}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400">All</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="text-xs text-gray-500">
                                                        <div>{formatDateTime(ticket.saleStartDate)}</div>
                                                        <div>to {formatDateTime(ticket.saleEndDate)}</div>
                                                    </div>
                                                </td>
                                                <td className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEditTicket(ticket)}
                                                        className="p-1.5 hover:bg-blue-100 rounded"
                                                    >
                                                        <IconPencil size={18} className="text-blue-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTicket(ticket.id!)}
                                                        className="p-1.5 hover:bg-red-100 rounded"
                                                    >
                                                        <IconTrash size={18} className="text-red-600" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No tickets yet. Click "Add Ticket" to create one.
                            </div>
                        )}
                    </div>
                )
            }

            {/* Venue/Images Tab */}
            {
                activeTab === 'venue' && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Venue Images</h3>
                        </div>

                        <div className="bg-white p-4 border border-gray-200 rounded-lg mb-6 shadow-sm">
                            <h4 className="font-semibold mb-3 text-gray-800">Add New Image</h4>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. Main Hall"
                                        value={imageCaption}
                                        onChange={(e) => setImageCaption(e.target.value)}
                                        disabled={isUploading}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        id="venue-image-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                    <label
                                        htmlFor="venue-image-upload"
                                        className={`btn-primary flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isUploading ? <IconLoader2 size={18} className="animate-spin" /> : <IconPlus size={18} />}
                                        Upload Image
                                    </label>
                                </div>
                            </div>
                        </div>

                        {venueImages.length > 0 ? (
                            <div className="grid grid-cols-4 gap-4">
                                {venueImages.map((img) => (
                                    <div key={img.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="h-32 bg-gray-100 flex items-center justify-center">
                                            <img src={img.imageUrl} alt={img.caption} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="p-2 text-center">
                                            <button
                                                onClick={() => handleDeleteImage(img.id!)}
                                                className="text-red-600 hover:bg-red-100 p-1 rounded text-sm flex items-center gap-1 mx-auto"
                                            >
                                                <IconTrash size={14} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No venue images yet.
                            </div>
                        )}
                    </div>
                )
            }

            {/* Add Ticket Modal */}
            {
                showTicketModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <IconTicket size={20} /> {editingTicketId ? 'Edit Ticket' : 'Add Ticket Type'}
                                    </h3>
                                    <button onClick={() => { setShowTicketModal(false); setEditingTicketId(null); }} className="text-gray-400 hover:text-gray-600">
                                        <IconX size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                        <select
                                            className="input-field"
                                            value={ticketForm.category}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value as 'primary' | 'addon' }))}
                                        >
                                            <option value="primary">Primary</option>
                                            <option value="addon">Add-on</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
                                        <select
                                            className="input-field"
                                            value={ticketForm.allowedRoles[0] || 'thai_pharmacy'}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, allowedRoles: [e.target.value] }))}
                                        >
                                            <option value="thai_student">Thai Student</option>
                                            <option value="thai_pharmacy">Thai Pharmacy</option>
                                            <option value="intl_student">International Student</option>
                                            <option value="intl_pharmacy">International Pharmacy</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Session Selector - Only for Add-on tickets (Checkboxes) */}
                                {ticketForm.category === 'addon' && sessions.length > 0 && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Link to Sessions/Workshops *
                                        </label>
                                        <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                                            {sessions.map(session => (
                                                <label key={session.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1"
                                                        checked={ticketForm.sessionIds?.includes(session.id!) || false}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setTicketForm(prev => {
                                                                const currentIds = prev.sessionIds || [];
                                                                if (isChecked) {
                                                                    return { ...prev, sessionIds: [...currentIds, session.id!] };
                                                                } else {
                                                                    return { ...prev, sessionIds: currentIds.filter(id => id !== session.id) };
                                                                }
                                                            });
                                                        }}
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium">{session.sessionCode}</div>
                                                        <div className="text-xs text-gray-500">{session.sessionName}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Select one or more sessions for this add-on ticket
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quota *</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={ticketForm.quota}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, quota: e.target.value }))}
                                            placeholder="100"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Name *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g., Early Bird - Member"
                                        value={ticketForm.name}
                                        onChange={(e) => setTicketForm(prev => ({ ...prev, name: e.target.value }))}
                                        maxLength={255}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                                        <select
                                            className="input-field"
                                            value={ticketForm.currency}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, currency: e.target.value as 'THB' | 'USD' }))}
                                        >
                                            <option value="THB">THB (฿)</option>
                                            <option value="USD">USD ($)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="3500"
                                            value={ticketForm.price}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, price: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sale Start Date</label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={ticketForm.saleStartDate ? ticketForm.saleStartDate.split('T')[0] : ''}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, saleStartDate: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sale End Date</label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={ticketForm.saleEndDate ? ticketForm.saleEndDate.split('T')[0] : ''}
                                            onChange={(e) => setTicketForm(prev => ({ ...prev, saleEndDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                                <button onClick={() => { setShowTicketModal(false); setEditingTicketId(null); }} className="btn-secondary">Cancel</button>
                                <button onClick={handleAddTicket} className="btn-primary flex items-center gap-2">
                                    <IconCheck size={18} /> {editingTicketId ? 'Update Ticket' : 'Add Ticket'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Session Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">{editingSessionId ? 'Edit Session' : 'Create Session'}</h3>
                                <button onClick={() => { setShowSessionModal(false); setEditingSessionId(null); }} className="text-gray-400 hover:text-gray-600">
                                    <IconX size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            {/* Session Code & Session Name */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Code *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="S-001"
                                        value={sessionForm.sessionCode}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, sessionCode: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Enter session name"
                                        value={sessionForm.sessionName}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, sessionName: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Start Time & End Time */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                    <input
                                        type="datetime-local"
                                        className="input-field"
                                        value={sessionForm.startTime}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, startTime: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                    <input
                                        type="datetime-local"
                                        className="input-field"
                                        value={sessionForm.endTime}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, endTime: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Room & Max Capacity */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Meeting Room 1"
                                        value={sessionForm.room}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, room: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        placeholder="100"
                                        value={sessionForm.maxCapacity}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 0 }))}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Set to 0 for unlimited capacity</p>
                                </div>
                            </div>

                            {/* Instructor(s) */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <IconMicrophone size={16} /> Instructor(s)
                                </label>
                                <div className="border border-gray-300 rounded-md bg-white">
                                    {speakers.length > 0 ? (
                                        <div className="max-h-32 overflow-y-auto p-2">
                                            {speakers.map(speaker => (
                                                <label key={speaker.id} className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={sessionForm.selectedSpeakerIds?.includes(speaker.id)}
                                                        onChange={(e) => {
                                                            const id = speaker.id;
                                                            setSessionForm(prev => ({
                                                                ...prev,
                                                                selectedSpeakerIds: e.target.checked
                                                                    ? [...(prev.selectedSpeakerIds || []), id]
                                                                    : (prev.selectedSpeakerIds || []).filter(sid => sid !== id)
                                                            }));
                                                        }}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>{speaker.firstName} {speaker.lastName}</span>
                                                    {speaker.organization && <span className="text-xs text-gray-500">({speaker.organization})</span>}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 text-sm text-gray-500">
                                            No instructors available
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Selected: {sessionForm.selectedSpeakerIds?.length || 0} Instructor(s)
                                </p>
                            </div>

                            {/* Learning Objectives */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <IconTarget size={16} /> Learning Objectives
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    placeholder="Describe the learning objectives for this session..."
                                    value={sessionForm.description}
                                    onChange={(e) => setSessionForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => { setShowSessionModal(false); setEditingSessionId(null); }} className="btn-secondary">Cancel</button>
                            <button onClick={handleAddSession} className="btn-primary">
                                {editingSessionId ? 'Update Session' : 'Create Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout >
    );
}

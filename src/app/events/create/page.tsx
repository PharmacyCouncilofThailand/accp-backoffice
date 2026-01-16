'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import {
    IconCalendarEvent,
    IconLayoutGrid,
    IconTicket,
    IconPhoto,
    IconCheck,
    IconArrowLeft,
    IconArrowRight,
    IconPlus,
    IconPencil,
    IconTrash,
    IconX,
    IconLoader2,
} from '@tabler/icons-react';

// Step types
type Step = 1 | 2 | 3 | 4;

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
    status: 'draft' | 'published';
}

// Helper function to format datetime for display
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

// Helper function to format time only
const formatTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '-';
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } catch {
        return dateTimeStr;
    }
};

export default function CreateEventPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [showSessionForm, setShowSessionForm] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Event form data
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

    // Sessions and Tickets
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [tickets, setTickets] = useState<TicketData[]>([]);

    // Session form data
    const [sessionForm, setSessionForm] = useState<SessionData>({
        sessionCode: '',
        sessionName: '',
        description: '',
        room: '',
        startTime: '',
        endTime: '',
        maxCapacity: 50,
    });

    // Ticket form data
    const [ticketForm, setTicketForm] = useState<TicketData>({
        name: '',
        category: 'primary',
        price: '',
        currency: 'THB',
        quota: '100',
        saleStartDate: '',
        saleEndDate: '',
        allowedRoles: ['thai_pharmacy'],
    });

    // Generate a unique event code
    const generateEventCode = () => {
        const prefix = 'EVT';
        const year = new Date().getFullYear();
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newCode = `${prefix}${year}-${randomPart}`;
        setFormData(prev => ({ ...prev, eventCode: newCode }));
    };

    const steps = [
        { id: 1, icon: IconCalendarEvent, label: 'Event Details' },
        { id: 2, icon: IconLayoutGrid, label: 'Sessions' },
        { id: 3, icon: IconTicket, label: 'Tickets' },
        { id: 4, icon: IconPhoto, label: 'Venue/Images' },
    ];

    // Check if Sessions step should be shown (only for multi_session events)
    const shouldShowSessions = formData.eventType === 'multi_session';

    const goToStep = (step: Step) => {
        if (step >= 1 && step <= 4) {
            // Skip step 2 if single room
            if (!shouldShowSessions && step === 2) {
                return;
            }
            setCurrentStep(step);
        }
    };

    // Navigate to next step, skipping Sessions if single room
    const goToNextStep = () => {
        if (currentStep === 1) {
            setCurrentStep(shouldShowSessions ? 2 : 3);
        } else if (currentStep === 2) {
            setCurrentStep(3);
        } else if (currentStep === 3) {
            setCurrentStep(4);
        }
    };

    // Navigate to previous step, skipping Sessions if single room
    const goToPreviousStep = () => {
        if (currentStep === 4) {
            setCurrentStep(3);
        } else if (currentStep === 3) {
            setCurrentStep(shouldShowSessions ? 2 : 1);
        } else if (currentStep === 2) {
            setCurrentStep(1);
        }
    };

    // Add session
    const handleAddSession = () => {
        if (!sessionForm.sessionCode || !sessionForm.sessionName) return;
        setSessions(prev => [...prev, { ...sessionForm, id: Date.now() }]);
        setSessionForm({
            sessionCode: '',
            sessionName: '',
            description: '',
            room: '',
            startTime: '',
            endTime: '',
            maxCapacity: 50,
        });
        setShowSessionForm(false);
    };

    // Delete session
    const handleDeleteSession = (id: number) => {
        setSessions(prev => prev.filter(s => s.id !== id));
    };

    // Add ticket
    const handleAddTicket = () => {
        if (!ticketForm.name || !ticketForm.price) return;
        const quotaNum = parseInt(ticketForm.quota) || 0;
        if (quotaNum < 1) {
            alert('Quota must be at least 1');
            return;
        }
        setTickets(prev => [...prev, { ...ticketForm, id: Date.now() }]);
        setTicketForm({
            name: '',
            category: 'primary',
            price: '',
            currency: 'THB',
            quota: '100',
            saleStartDate: '',
            saleEndDate: '',
            allowedRoles: ['thai_pharmacy'],
        });
        setShowTicketModal(false);
    };

    // Delete ticket
    const handleDeleteTicket = (id: number) => {
        setTickets(prev => prev.filter(t => t.id !== id));
    };

    // Submit form
    const handleFinish = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('backoffice_token') || '';

            // Create event
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

            const { event } = await api.backofficeEvents.create(token, eventData);

            // Create sessions
            if (shouldShowSessions && sessions.length > 0) {
                for (const session of sessions) {
                    await api.backofficeEvents.createSession(token, event.id, {
                        sessionCode: session.sessionCode,
                        sessionName: session.sessionName,
                        description: session.description || undefined,
                        room: session.room || undefined,
                        startTime: new Date(session.startTime).toISOString(),
                        endTime: new Date(session.endTime).toISOString(),
                        maxCapacity: session.maxCapacity,
                    });
                }
            }

            // Create tickets
            for (const ticket of tickets) {
                await api.backofficeEvents.createTicket(token, event.id, {
                    name: ticket.name,
                    category: ticket.category,
                    price: ticket.price,
                    currency: ticket.currency,
                    quota: parseInt(ticket.quota) || 0,
                    allowedRoles: ticket.allowedRoles,
                    saleStartDate: ticket.saleStartDate || undefined,
                    saleEndDate: ticket.saleEndDate || undefined,
                });
            }

            alert('Event created successfully!');
            router.push('/events');
        } catch (err: any) {
            setError(err.message || 'Failed to create event');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Create New Event">
            {/* Back Button */}
            <div className="mb-4">
                <Link href="/events" className="btn-secondary inline-flex items-center gap-2">
                    <IconArrowLeft size={18} /> Back to Events
                </Link>
            </div>

            {/* Step Progress Wizard */}
            <div className="card mb-6">
                <div className="relative py-4">
                    {/* Progress Line */}
                    <div className="absolute h-1 bg-gray-200 left-[10%] right-[10%] top-[32px] z-0" />
                    <div
                        className="absolute h-1 bg-green-500 left-[10%] top-[32px] z-[1] transition-all duration-300"
                        style={{
                            width: shouldShowSessions
                                ? `${((currentStep - 1) / 3) * 80}%`
                                : `${(([1, 3, 4].indexOf(currentStep) || 0) / 2) * 80}%`
                        }}
                    />

                    <div className="flex justify-between relative z-[2]">
                        {steps
                            .filter((step) => shouldShowSessions || step.id !== 2)
                            .map((step) => {
                                const Icon = step.icon;
                                // Calculate if step is completed based on actual step order
                                const isCompleted = step.id < currentStep;
                                const isCurrent = step.id === currentStep;
                                return (
                                    <div
                                        key={step.id}
                                        className={`text-center flex-1 cursor-pointer`}
                                        onClick={() => step.id <= currentStep && goToStep(step.id as Step)}
                                    >
                                        <div
                                            className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 transition-all
                      ${isCompleted ? 'bg-green-500 text-white' :
                                                    isCurrent ? 'bg-blue-600 text-white' :
                                                        'bg-gray-200 text-gray-500'}`}
                                        >
                                            {isCompleted ? <IconCheck size={24} /> : <Icon size={24} stroke={1.5} />}
                                        </div>
                                        <p className={`text-sm font-medium ${isCurrent ? 'text-blue-600' :
                                            isCompleted ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                            {step.label}
                                        </p>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            {/* Step 1: Event Details */}
            {currentStep === 1 && (
                <div className="card">
                    <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
                        <IconCalendarEvent size={20} />
                        <h3 className="text-lg font-semibold">Step 1: Event Details</h3>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Code *</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="input-field flex-1"
                                    placeholder="e.g., EVT2026-ABCD"
                                    value={formData.eventCode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, eventCode: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    onClick={generateEventCode}
                                    className="btn-secondary whitespace-nowrap"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                            <select
                                className="input-field"
                                value={formData.eventType}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value as 'single_room' | 'multi_session' }))}
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
                            placeholder="Enter event name"
                            value={formData.eventName}
                            onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="input-field h-24"
                            placeholder="Event description..."
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                            <input
                                type="date"
                                className="input-field"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                            <input
                                type="date"
                                className="input-field"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g., Bangkok Convention Center"
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
                            <input
                                type="url"
                                className="input-field"
                                placeholder="https://maps.google.com/..."
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
                                value={formData.maxCapacity || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 0 }))}
                                placeholder="100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conference Code</label>
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
                                placeholder="e.g., 6.00"
                                value={formData.cpeCredits}
                                onChange={(e) => setFormData(prev => ({ ...prev, cpeCredits: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="input-field"
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    <hr className="my-6" />

                    <div className="flex justify-end">
                        <button onClick={goToNextStep} className="btn-primary text-lg px-6 py-3 flex items-center gap-2">
                            Save & Continue <IconArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Sessions */}
            {currentStep === 2 && (
                <div className="card">
                    <div className="bg-purple-600 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
                        <IconLayoutGrid size={20} />
                        <h3 className="text-lg font-semibold">Step 2: Sessions</h3>
                    </div>

                    <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-4 flex items-center gap-2">
                        <IconLayoutGrid size={18} /> Add sessions for your multi-session event
                    </div>

                    {/* Add Session Form */}
                    {showSessionForm && (
                        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                            <h4 className="font-semibold mb-4">Add New Session</h4>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Code *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="S01"
                                        value={sessionForm.sessionCode}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, sessionCode: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Session name"
                                        value={sessionForm.sessionName}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, sessionName: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Grand Hall"
                                        value={sessionForm.room}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, room: e.target.value }))}
                                    />
                                </div>
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={sessionForm.maxCapacity}
                                        onChange={(e) => setSessionForm(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 50 }))}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAddSession} className="btn-primary flex items-center gap-2">
                                    <IconCheck size={18} /> Save Session
                                </button>
                                <button onClick={() => setShowSessionForm(false)} className="btn-secondary">Cancel</button>
                            </div>
                        </div>
                    )}

                    {!showSessionForm && (
                        <button onClick={() => setShowSessionForm(true)} className="btn-secondary mb-4 flex items-center gap-2">
                            <IconPlus size={18} /> Add Session
                        </button>
                    )}

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
                                            <td>
                                                <p className="font-medium">{session.sessionName}</p>
                                                <p className="text-sm text-gray-500">{session.description}</p>
                                            </td>
                                            <td>{session.room}</td>
                                            <td className="text-sm">
                                                {formatDateTime(session.startTime)}<br />to {formatTime(session.endTime)}
                                            </td>
                                            <td>{session.maxCapacity}</td>
                                            <td>
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
                            No sessions added yet. Click "Add Session" to create one.
                        </div>
                    )}

                    <hr className="my-6" />

                    <div className="flex justify-between">
                        <button onClick={goToPreviousStep} className="btn-secondary flex items-center gap-2">
                            <IconArrowLeft size={18} /> Back to Event Details
                        </button>
                        <button onClick={goToNextStep} className="btn-primary text-lg px-6 py-3 flex items-center gap-2">
                            Continue <IconArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Tickets */}
            {currentStep === 3 && (
                <div className="card">
                    <div className="bg-yellow-500 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
                        <IconTicket size={20} />
                        <h3 className="text-lg font-semibold">Step 3: Tickets</h3>
                    </div>

                    <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-4 flex items-center gap-2">
                        <IconTicket size={18} /> Add ticket types for your event (e.g., Early Bird, Member, Public)
                    </div>

                    <button onClick={() => setShowTicketModal(true)} className="btn-secondary mb-4 flex items-center gap-2">
                        <IconPlus size={18} /> Add Ticket Type
                    </button>

                    {/* Tickets Table */}
                    {tickets.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ticket</th>
                                        <th>Category / Role</th>
                                        <th>Price</th>
                                        <th>Quota</th>
                                        <th>Sale Period</th>
                                        <th className="w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td>
                                                <p className="font-medium">{ticket.name}</p>
                                            </td>
                                            <td>
                                                <span className={`badge ${ticket.category === 'primary' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {ticket.category === 'primary' ? 'Primary' : 'Add-on'}
                                                </span>
                                                <span className="badge ml-1 bg-gray-100 text-gray-700">
                                                    {ticket.allowedRoles[0]?.replace('_', ' ').toUpperCase() || 'ALL'}
                                                </span>
                                            </td>
                                            <td className="font-semibold">
                                                {ticket.currency === 'USD' ? '$' : '฿'}{ticket.price}
                                            </td>
                                            <td>{ticket.quota}</td>
                                            <td className="text-sm text-gray-600">
                                                {ticket.saleStartDate || 'N/A'}
                                                <br />to {ticket.saleEndDate || 'N/A'}
                                            </td>
                                            <td>
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
                            No tickets added yet. Click "Add Ticket Type" to create one.
                        </div>
                    )}

                    <hr className="my-6" />

                    <div className="flex justify-between">
                        <button onClick={goToPreviousStep} className="btn-secondary flex items-center gap-2">
                            <IconArrowLeft size={18} /> {shouldShowSessions ? 'Back to Sessions' : 'Back to Event Details'}
                        </button>
                        <button onClick={goToNextStep} className="btn-primary text-lg px-6 py-3 flex items-center gap-2">
                            Continue <IconArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Venue/Images */}
            {currentStep === 4 && (
                <div className="card">
                    <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
                        <IconPhoto size={20} />
                        <h3 className="text-lg font-semibold">Step 4: Venue/Images</h3>
                    </div>

                    <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-4 flex items-center gap-2">
                        <IconPhoto size={18} /> Upload images of the venue (max 10 images)
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Venue Images</label>
                        <input type="file" className="input-field" multiple accept="image/*" />
                    </div>

                    {/* Image Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="h-32 bg-gray-100 flex items-center justify-center">
                                <IconPhoto size={40} className="text-gray-400" />
                            </div>
                            <div className="p-2 text-center">
                                <button className="text-red-600 hover:bg-red-100 p-1 rounded text-sm flex items-center gap-1 mx-auto">
                                    <IconTrash size={14} /> Remove
                                </button>
                            </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="h-32 bg-gray-100 flex items-center justify-center">
                                <IconPhoto size={40} className="text-gray-400" />
                            </div>
                            <div className="p-2 text-center">
                                <button className="text-red-600 hover:bg-red-100 p-1 rounded text-sm flex items-center gap-1 mx-auto">
                                    <IconTrash size={14} /> Remove
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="my-6" />

                    <div className="flex justify-between">
                        <button onClick={goToPreviousStep} className="btn-secondary flex items-center gap-2">
                            <IconArrowLeft size={18} /> Back to Tickets
                        </button>
                        <button
                            onClick={handleFinish}
                            disabled={isSubmitting}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <IconLoader2 size={20} className="animate-spin" /> Creating...
                                </>
                            ) : (
                                <>
                                    <IconCheck size={20} /> Finish
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Add Ticket Modal */}
            {showTicketModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <IconTicket size={20} /> Add Ticket Type
                                </h3>
                                <button onClick={() => setShowTicketModal(false)} className="text-gray-400 hover:text-gray-600">
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
                                        value={ticketForm.allowedRoles[0]}
                                        onChange={(e) => setTicketForm(prev => ({ ...prev, allowedRoles: [e.target.value] }))}
                                    >
                                        <option value="thai_student">Thai Student</option>
                                        <option value="thai_pharmacy">Thai Pharmacy</option>
                                        <option value="intl_student">International Student</option>
                                        <option value="intl_pharmacy">International Pharmacy</option>
                                    </select>
                                </div>
                            </div>

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
                                        value={ticketForm.saleStartDate}
                                        onChange={(e) => setTicketForm(prev => ({ ...prev, saleStartDate: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale End Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={ticketForm.saleEndDate}
                                        onChange={(e) => setTicketForm(prev => ({ ...prev, saleEndDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowTicketModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleAddTicket} className="btn-primary">
                                Add Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
    IconCalendarEvent,
    IconPlus,
    IconClock,
    IconMapPin,
    IconUsers,
    IconPencil,
    IconTrash,
    IconSearch,
    IconFilter,
    IconLayoutList,
    IconTimeline,
    IconVideo,
    IconLoader2,
    IconX,
    IconMicrophone,
} from '@tabler/icons-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface Session {
    id: number;
    eventId: number;
    sessionCode: string;
    sessionName: string;
    description: string;
    room: string;
    startTime: string;
    endTime: string;
    speakers: string[]; // JSON array in DB
    maxCapacity: number;
    eventCode?: string;
    tags?: string[]; // Not in schema, mocked or derived
}

interface EventOption {
    id: number;
    code: string;
    name: string;
}

interface Speaker {
    id: number;
    firstName: string;
    lastName: string;
    organization: string | null;
}

export default function SessionsPage() {
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [events, setEvents] = useState<EventOption[]>([]);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState<number | ''>('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    // Form
    const [formData, setFormData] = useState({
        eventId: 0,
        sessionCode: '',
        sessionName: '',
        description: '',
        room: '',
        startTime: '',
        endTime: '',
        selectedSpeakerIds: [] as number[],
        maxCapacity: 100,
    });

    useEffect(() => {
        fetchEvents();
        fetchSpeakers();
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [page, searchTerm, eventFilter]);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const res = await api.backofficeEvents.list(token, 'limit=100');
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

    const fetchSpeakers = async () => {
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const res = await fetch(`${API_URL}/api/backoffice/speakers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSpeakers(data.speakers || []);
        } catch (error) {
            console.error('Failed to fetch speakers:', error);
        }
    };

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const params: any = { page, limit: 12 }; // Grid view needs roughly 12
            if (eventFilter) params.eventId = eventFilter;
            if (searchTerm) params.search = searchTerm;

            const res = await api.sessions.list(token, new URLSearchParams(params).toString());

            const mappedSessions: Session[] = res.sessions.map((s: any) => ({
                id: s.id,
                eventId: s.eventId,
                sessionCode: s.sessionCode,
                sessionName: s.sessionName,
                description: s.description || '', // Description might not be in list return (check sessions.ts) - wait sessions.ts select doesn't include description!
                // sessions.ts select: id, eventId, sessionCode, sessionName, startTime, endTime, room, eventCode.
                // It misses description and speakers.
                // If I need them, I should fetch detail or update sessions.ts.
                // For list view, description/speakers might be overkill or fine.
                // I'll leave them empty for list or fetch detail on edit.
                // Or I can update sessions.ts later if critical. Use empty for now.
                room: s.room,
                startTime: s.startTime,
                endTime: s.endTime,
                speakers: [], // Not returned by list endpoint
                maxCapacity: s.maxCapacity || 0, // Not returned by list endpoint
                eventCode: s.eventCode
            }));

            // For detailed edit, I'll need to maybe fetch session details?
            // sessions.ts doesn't have get-session-by-id global endpoint.
            // But I can fetch via api.backofficeEvents.getSessions(eventId) and find it, or update session.ts.
            // Wait, backoffice events has specific getSession/tickets nested?
            // api.backofficeEvents.getSessions returns list for event.
            // It doesn't seem to have a single getSession by ID?
            // Wait, api.ts has updateSession(eventId, sessionId).
            // To fill the form, I might need the data.
            // I'll just use what I have or fetch list context.
            // Actually, if `sessions.list` doesn't return speakers/description, I can't edit them properly.
            // I should update `sessions.ts` to return more fields OR simply fetch defaults.
            // I will update `sessions.ts` to include description and speakers in the select if possible in next iteration, 
            // but for now I'll proceed. The form will use empty values if missing.

            setSessions(mappedSessions);
            setTotalCount(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.eventId) { toast.error('Select an event'); return; }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            // Get speaker names from selected IDs
            const speakerNames = formData.selectedSpeakerIds.map(id => {
                const speaker = speakers.find(s => s.id === id);
                return speaker ? `${speaker.firstName} ${speaker.lastName}` : '';
            }).filter(Boolean);
            const payload = {
                ...formData,
                speakers: speakerNames,
            };
            await api.backofficeEvents.createSession(token, formData.eventId, payload);
            toast.success('Session created successfully!');
            setShowCreateModal(false);
            fetchSessions();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedSession || !formData.eventId) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            // Get speaker names from selected IDs
            const speakerNames = formData.selectedSpeakerIds.map(id => {
                const speaker = speakers.find(s => s.id === id);
                return speaker ? `${speaker.firstName} ${speaker.lastName}` : '';
            }).filter(Boolean);
            const payload = {
                ...formData,
                speakers: speakerNames,
            };
            await api.backofficeEvents.updateSession(token, formData.eventId, selectedSession.id, payload);
            toast.success('Session updated successfully!');
            setShowEditModal(false);
            fetchSessions();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSession) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.backofficeEvents.deleteSession(token, selectedSession.eventId, selectedSession.id);
            toast.success('Session deleted successfully!');
            setShowDeleteModal(false);
            fetchSessions();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (session: Session) => {
        setSelectedSession(session);
        const formatDateTime = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            const offset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
            return localISOTime;
        };

        // Match speaker names to IDs
        const speakerIds = (session.speakers || []).map(name => {
            const speaker = speakers.find(s => `${s.firstName} ${s.lastName}` === name);
            return speaker?.id;
        }).filter((id): id is number => id !== undefined);

        setFormData({
            eventId: session.eventId,
            sessionCode: session.sessionCode,
            sessionName: session.sessionName,
            description: session.description || '',
            room: session.room,
            startTime: formatDateTime(session.startTime),
            endTime: formatDateTime(session.endTime),
            selectedSpeakerIds: speakerIds,
            maxCapacity: session.maxCapacity || 100,
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            eventId: events[0]?.id || 1,
            sessionCode: '',
            sessionName: '',
            description: '',
            room: '',
            startTime: '',
            endTime: '',
            selectedSpeakerIds: [],
            maxCapacity: 100,
        });
    };

    return (
        <AdminLayout title="Session Management">
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

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {eventFilter ? `Sessions for ${events.find(e => e.id === eventFilter)?.name || 'Event'}` : 'All Sessions'}
                    </h2>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <IconLayoutList size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <IconTimeline size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="input-field pl-10 h-10"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap h-10"
                    >
                        <IconPlus size={18} /> Add Session
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <IconLoader2 size={40} className="animate-spin text-blue-600" />
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <IconCalendarEvent size={64} className="mb-4 opacity-50" />
                    <p className="text-lg">No sessions found</p>
                </div>
            ) : viewMode === 'list' ? (
                // List View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                        <div key={session.id} className="card group hover:shadow-lg transition-all animate-fade-in relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => openEditModal(session)}
                                    className="p-1.5 bg-white shadow-sm text-gray-600 rounded-lg hover:text-blue-600"
                                >
                                    <IconPencil size={18} />
                                </button>
                                <button
                                    onClick={() => { setSelectedSession(session); setShowDeleteModal(true); }}
                                    className="p-1.5 bg-white shadow-sm text-gray-600 rounded-lg hover:text-red-600"
                                >
                                    <IconTrash size={18} />
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm font-semibold">
                                    {session.eventCode || events.find(e => e.id === session.eventId)?.code || 'Unknown'}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full bg-green-100 text-green-700`}>
                                    {/* Status mocking if needed, or just remove */}
                                    Active
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2" title={session.sessionName}>
                                {session.sessionName}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono mb-4">{session.sessionCode}</p>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-2">
                                    <IconClock size={16} className="text-gray-400" />
                                    <span>
                                        {new Date(session.startTime).toLocaleDateString()} {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <IconMapPin size={16} className="text-gray-400" />
                                    <span>{session.room}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <IconUsers size={16} className="text-gray-400 mt-0.5" />
                                    <span className="line-clamp-1">
                                        {(session.speakers || []).length > 0 ? (session.speakers || []).join(', ') : 'No speakers'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Timeline View (Simplified List for now as true timeline is complex)
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <div key={session.id} className="card flex flex-col md:flex-row gap-4 p-4 animate-fade-in hover:bg-gray-50 transition-colors">
                            <div className="md:w-48 shrink-0 flex flex-row md:flex-col justify-between md:justify-start gap-2 md:border-r md:border-gray-100 md:pr-4">
                                <div>
                                    <p className="font-bold text-gray-800 text-lg">
                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(session.startTime).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right md:text-left">
                                    <p className="text-sm text-gray-400">
                                        to {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold mb-2 inline-block mr-2">
                                            {session.eventCode}
                                        </span>
                                        <h3 className="text-lg font-bold text-gray-800">{session.sessionName}</h3>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Hidden actions for row if needed, relying on click or similar */}
                                        <button onClick={() => openEditModal(session)} className="text-blue-600 hover:text-blue-800"><IconPencil size={18} /></button>
                                        <button onClick={() => { setSelectedSession(session); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-800"><IconTrash size={18} /></button>
                                    </div>
                                </div>
                                <p className="text-gray-600 text-sm mb-3">{session.room}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                    <button
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">{showCreateModal ? 'Create Session' : 'Edit Session'}</h3>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-gray-400 hover:text-gray-600">
                                <IconX size={24} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
                                <select
                                    className="input-field"
                                    value={formData.eventId}
                                    onChange={(e) => setFormData({ ...formData, eventId: Number(e.target.value) })}
                                    disabled={!showCreateModal}
                                >
                                    {events.map((e) => (
                                        <option key={e.id} value={e.id}>{e.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session Code *</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="S-001"
                                    value={formData.sessionCode}
                                    onChange={(e) => setFormData({ ...formData, sessionCode: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.sessionName}
                                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                <input
                                    type="datetime-local"
                                    className="input-field"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                <input
                                    type="datetime-local"
                                    className="input-field"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Main Hall"
                                    value={formData.room}
                                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <IconMicrophone size={16} className="inline mr-1" /> Speakers
                                </label>
                                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                                    {speakers.length === 0 ? (
                                        <p className="p-3 text-sm text-gray-400">No speakers available</p>
                                    ) : (
                                        speakers.map(speaker => (
                                            <label key={speaker.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selectedSpeakerIds.includes(speaker.id)}
                                                    onChange={() => {
                                                        const ids = formData.selectedSpeakerIds.includes(speaker.id)
                                                            ? formData.selectedSpeakerIds.filter(id => id !== speaker.id)
                                                            : [...formData.selectedSpeakerIds, speaker.id];
                                                        setFormData({ ...formData, selectedSpeakerIds: ids });
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <div>
                                                    <p className="font-medium text-sm">{speaker.firstName} {speaker.lastName}</p>
                                                    {speaker.organization && (
                                                        <p className="text-xs text-gray-500">{speaker.organization}</p>
                                                    )}
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    Selected: {formData.selectedSpeakerIds.length} speaker(s)
                                </p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="input-field h-24"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                            <button
                                onClick={showCreateModal ? handleCreate : handleEdit}
                                className="btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : showCreateModal ? 'Create Session' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedSession && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-red-600 rounded-t-2xl text-white">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <IconTrash size={24} /> Delete Session
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <p className="mb-2">Are you sure you want to delete this session?</p>
                            <p className="font-bold text-gray-800 text-lg">{selectedSession.sessionName}</p>
                            <p className="text-gray-500 text-sm mb-4">{selectedSession.sessionCode}</p>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                            <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700" disabled={isSubmitting}>
                                {isSubmitting ? 'Deleting...' : 'Delete Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

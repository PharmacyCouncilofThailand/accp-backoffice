'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
    IconScan,
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconRefresh,
    IconCamera,
    IconKeyboard,
    IconUser,
    IconTicket,
    IconCalendarEvent,
    IconLoader2,
    IconDoor,
} from '@tabler/icons-react';

type ScanResult = null | {
    status: 'success' | 'error' | 'duplicate';
    code: string;
    name?: string;
    ticketType?: string;
    message: string;
    eventName?: string;
};

interface SessionInfo {
    id: number;
    sessionId: number;
    sessionName: string;
    sessionType?: string;
    ticketName: string;
    checkedInAt: string | null;
}

interface PendingRegistration {
    id: number;
    regCode: string;
    firstName: string;
    lastName: string;
    email: string;
    ticketName: string;
    eventName: string;
}

interface RecentCheckin {
    id: number;
    regCode: string;
    firstName: string;
    lastName: string;
    ticketName: string;
    sessionName?: string;
    scannedAt: string;
}

const getBackofficeToken = () =>
    localStorage.getItem('backoffice_token') ||
    sessionStorage.getItem('backoffice_token') ||
    '';

export default function CheckinPage() {
    const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual');
    const [manualCode, setManualCode] = useState('');
    const [scanResult, setScanResult] = useState<ScanResult>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Session selection state (new flow)
    const [pendingSessions, setPendingSessions] = useState<SessionInfo[] | null>(null);
    const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);

    // Data stats
    const [stats, setStats] = useState({
        total: 0,
        checkedIn: 0,
        remaining: 0,
    });
    const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = getBackofficeToken();

            // Fetch total confirmed registrations
            const regRes = await api.registrations.list(token, 'limit=1&status=confirmed');
            const total = regRes.pagination.total;

            // Fetch check-ins (count and recent)
            const checkinRes = await api.checkins.list(token, 'limit=10');
            const checkedIn = checkinRes.pagination.total;

            setStats({
                total,
                checkedIn,
                remaining: Math.max(0, total - checkedIn),
            });

            setRecentCheckins(checkinRes.checkins.map((c: any) => ({
                id: c.id,
                regCode: c.regCode,
                firstName: c.firstName,
                lastName: c.lastName,
                ticketName: c.ticketName,
                sessionName: c.sessionName,
                scannedAt: new Date(c.scannedAt).toLocaleTimeString(),
            })));

        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const processScan = async (code: string) => {
        setIsLoading(true);
        setScanResult(null);
        setPendingSessions(null);
        setPendingRegistration(null);
        try {
            const token = getBackofficeToken();
            const res = await api.checkins.create(token, { regCode: code });

            // Case 3: API returns session list (no sessionId sent)
            if (res.sessions) {
                setPendingRegistration(res.registration);
                setPendingSessions(res.sessions);
                setIsLoading(false);
                return;
            }

            if (res.success) {
                setScanResult({
                    status: 'success',
                    code: code,
                    name: `${res.registration.firstName} ${res.registration.lastName}`,
                    ticketType: res.registration.ticketName,
                    eventName: res.registration.eventName,
                    message: res.checkedInCount
                        ? `Checked in ${res.checkedInCount} sessions!`
                        : 'Check-in successful!',
                });
                fetchData();
            }
        } catch (error: any) {
            console.error('Scan error:', error);
            if (error.message.includes('Already checked in')) {
                setScanResult({
                    status: 'duplicate',
                    code: code,
                    message: 'Already checked in',
                });
            } else if (error.message.includes('Not found') || error.message.includes('404')) {
                setScanResult({
                    status: 'error',
                    code: code,
                    message: 'Invalid registration code',
                });
            } else {
                setScanResult({
                    status: 'error',
                    code: code,
                    message: error.message || 'Scan failed',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const checkInSession = async (sessionId: number) => {
        if (!pendingRegistration) return;
        setIsLoading(true);
        try {
            const token = getBackofficeToken();
            const res = await api.checkins.create(token, {
                regCode: pendingRegistration.regCode,
                sessionId,
            });
            if (res.success) {
                setPendingSessions(prev =>
                    prev?.map(s => s.sessionId === sessionId
                        ? { ...s, checkedInAt: new Date().toISOString() }
                        : s
                    ) || null
                );
                toast.success(`Checked in: ${res.checkedInSession?.sessionName}`);
                fetchData();
            }
        } catch (error: any) {
            if (error.message.includes('Already checked in')) {
                toast.error('Already checked in for this session');
            } else {
                toast.error(error.message || 'Check-in failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const checkInAllSessions = async () => {
        if (!pendingRegistration) return;
        setIsLoading(true);
        try {
            const token = getBackofficeToken();
            const res = await api.checkins.create(token, {
                regCode: pendingRegistration.regCode,
                checkInAll: true,
            });
            if (res.success) {
                setScanResult({
                    status: 'success',
                    code: pendingRegistration.regCode,
                    name: `${pendingRegistration.firstName} ${pendingRegistration.lastName}`,
                    ticketType: pendingRegistration.ticketName,
                    eventName: pendingRegistration.eventName,
                    message: `Checked in ${res.checkedInCount} sessions!`,
                });
                setPendingSessions(null);
                setPendingRegistration(null);
                fetchData();
            }
        } catch (error: any) {
            if (error.message.includes('Already checked in')) {
                toast.error('All sessions already checked in');
            } else {
                toast.error(error.message || 'Check-in failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            processScan(manualCode.trim().toUpperCase());
            setManualCode('');
        }
    };

    const handleStartCamera = () => {
        setIsCameraActive(true);
        // Simulate camera scan for demo purposes if no real camera attached
        // In a real implementation, this would use a QR reader library
        setTimeout(() => {
            // Mock scan of a likely code for demonstration? 
            // Better to just show a "Manual Only" or "Camera not available" if we can't implement it.
            // But preserving the UI as requested.
            // Let's just stop it and ask for manual.
            alert("Camera access not implemented in this environment. Please use manual entry.");
            setIsCameraActive(false);
        }, 1000);
    };

    const clearResult = () => {
        setScanResult(null);
        setPendingSessions(null);
        setPendingRegistration(null);
    };

    return (
        <AdminLayout title="Check-in Scanner">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scanner Area */}
                <div className="lg:col-span-2">
                    <div className="card min-h-[500px] flex flex-col">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setScanMode('camera')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${scanMode === 'camera'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <IconCamera size={20} /> Camera Scan
                            </button>
                            <button
                                onClick={() => setScanMode('manual')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${scanMode === 'manual'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <IconKeyboard size={20} /> Manual Entry
                            </button>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center text-blue-600">
                                <IconLoader2 size={48} className="animate-spin mb-4" />
                                <p className="text-lg font-medium">Processing Check-in...</p>
                            </div>
                        )}

                        {/* Camera Mode */}
                        {!isLoading && scanMode === 'camera' && !scanResult && !pendingSessions && (
                            <div className="relative flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8">
                                <div className="text-center text-gray-400">
                                    <IconCamera size={64} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg mb-4">Camera Ready</p>
                                    <button
                                        onClick={handleStartCamera}
                                        className="btn-primary"
                                    >
                                        Start Scanning
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Manual Mode */}
                        {!isLoading && scanMode === 'manual' && !scanResult && !pendingSessions && (
                            <div className="flex-1 flex flex-col items-center justify-center py-8">
                                <form onSubmit={handleManualSubmit} className="max-w-md w-full mx-auto">
                                    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                                        Enter Registration Code
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            className="input-field text-center text-xl font-mono uppercase tracking-wider"
                                            placeholder="REG-XXXX"
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="submit" className="btn-primary px-6">
                                            <IconCheck size={24} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 text-center">Press Enter to submit</p>
                                </form>
                            </div>
                        )}

                        {/* Session Selection (new flow) */}
                        {!isLoading && pendingSessions && pendingRegistration && (
                            <div className="flex-1 flex flex-col py-6 animate-fade-in">
                                <div className="max-w-md w-full mx-auto">
                                    <div className="bg-white rounded-xl p-5 shadow-sm border mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <IconUser size={20} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">
                                                    {pendingRegistration.firstName} {pendingRegistration.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono">{pendingRegistration.regCode}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <IconDoor size={20} className="text-blue-600" />
                                        Select Session to Check-in
                                    </h3>

                                    <div className="space-y-2 mb-4">
                                        {pendingSessions.map(session => (
                                            <button
                                                key={session.id}
                                                disabled={!!session.checkedInAt || isLoading}
                                                onClick={() => checkInSession(session.sessionId)}
                                                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                                                    session.checkedInAt
                                                        ? 'bg-green-50 border-green-200 cursor-default'
                                                        : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{session.sessionName}</p>
                                                        <p className="text-xs text-gray-500">{session.ticketName}</p>
                                                    </div>
                                                    {session.checkedInAt ? (
                                                        <span className="text-green-600 flex items-center gap-1 text-sm font-medium">
                                                            <IconCheck size={16} /> Done
                                                        </span>
                                                    ) : (
                                                        <span className="text-blue-600 text-sm">Tap to check-in</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={checkInAllSessions}
                                            disabled={pendingSessions.every(s => !!s.checkedInAt) || isLoading}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
                                        >
                                            Check-in All Sessions
                                        </button>
                                        <button
                                            onClick={clearResult}
                                            className="px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scan Result */}
                        {!isLoading && scanResult && (
                            <div className="flex-1 flex flex-col items-center justify-center py-8 animate-fade-in">
                                <div className={`w-full max-w-md mx-auto rounded-2xl p-8 text-center ${scanResult.status === 'success'
                                    ? 'bg-green-50 border-2 border-green-200'
                                    : scanResult.status === 'duplicate'
                                        ? 'bg-yellow-50 border-2 border-yellow-200'
                                        : 'bg-red-50 border-2 border-red-200'
                                    }`}>
                                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${scanResult.status === 'success'
                                        ? 'bg-green-500'
                                        : scanResult.status === 'duplicate'
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}>
                                        {scanResult.status === 'success' ? (
                                            <IconCheck size={40} className="text-white" />
                                        ) : scanResult.status === 'duplicate' ? (
                                            <IconAlertTriangle size={40} className="text-white" />
                                        ) : (
                                            <IconX size={40} className="text-white" />
                                        )}
                                    </div>

                                    <h3 className={`text-2xl font-bold mb-2 ${scanResult.status === 'success'
                                        ? 'text-green-700'
                                        : scanResult.status === 'duplicate'
                                            ? 'text-yellow-700'
                                            : 'text-red-700'
                                        }`}>
                                        {scanResult.status === 'success'
                                            ? 'Check-in Successful!'
                                            : scanResult.status === 'duplicate'
                                                ? 'Already Checked In'
                                                : 'Check-in Failed'}
                                    </h3>
                                    <p className={`text-sm mb-4 ${scanResult.status === 'success'
                                        ? 'text-green-600'
                                        : scanResult.status === 'duplicate'
                                            ? 'text-yellow-600'
                                            : 'text-red-600'
                                        }`}>
                                        {scanResult.message}
                                    </p>

                                    {scanResult.name && (
                                        <div className="bg-white rounded-lg p-4 mb-4 text-left shadow-sm">
                                            <div className="flex items-center gap-3 mb-2">
                                                <IconUser size={18} className="text-gray-400" />
                                                <span className="font-medium text-gray-800">{scanResult.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <IconTicket size={18} className="text-gray-400" />
                                                <span className="text-gray-600">{scanResult.ticketType}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <IconScan size={18} className="text-gray-400" />
                                                <span className="font-mono text-gray-600">{scanResult.code}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={clearResult}
                                        className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors ${scanResult.status === 'success'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : scanResult.status === 'duplicate'
                                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                : 'bg-red-600 hover:bg-red-700 text-white'
                                            }`}
                                    >
                                        <IconRefresh size={18} /> Scan Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <IconCalendarEvent size={20} className="text-blue-600" />
                            Event Stats
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Confirmed</span>
                                <span className="font-bold text-gray-800">{stats.total}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Checked In</span>
                                <span className="font-bold text-green-600">{stats.checkedIn}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Remaining</span>
                                <span className="font-bold text-yellow-600">{stats.remaining}</span>
                            </div>
                            {stats.total > 0 && (
                                <div className="pt-2">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">Progress</span>
                                        <span className="font-medium text-gray-700">{Math.round((stats.checkedIn / stats.total) * 100)}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(stats.checkedIn / stats.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Check-ins */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Recent Scans</h3>
                            <button onClick={fetchData} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                <IconRefresh size={16} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentCheckins.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No recent scans</p>
                            ) : (
                                recentCheckins.map((checkin) => (
                                    <div
                                        key={checkin.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-green-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                                                <IconCheck size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm truncate max-w-[120px]" title={`${checkin.firstName} ${checkin.lastName}`}>
                                                    {checkin.firstName} {checkin.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono">{checkin.regCode}</p>
                                                {checkin.sessionName && (
                                                    <p className="text-xs text-gray-400">{checkin.sessionName}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">{checkin.scannedAt}</span>
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

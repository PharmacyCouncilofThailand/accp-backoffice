'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
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
} from '@tabler/icons-react';

type ScanResult = null | {
    status: 'success' | 'error' | 'duplicate';
    code: string;
    name?: string;
    ticketType?: string;
    message: string;
    eventName?: string;
};

interface RecentCheckin {
    id: number;
    regCode: string;
    firstName: string;
    lastName: string;
    ticketName: string;
    scannedAt: string;
    status: 'success' | 'duplicate'; // API mainly returns success, but sidebar might want to show errors if we logged them. The endpoint currently returns successful checkins.
}

export default function CheckinPage() {
    const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual');
    const [manualCode, setManualCode] = useState('');
    const [scanResult, setScanResult] = useState<ScanResult>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
            const token = localStorage.getItem('backoffice_token') || '';

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
                scannedAt: new Date(c.scannedAt).toLocaleTimeString(),
                status: 'success', // We only fetch successful ones usually
            })));

        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const processScan = async (code: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const res = await api.checkins.create(token, code);

            if (res.success) {
                setScanResult({
                    status: 'success',
                    code: code,
                    name: `${res.registration.firstName} ${res.registration.lastName}`,
                    ticketType: res.registration.ticketName,
                    eventName: res.registration.eventName,
                    message: 'Check-in successful!',
                });
                // Refresh stats
                fetchData();
            }
        } catch (error: any) {
            console.error('Scan error:', error);
            // Check for specific error codes if available in error message or response
            // The fetchAPI throws Error with message.
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
                        {!isLoading && scanMode === 'camera' && !scanResult && (
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
                        {!isLoading && scanMode === 'manual' && !scanResult && (
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

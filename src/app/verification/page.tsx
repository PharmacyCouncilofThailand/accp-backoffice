'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
    IconId,
    IconClock,
    IconCheck,
    IconX,
    IconSearch,
    IconEye,
    IconDownload,
    IconFileText,
    IconPhoto,
} from '@tabler/icons-react';


const statusColors: { [key: string]: string } = {
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-error',
};

const roleLabels: { [key: string]: { label: string; className: string } } = {
    'thai-student': { label: 'Thai Student', className: 'bg-green-100 text-green-800' },
    'intl-student': { label: 'International Student', className: 'bg-orange-100 text-orange-800' },
};

interface Verification {
    id: string;
    name: string;
    email: string;
    university: string;
    studentId: string;
    role: string;
    documentType: string;
    documentUrl: string;
    registrationCode: string;
    status: string;
    submittedAt: string;
    verifiedAt?: string;
    verifiedBy?: string;
    rejectionReason?: string;
}

// Helper to get proxy URL for Google Drive files
function getProxyUrl(url: string | null | undefined): string {
    if (!url) return '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    return `${apiUrl}/upload/proxy?url=${encodeURIComponent(url)}`;
}

export default function VerificationPage() {
    const { token } = useAuth();
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch verifications
    const fetchVerifications = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await api.verifications.list(token);
            setVerifications((data.pendingUsers || []) as unknown as Verification[]);
        } catch (error) {
            console.error('Failed to fetch verifications:', error);
            toast.error('Failed to load verification requests.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchVerifications();
        }
    }, [token]);

    const filteredVerifications = verifications.filter((v) => {
        const matchesSearch =
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.registrationCode.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = !statusFilter || v.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: verifications.length,
        pending: verifications.filter(v => v.status === 'pending').length,
        approved: verifications.filter(v => v.status === 'approved').length,
        rejected: verifications.filter(v => v.status === 'rejected').length,
    };

    const handleApprove = async () => {
        if (!selectedVerification || !token) return;
        try {
            await api.verifications.approve(token, selectedVerification.id);
            toast.success('Student verification approved!');
            fetchVerifications(); // Refresh list
            setShowApproveModal(false);
            setSelectedVerification(null);
        } catch (error) {
            console.error('Approval failed:', error);
            toast.error('Failed to approve verification.');
        }
    };

    const handleReject = async () => {
        if (!selectedVerification || !token || !rejectionReason) return;
        try {
            await api.verifications.reject(token, selectedVerification.id, rejectionReason);
            toast.success('Verification rejected.');
            fetchVerifications(); // Refresh list
            setShowRejectModal(false);
            setSelectedVerification(null);
            setRejectionReason('');
        } catch (error) {
            console.error('Rejection failed:', error);
            toast.error('Failed to reject verification.');
        }
    };

    return (
        <AdminLayout title="Student Verification">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <IconId size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total Requests</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
                            <IconClock size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                            <p className="text-sm text-gray-500">Pending Review</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                            <IconCheck size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                            <p className="text-sm text-gray-500">Approved</p>
                        </div>
                    </div>
                </div>
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                            <IconX size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                            <p className="text-sm text-gray-500">Rejected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">Verification Requests</h2>
                    <button className="btn-secondary flex items-center gap-2">
                        <IconDownload size={18} /> Export
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input-field w-auto"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-500">Loading verifications...</span>
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Student Info</th>
                                        <th>University</th>
                                        <th>Document</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVerifications.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-gray-500">
                                                No verification requests found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredVerifications.map((v) => (
                                            <tr key={v.id} className="animate-fade-in">
                                                <td className="font-mono text-sm text-gray-600">{v.id}</td>
                                                <td>
                                                    <div>
                                                        <p className="font-medium text-gray-800">{v.name}</p>
                                                        <p className="text-sm text-gray-500">{v.email}</p>
                                                        <span className={`badge text-xs mt-1 ${roleLabels[v.role]?.className}`}>
                                                            {roleLabels[v.role]?.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <p className="text-gray-800">{v.university}</p>
                                                    <p className="text-sm text-gray-500">ID: {v.studentId}</p>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <IconFileText size={16} className="text-gray-400" />
                                                        <span className="text-sm">{v.documentType}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusColors[v.status]}`}>
                                                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="text-gray-500 text-sm">
                                                    {new Date(v.submittedAt).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td>
                                                    <div className="flex gap-1 justify-center">
                                                        <button
                                                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                            title="View Document"
                                                            onClick={() => { setSelectedVerification(v); setShowViewModal(true); }}
                                                        >
                                                            <IconEye size={18} />
                                                        </button>
                                                        {v.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    className="p-1.5 hover:bg-green-100 rounded text-green-600"
                                                                    title="Approve"
                                                                    onClick={() => { setSelectedVerification(v); setShowApproveModal(true); }}
                                                                >
                                                                    <IconCheck size={18} />
                                                                </button>
                                                                <button
                                                                    className="p-1.5 hover:bg-red-100 rounded text-red-600"
                                                                    title="Reject"
                                                                    onClick={() => { setSelectedVerification(v); setShowRejectModal(true); }}
                                                                >
                                                                    <IconX size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                Showing {filteredVerifications.length} of {verifications.length} requests
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* View Modal */}
            {showViewModal && selectedVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <IconId size={20} /> Verification Details
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <IconX size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <span className="badge bg-gray-100 text-gray-700">{selectedVerification.id}</span>
                                <span className={`badge ${statusColors[selectedVerification.status]}`}>
                                    {selectedVerification.status}
                                </span>
                                <span className={`badge ${roleLabels[selectedVerification.role]?.className}`}>
                                    {roleLabels[selectedVerification.role]?.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-500">Full Name</p>
                                    <p className="font-semibold">{selectedVerification.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p>{selectedVerification.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">University</p>
                                    <p className="font-semibold">{selectedVerification.university}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Student ID</p>
                                    <p className="font-mono">{selectedVerification.studentId}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Registration Code</p>
                                    <p className="font-mono">{selectedVerification.registrationCode}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Submitted</p>
                                    <p>{new Date(selectedVerification.submittedAt).toLocaleString('th-TH')}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h5 className="font-semibold mb-3 flex items-center gap-2">
                                    <IconPhoto size={18} /> Uploaded Document
                                </h5>
                                <p className="text-sm text-gray-500 mb-2">{selectedVerification.documentType}</p>
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-8 text-center">
                                    {selectedVerification.documentUrl ? (
                                        <object
                                            data={getProxyUrl(selectedVerification.documentUrl)}
                                            className="w-full h-96 object-contain"
                                            type="image/jpeg"
                                        >
                                            <iframe
                                                src={getProxyUrl(selectedVerification.documentUrl)}
                                                className="w-full h-96"
                                                title="Document Preview"
                                            />
                                        </object>
                                    ) : (
                                        <div className="w-full h-64 flex items-center justify-center text-gray-400">
                                            No document uploaded
                                        </div>
                                    )}
                                </div>
                                {selectedVerification.documentUrl && (
                                    <a
                                        href={selectedVerification.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        <IconEye size={16} /> Open in New Tab
                                    </a>
                                )}
                            </div>

                            {selectedVerification.status === 'rejected' && selectedVerification.rejectionReason && (
                                <div className="mt-4 bg-red-50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-red-800">Rejection Reason:</p>
                                    <p className="text-red-700">{selectedVerification.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowViewModal(false)} className="btn-secondary">Close</button>
                            {selectedVerification.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => { setShowViewModal(false); setShowApproveModal(true); }}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <IconCheck size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={() => { setShowViewModal(false); setShowRejectModal(true); }}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                    >
                                        <IconX size={18} /> Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-green-600 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <IconCheck size={20} /> Approve Verification
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IconCheck size={32} className="text-green-600" />
                            </div>
                            <p className="mb-2">Approve student verification for:</p>
                            <p className="text-xl font-semibold text-gray-800">{selectedVerification.name}</p>
                            <p className="text-gray-500">{selectedVerification.university}</p>

                            <div className="mt-4 bg-blue-50 p-3 rounded-lg text-left text-sm">
                                <p className="font-semibold text-blue-800">What happens next:</p>
                                <ul className="list-disc list-inside text-blue-700 mt-1">
                                    <li>Registration will be updated to student rate</li>
                                    <li>User will receive confirmation email</li>
                                    <li>Student badge will be added to registration</li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowApproveModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleApprove} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                Approve Verification
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-red-600 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <IconX size={20} /> Reject Verification
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IconX size={32} className="text-red-600" />
                            </div>
                            <p className="text-center mb-2">Reject verification for:</p>
                            <p className="text-center text-xl font-semibold text-gray-800 mb-4">{selectedVerification.name}</p>

                            <div className="text-left">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="input-field mb-3"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                >
                                    <option value="">Select reason...</option>
                                    <option value="Document expired">Document expired</option>
                                    <option value="Document not readable/unclear">Document not readable/unclear</option>
                                    <option value="Name does not match registration">Name does not match registration</option>
                                    <option value="Invalid document type">Invalid document type</option>
                                    <option value="Suspected fraudulent document">Suspected fraudulent document</option>
                                    <option value="Other">Other</option>
                                </select>

                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                <textarea className="input-field h-20" placeholder="Provide details to help user resubmit..."></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
                            <button 
                                onClick={handleReject} 
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                disabled={!rejectionReason}
                            >
                                Reject Verification
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

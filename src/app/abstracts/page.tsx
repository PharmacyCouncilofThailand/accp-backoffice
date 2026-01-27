'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { api } from '@/lib/api';
import {
    IconFileText,
    IconClock,
    IconCheck,
    IconX,
    IconSearch,
    IconEye,
    IconDownload,
    IconLoader2,
} from '@tabler/icons-react';

const statusColors: { [key: string]: string } = {
    pending: 'badge-warning',
    accepted: 'badge-success',
    rejected: 'badge-error',
    under_review: 'badge-info',
};

// Map backend categories to colors if needed, or use generic
const topicColors: { [key: string]: string } = {
    'Research': 'bg-blue-100 text-blue-800',
    'Case Report': 'bg-purple-100 text-purple-800',
    'Review': 'bg-green-100 text-green-800',
    'Other': 'bg-gray-100 text-gray-800',
};

interface Abstract {
    id: number;
    title: string;
    category: string;
    presentationType: string | null;
    status: string;
    fullPaperUrl: string | null;
    createdAt: string;
    author: {
        firstName: string;
        lastName: string;
        email: string;
        institution: string | null;
    } | null;
    event: {
        name: string;
        code: string;
    } | null;
}

export default function AbstractsPage() {
    const [abstracts, setAbstracts] = useState<Abstract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedAbstract, setSelectedAbstract] = useState<Abstract | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewComment, setReviewComment] = useState('');

    useEffect(() => {
        fetchAbstracts();
    }, [page, searchTerm, statusFilter]);

    const fetchAbstracts = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            const params: any = { page, limit: 10 };
            if (statusFilter) params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const res = await api.abstracts.list(token, new URLSearchParams(params).toString());
            setAbstracts(res.abstracts as unknown as Abstract[]);
            setTotalCount(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch abstracts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (status: string, comment?: string) => {
        if (!selectedAbstract) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('backoffice_token') || '';
            await api.abstracts.updateStatus(token, selectedAbstract.id, status, comment);

            // Refresh list
            fetchAbstracts();

            // Close modals
            setShowApproveModal(false);
            setShowRejectModal(false);
            setShowViewModal(false);
            setSelectedAbstract(null);
            setReviewComment('');

            alert(`Abstract ${status === 'accepted' ? 'approved' : status} successfully!`);
        } catch (error) {
            console.error(error);
            alert(`Failed to ${status} abstract`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Abstract Submissions">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <IconFileText size={24} stroke={1.5} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{isLoading ? '-' : totalCount}</p>
                            <p className="text-sm text-gray-500">Total Submissions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">All Submissions</h2>
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
                            placeholder="Search by title, author, or ID..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="input-field pl-10"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="input-field w-auto"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <IconLoader2 size={32} className="animate-spin text-blue-600" />
                    </div>
                ) : abstracts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No abstracts found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th className="min-w-[300px]">Title & Author</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abstracts.map((abs) => (
                                    <tr key={abs.id} className="animate-fade-in">
                                        <td className="font-mono text-sm text-gray-600">ABS-{abs.id}</td>
                                        <td>
                                            <h5 className="font-medium text-gray-800 mb-1">{abs.title}</h5>
                                            <p className="text-sm text-gray-500">
                                                {abs.author?.firstName || 'Unknown'} {abs.author?.lastName || ''}
                                                {abs.author?.institution ? `, ${abs.author.institution}` : ''}
                                            </p>
                                        </td>
                                        <td>
                                            <span className={`badge ${topicColors[abs.category] || 'bg-gray-100 text-gray-800'}`}>
                                                {abs.category}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusColors[abs.status] || 'bg-gray-100'}`}>
                                                {abs.status.charAt(0).toUpperCase() + abs.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-sm text-gray-500">
                                                {new Date(abs.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex gap-1 justify-center">
                                                <button
                                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                                    title="View"
                                                    onClick={() => { setSelectedAbstract(abs); setShowViewModal(true); }}
                                                >
                                                    <IconEye size={18} />
                                                </button>
                                                {abs.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                                                            title="Approve"
                                                            onClick={() => { setSelectedAbstract(abs); setShowApproveModal(true); }}
                                                        >
                                                            <IconCheck size={18} />
                                                        </button>
                                                        <button
                                                            className="p-1.5 hover:bg-red-100 rounded text-red-600"
                                                            title="Reject"
                                                            onClick={() => { setSelectedAbstract(abs); setShowRejectModal(true); }}
                                                        >
                                                            <IconX size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                        Showing {abstracts.length} of {totalCount} abstracts
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

            {/* View Modal */}
            {showViewModal && selectedAbstract && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Abstract Details</h3>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <IconX size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <span className="badge bg-gray-100 text-gray-700">ABS-{selectedAbstract.id}</span>
                                <span className={`badge ${statusColors[selectedAbstract.status]}`}>
                                    {selectedAbstract.status.charAt(0).toUpperCase() + selectedAbstract.status.slice(1)}
                                </span>
                            </div>
                            <h4 className="text-xl font-semibold text-gray-800 mb-2">{selectedAbstract.title}</h4>
                            <p className="text-gray-600 mb-4">
                                <strong>{selectedAbstract.author?.firstName || 'Unknown'} {selectedAbstract.author?.lastName || ''}</strong>
                                {selectedAbstract.author?.institution ? `, ${selectedAbstract.author.institution}` : ''}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                <div><strong>Event:</strong> {selectedAbstract.event?.name || 'N/A'}</div>
                                <div><strong>Category:</strong> {selectedAbstract.category}</div>
                                <div><strong>Submitted:</strong> {new Date(selectedAbstract.createdAt).toLocaleString()}</div>
                                <div><strong>Presentation:</strong> {selectedAbstract.presentationType || 'Not assigned'}</div>
                            </div>

                            {/* Content would be fetched separately or we assume it's small enough to list. 
                                NB: The list API usually returns fields. If content is large, might need separate GET.
                                For now, assuming list schema didn't select content. 
                                If we need content, we'd need a detail API endpoint or update list to include it.
                                Let's assume for MVP we list it, but list query above included everything. 
                                WAIT, list query in abstracts.ts included `title`, `category`, etc. but NOT `content`.
                                So `selectedAbstract.content` will be undefined here unless we fetch it.
                                MVP: Just show "Content viewing not implemented yet" or update API.
                                I'll leave a placeholder.
                            */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h5 className="font-semibold mb-2">Abstract Content:</h5>
                                {selectedAbstract.fullPaperUrl ? (
                                    <div className="flex flex-col gap-3">
                                        <p className="text-gray-600">Full paper is available (PDF/Doc).</p>
                                        <a 
                                            href={selectedAbstract.fullPaperUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn-primary inline-flex items-center gap-2 self-start"
                                        >
                                            <IconFileText size={20} />
                                            View Full Paper
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic flex items-center gap-2">
                                        <IconX size={18} />
                                        No abstract file uploaded.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowViewModal(false)} className="btn-secondary">Close</button>
                            {selectedAbstract.status === 'pending' && (
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
            {showApproveModal && selectedAbstract && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-green-600 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <IconCheck size={20} /> Approve Abstract
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <p className="mb-2">Approve this abstract?</p>
                            <p className="font-semibold text-gray-800">{selectedAbstract.title.substring(0, 50)}...</p>

                            <div className="mt-4 text-left">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comments (optional)</label>
                                <textarea
                                    className="input-field h-20"
                                    placeholder="Reviewer comments..."
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowApproveModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                            <button
                                onClick={() => handleUpdateStatus('accepted', reviewComment)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <IconLoader2 size={18} className="animate-spin" />}
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedAbstract && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 bg-red-600 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <IconX size={20} /> Reject Abstract
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <p className="mb-2">Reject this abstract?</p>
                            <p className="font-semibold text-gray-800">{selectedAbstract.title.substring(0, 50)}...</p>

                            <div className="mt-4 text-left">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Comments</label>
                                <textarea
                                    className="input-field h-20"
                                    placeholder="Provide feedback to the author..."
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button onClick={() => setShowRejectModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                            <button
                                onClick={() => handleUpdateStatus('rejected', reviewComment)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <IconLoader2 size={18} className="animate-spin" />}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

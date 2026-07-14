'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout';
import {
    IconMailBolt,
    IconSend,
    IconSearch,
    IconX,
    IconCheck,
    IconAlertTriangle,
    IconRefresh,
    IconMail,
    IconEye,
    IconPaperclip,
    IconDownload,
    IconChevronLeft,
    IconChevronRight,
    IconArrowLeft,
    IconLayoutGrid,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateInfo {
    id: string;
    label: string;
    recipientType: 'user' | 'order' | 'registration' | 'abstract';
    requiresComment: boolean;
    description: string;
}

interface RecipientRow {
    id: number;
    label: string;
    email: string;
    detail: string;
    tag: string;
}

interface ManualEmailResult {
    id: number;
    email: string;
    name: string;
    type: string;
    status: 'sent' | 'failed' | 'skipped';
    reason?: string;
}

interface Summary {
    sent: number;
    failed: number;
    skipped: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static config
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_GROUPS = [
    { category: 'Account', templates: ['signup-notification', 'pending-approval', 'manual-registration'] },
    { category: 'Payment', templates: ['payment-receipt', 'approval-request'] },
    { category: 'Abstract', templates: ['abstract-submission', 'abstract-accepted-poster', 'abstract-accepted-oral', 'abstract-accepted-no-registration', 'abstract-rejected', 'academic-acceptance', 'presentation-schedule-notification'] },
    { category: 'Certificates', templates: ['participation-certificate', 'participation-certificate-non-english'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Preview modal
// ─────────────────────────────────────────────────────────────────────────────

interface AttachmentInfo { fileName: string; downloadUrl: string; }
interface PreviewData { html: string; subject: string; to: string; attachment?: AttachmentInfo; }

// Open an attachment URL in a new tab. Backoffice URLs require the bearer
// token, so fetch as a blob first and convert to an object URL. Falls back to
// a plain window.open() for public URLs.
async function openAttachment(att: AttachmentInfo) {
    const isAuthed = att.downloadUrl.includes('/api/backoffice/');
    if (!isAuthed) {
        window.open(att.downloadUrl, '_blank', 'noopener,noreferrer');
        return;
    }
    try {
        const token = localStorage.getItem('backoffice_token') || sessionStorage.getItem('backoffice_token') || '';
        const res = await fetch(att.downloadUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        // Revoke after a delay to give the new tab time to load.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
        toast.error('โหลดไฟล์แนบไม่สำเร็จ');
    }
}

function PreviewModal({ templateId, recipientId, comment, apiBase, onClose }: {
    templateId: string; recipientId: number; comment: string; apiBase: string; onClose: () => void;
}) {
    const [data, setData] = useState<PreviewData | null>(null);
    const [err, setErr]   = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('backoffice_token') || sessionStorage.getItem('backoffice_token') || '';
        const params = new URLSearchParams({ template: templateId, id: String(recipientId) });
        if (comment) params.set('comment', comment);
        fetch(`${apiBase}/api/backoffice/email-manual/render?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => r.json())
            .then(d => d.success
                ? setData({ html: d.html, subject: d.subject ?? '', to: d.to ?? '', attachment: d.attachment })
                : setErr(d.error ?? 'Failed'))
            .catch(() => setErr('Network error'));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: '88vh' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <IconMail size={16} className="text-indigo-500" />
                        <span className="font-semibold text-slate-800 text-sm">ดูตัวอย่าง Email</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={17} /></button>
                </div>
                {data && (
                    <div className="px-5 py-2 border-b border-slate-100 bg-slate-50 shrink-0 space-y-0.5">
                        <div className="flex gap-2 text-xs"><span className="w-14 text-slate-400 shrink-0">To</span><span className="text-slate-700 font-medium">{data.to}</span></div>
                        <div className="flex gap-2 text-xs"><span className="w-14 text-slate-400 shrink-0">Subject</span><span className="text-slate-700 font-medium">{data.subject}</span></div>
                        {data.attachment && (
                            <div className="flex items-center gap-2 text-xs pt-1">
                                <span className="w-14 text-slate-400 shrink-0">ไฟล์แนบ</span>
                                <button
                                    onClick={() => openAttachment(data.attachment!)}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors group"
                                    title="คลิกเพื่อดู PDF จริง"
                                >
                                    <IconPaperclip size={12} className="text-slate-400 group-hover:text-indigo-500" />
                                    <span className="font-medium">{data.attachment.fileName}</span>
                                    <IconDownload size={12} className="text-slate-400 group-hover:text-indigo-500" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-hidden">
                    {!data && !err && <div className="flex h-full items-center justify-center text-slate-400 gap-2 text-sm"><IconRefresh size={16} className="animate-spin" /> กำลังโหลด...</div>}
                    {err && <div className="flex h-full items-center justify-center text-red-400 gap-2 text-sm"><IconAlertTriangle size={16} />{err}</div>}
                    {data && <iframe srcDoc={data.html} className="w-full h-full border-0" sandbox="allow-same-origin" title="Email Preview" />}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">ปิด</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ManualEmailResult['status'] }) {
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
        sent:    { icon: <IconCheck size={11} />,         label: 'ส่งแล้ว', cls: 'bg-green-100 text-green-700' },
        failed:  { icon: <IconX size={11} />,             label: 'ล้มเหลว', cls: 'bg-red-100 text-red-700' },
        skipped: { icon: <IconAlertTriangle size={11} />, label: 'ข้าม',    cls: 'bg-yellow-100 text-yellow-700' },
    };
    const { icon, label, cls } = map[status] ?? map.skipped;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{icon}{label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function EmailManualPage() {
    const [templates, setTemplates]             = useState<TemplateInfo[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);

    const [allRecipients, setAllRecipients] = useState<RecipientRow[]>([]);
    const [loadingRec, setLoadingRec]       = useState(false);
    const [filterQuery, setFilterQuery]     = useState('');
    const [selected, setSelected]           = useState<Set<number>>(new Set());

    const [comment, setComment]   = useState('');
    const [previewTarget, setPreviewTarget] = useState<RecipientRow | null>(null);
    const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

    const [sending, setSending]   = useState(false);
    const [results, setResults]   = useState<ManualEmailResult[] | null>(null);
    const [summary, setSummary]   = useState<Summary | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

    function getToken() {
        return localStorage.getItem('backoffice_token') || sessionStorage.getItem('backoffice_token') || '';
    }

    // ── Load templates ────────────────────────────────────────────────────────
    useEffect(() => {
        fetch(`${API_BASE}/api/backoffice/email-manual/templates`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then(r => r.json())
            .then(d => { if (d.success) setTemplates(d.templates); })
            .catch(() => {});
    }, [API_BASE]);

    // ── Load recipients when template changes ─────────────────────────────────
    useEffect(() => {
        if (!selectedTemplate) { setAllRecipients([]); setSelected(new Set()); return; }
        setLoadingRec(true);
        setAllRecipients([]);
        setSelected(new Set());
        setFilterQuery('');
        setResults(null);
        setSummary(null);
        setComment('');

        fetch(`${API_BASE}/api/backoffice/email-manual/recipients?template=${selectedTemplate.id}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setAllRecipients(d.recipients);
                    setSelected(new Set((d.recipients as RecipientRow[]).map(r => r.id)));
                } else {
                    toast.error(d.error ?? 'โหลดรายชื่อไม่สำเร็จ');
                }
            })
            .catch(() => toast.error('เชื่อมต่อ API ไม่ได้'))
            .finally(() => setLoadingRec(false));
    }, [selectedTemplate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Client-side filter ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!filterQuery.trim()) return allRecipients;
        const q = filterQuery.toLowerCase();
        return allRecipients.filter(r =>
            r.label.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q) ||
            r.detail.toLowerCase().includes(q) ||
            r.tag.toLowerCase().includes(q)
        );
    }, [allRecipients, filterQuery]);

    const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
    const selectedCount = allRecipients.filter(r => selected.has(r.id)).length;

    // ── Selection helpers ─────────────────────────────────────────────────────
    function toggleAll() {
        setSelected(prev => {
            const next = new Set(prev);
            if (allFilteredSelected) filtered.forEach(r => next.delete(r.id));
            else filtered.forEach(r => next.add(r.id));
            return next;
        });
    }

    function toggleRow(id: number) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    async function handleSend() {
        if (!selectedTemplate || selectedCount === 0) return;
        if (!confirm(`ยืนยันส่ง "${selectedTemplate.label}" ถึง ${selectedCount} คน?`)) return;
        setSending(true);
        setResults(null);
        setSummary(null);
        try {
            const ids = allRecipients.filter(r => selected.has(r.id)).map(r => r.id);
            const res = await fetch(`${API_BASE}/api/backoffice/email-manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ template: selectedTemplate.id, recipientIds: ids, dryRun: false, comment: comment || undefined }),
            });
            const data = await res.json();
            if (!data.success) { toast.error(data.error ?? 'เกิดข้อผิดพลาด'); return; }
            setResults(data.results);
            setSummary(data.summary);
            const { sent, failed } = data.summary;
            if (failed > 0) toast.error(`ส่งสำเร็จ ${sent}, ล้มเหลว ${failed}`);
            else toast.success(`ส่ง email สำเร็จ ${sent} รายการ`);
        } catch { toast.error('เชื่อมต่อ API ไม่ได้'); }
        finally { setSending(false); }
    }

    const templateMap = Object.fromEntries(templates.map(t => [t.id, t]));

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AdminLayout>
            <div className="flex flex-col h-full p-6 gap-4">

                {/* Header */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <IconMailBolt size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Manual Email Sender</h1>
                        <p className="text-xs text-slate-500">คลิก template → รายชื่อขึ้นอัตโนมัติ → เลือก → ส่ง</p>
                    </div>
                </div>

                {/* Template tab bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shrink-0">
                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                        {TEMPLATE_GROUPS.map(group => (
                            <div key={group.category} className="flex flex-col gap-1.5">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{group.category}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.templates.map(tid => {
                                        const t = templateMap[tid];
                                        if (!t) return null;
                                        const active = selectedTemplate?.id === tid;
                                        return (
                                            <button
                                                key={tid}
                                                onClick={() => setSelectedTemplate(t)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                                    active
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content: toolbar + table */}
                {selectedTemplate && (
                    <div className="flex flex-col gap-3 flex-1 min-h-0">

                        {/* Toolbar */}
                        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shrink-0">
                            {/* Filter */}
                            <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
                                <IconSearch size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={filterQuery}
                                    onChange={e => setFilterQuery(e.target.value)}
                                    placeholder="กรองรายชื่อ..."
                                    className="w-full pl-8 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                                />
                                {filterQuery && (
                                    <button onClick={() => setFilterQuery('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                                        <IconX size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Count */}
                            <span className="text-sm text-slate-500 whitespace-nowrap">
                                {loadingRec ? 'กำลังโหลด...' : `เลือก ${selectedCount} จาก ${allRecipients.length} รายการ`}
                            </span>

                            {/* Comment (abstract only) */}
                            {selectedTemplate.requiresComment && (
                                <input
                                    type="text"
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder="Comment (เหตุผล / หมายเหตุ)"
                                    className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                                />
                            )}

                            {/* Bulk preview */}
                            <button
                                onClick={() => setBulkPreviewOpen(true)}
                                disabled={selectedCount === 0 || loadingRec}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 font-medium px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                                title="ดูตัวอย่าง email ที่เลือกไว้ทั้งหมด"
                            >
                                <IconLayoutGrid size={15} />
                                Preview ทั้งหมด ({selectedCount})
                            </button>

                            {/* Send */}
                            <button
                                onClick={handleSend}
                                disabled={sending || selectedCount === 0 || loadingRec}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                            >
                                {sending ? <IconRefresh size={15} className="animate-spin" /> : <IconSend size={15} />}
                                {sending ? 'กำลังส่ง...' : `ส่ง Email (${selectedCount} คน)`}
                            </button>
                        </div>

                        {/* Recipients table */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
                            {loadingRec ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                                    <IconRefresh size={28} className="animate-spin opacity-40" />
                                    <p className="text-sm">กำลังโหลดรายชื่อ...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <IconMail size={36} strokeWidth={1} className="opacity-30" />
                                    <p className="text-sm">{filterQuery ? 'ไม่พบรายการที่ตรงกับ filter' : 'ไม่มีผู้รับในหัวข้อนี้'}</p>
                                </div>
                            ) : (
                                <div className="overflow-auto flex-1">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                                                <th className="px-4 py-3 w-10">
                                                    <input
                                                        ref={el => { if (el) el.indeterminate = filtered.some(r => selected.has(r.id)) && !allFilteredSelected; }}
                                                        type="checkbox"
                                                        checked={allFilteredSelected}
                                                        onChange={toggleAll}
                                                        className="accent-indigo-600 w-4 h-4 cursor-pointer"
                                                        title="เลือก/ยกเลิกทั้งหมด"
                                                    />
                                                </th>
                                                <th className="text-left px-4 py-3">ชื่อ / ID</th>
                                                <th className="text-left px-4 py-3">Email</th>
                                                <th className="text-left px-4 py-3">รายละเอียด</th>
                                                <th className="text-left px-4 py-3">Tag</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filtered.map(row => {
                                                const checked = selected.has(row.id);
                                                return (
                                                    <tr
                                                        key={row.id}
                                                        onClick={() => toggleRow(row.id)}
                                                        className={`cursor-pointer transition-colors ${checked ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                                                    >
                                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleRow(row.id)}
                                                                className="accent-indigo-600 w-4 h-4 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-slate-800">{row.label}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">{row.email}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{row.detail}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">{row.tag}</span>
                                                        </td>
                                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setPreviewTarget(row)}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                title="ดูตัวอย่าง email"
                                                            >
                                                                <IconEye size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty state when no template selected */}
                {!selectedTemplate && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
                        <IconMailBolt size={52} strokeWidth={1} />
                        <p className="text-sm">คลิก template ด้านบนเพื่อเริ่มต้น</p>
                    </div>
                )}

                {/* Results table (after send) */}
                {results && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 text-sm">ผลการส่ง Email</h3>
                            <div className="flex items-center gap-4 text-sm">
                                {summary && (
                                    <>
                                        {summary.sent    > 0 && <span className="text-green-600 font-medium">✓ {summary.sent} ส่งสำเร็จ</span>}
                                        {summary.skipped > 0 && <span className="text-yellow-600 font-medium">— {summary.skipped} ข้าม</span>}
                                        {summary.failed  > 0 && <span className="text-red-600 font-medium">✗ {summary.failed} ล้มเหลว</span>}
                                    </>
                                )}
                                <button onClick={() => { setResults(null); setSummary(null); }} className="text-slate-400 hover:text-slate-600 ml-2">
                                    <IconX size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-64">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                                        <th className="text-left px-4 py-2.5">Email</th>
                                        <th className="text-left px-4 py-2.5">ชื่อ</th>
                                        <th className="text-left px-4 py-2.5">สถานะ</th>
                                        <th className="text-left px-4 py-2.5">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-2.5 text-slate-700">{row.email}</td>
                                            <td className="px-4 py-2.5 text-slate-700">{row.name}</td>
                                            <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                                            <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate">{row.reason ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Preview modal */}
            {previewTarget && selectedTemplate && (
                <PreviewModal
                    templateId={selectedTemplate.id}
                    recipientId={previewTarget.id}
                    comment={comment}
                    apiBase={API_BASE}
                    onClose={() => setPreviewTarget(null)}
                />
            )}

            {/* Bulk preview modal */}
            {bulkPreviewOpen && selectedTemplate && (
                <BulkPreviewModal
                    templateId={selectedTemplate.id}
                    recipients={allRecipients.filter(r => selected.has(r.id))}
                    comment={comment}
                    apiBase={API_BASE}
                    onClose={() => setBulkPreviewOpen(false)}
                />
            )}
        </AdminLayout>
    );
}

// ───────────────────────────────────────────────────────────────────────────────────
// Bulk preview modal — แสดงทุกฉบับเป็น grid + คลิกขยายเต็มจอพร้อม prev/next
// ───────────────────────────────────────────────────────────────────────────────────

type RenderState = PreviewData | 'loading' | 'error';

function BulkPreviewModal({ templateId, recipients, comment, apiBase, onClose }: {
    templateId: string;
    recipients: RecipientRow[];
    comment: string;
    apiBase: string;
    onClose: () => void;
}) {
    // Lazy init: every recipient starts in 'loading'. The component is mounted
    // fresh whenever the modal opens, so this initializer runs at the right time.
    const [renders, setRenders] = useState<Record<number, RenderState>>(() =>
        Object.fromEntries(recipients.map(r => [r.id, 'loading' as const])),
    );
    const [zoomIndex, setZoomIndex] = useState<number | null>(null);

    // Concurrency-limited fetch (4 in parallel) — avoids hammering the API when
    // the user has selected many recipients.
    useEffect(() => {
        const token = localStorage.getItem('backoffice_token') || sessionStorage.getItem('backoffice_token') || '';
        let cancelled = false;

        async function fetchOne(rec: RecipientRow) {
            const params = new URLSearchParams({ template: templateId, id: String(rec.id) });
            if (comment) params.set('comment', comment);
            try {
                const res = await fetch(`${apiBase}/api/backoffice/email-manual/render?${params}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const d = await res.json();
                if (cancelled) return;
                if (d.success) {
                    setRenders(prev => ({
                        ...prev,
                        [rec.id]: { html: d.html, subject: d.subject ?? '', to: d.to ?? '', attachment: d.attachment },
                    }));
                } else {
                    setRenders(prev => ({ ...prev, [rec.id]: 'error' }));
                }
            } catch {
                if (!cancelled) setRenders(prev => ({ ...prev, [rec.id]: 'error' }));
            }
        }

        (async () => {
            const queue = [...recipients];
            const workers = Array.from({ length: 4 }, async () => {
                while (queue.length && !cancelled) {
                    const next = queue.shift();
                    if (next) await fetchOne(next);
                }
            });
            await Promise.all(workers);
        })();

        return () => { cancelled = true; };
    }, [templateId, comment, apiBase, recipients]);

    // Keyboard nav (only when zoomed); Esc behavior is contextual.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                if (zoomIndex !== null) setZoomIndex(null);
                else onClose();
                return;
            }
            if (zoomIndex === null) return;
            if (e.key === 'ArrowLeft' && zoomIndex > 0) setZoomIndex(zoomIndex - 1);
            if (e.key === 'ArrowRight' && zoomIndex < recipients.length - 1) setZoomIndex(zoomIndex + 1);
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [zoomIndex, recipients.length, onClose]);

    const zoomRec = zoomIndex !== null ? recipients[zoomIndex] : null;
    const zoomState: RenderState | undefined = zoomRec ? renders[zoomRec.id] : undefined;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60" />

            {zoomRec ? (
                // ───── Detail / zoom view ─────
                <div className="relative w-full max-w-5xl flex flex-col" style={{ height: '95vh' }} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-white rounded-t-2xl flex items-center justify-between px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => setZoomIndex(null)}
                                className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-medium shrink-0"
                            >
                                <IconArrowLeft size={15} /> กลับ
                            </button>
                            <span className="text-slate-200 shrink-0">|</span>
                            <span className="text-sm text-slate-600 truncate">
                                <strong className="text-slate-800">{zoomIndex! + 1}</strong>
                                <span className="text-slate-400"> / {recipients.length}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="font-medium text-slate-700">{zoomRec.label}</span>
                                <span className="text-slate-400 text-xs ml-2">{zoomRec.email}</span>
                            </span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0"><IconX size={17} /></button>
                    </div>

                    {/* Email metadata */}
                    {typeof zoomState === 'object' && zoomState && (
                        <div className="bg-slate-50 px-5 py-2 border-b border-slate-100 space-y-0.5 shrink-0">
                            <div className="flex gap-2 text-xs"><span className="w-14 text-slate-400 shrink-0">To</span><span className="text-slate-700 font-medium">{zoomState.to}</span></div>
                            <div className="flex gap-2 text-xs"><span className="w-14 text-slate-400 shrink-0">Subject</span><span className="text-slate-700 font-medium">{zoomState.subject}</span></div>
                            {zoomState.attachment && (
                                <div className="flex items-center gap-2 text-xs pt-0.5">
                                    <span className="w-14 text-slate-400 shrink-0">ไฟล์แนบ</span>
                                    <button
                                        onClick={() => openAttachment(zoomState.attachment!)}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors group"
                                        title="คลิกเพื่อดู PDF จริง"
                                    >
                                        <IconPaperclip size={12} className="text-slate-400 group-hover:text-indigo-500" />
                                        <span className="font-medium">{zoomState.attachment.fileName}</span>
                                        <IconDownload size={12} className="text-slate-400 group-hover:text-indigo-500" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className="flex-1 bg-white relative overflow-hidden rounded-b-2xl">
                        {zoomState === 'loading' && (
                            <div className="flex items-center justify-center h-full text-slate-400 gap-2 text-sm">
                                <IconRefresh size={16} className="animate-spin" /> กำลังโหลด...
                            </div>
                        )}
                        {zoomState === 'error' && (
                            <div className="flex items-center justify-center h-full text-red-400 gap-2 text-sm">
                                <IconAlertTriangle size={16} /> โหลดไม่สำเร็จ
                            </div>
                        )}
                        {typeof zoomState === 'object' && zoomState && (
                            <iframe srcDoc={zoomState.html} className="w-full h-full border-0" sandbox="allow-same-origin" title="Email Preview" />
                        )}
                    </div>

                    {/* Prev/Next floating buttons */}
                    {zoomIndex! > 0 && (
                        <button
                            onClick={() => setZoomIndex(zoomIndex! - 1)}
                            className="absolute left-0 lg:-left-16 top-1/2 -translate-y-1/2 bg-white rounded-full p-2.5 lg:p-3 shadow-lg hover:bg-slate-50 transition z-10"
                            title="ก่อนหน้า (←)"
                        >
                            <IconChevronLeft size={20} />
                        </button>
                    )}
                    {zoomIndex! < recipients.length - 1 && (
                        <button
                            onClick={() => setZoomIndex(zoomIndex! + 1)}
                            className="absolute right-0 lg:-right-16 top-1/2 -translate-y-1/2 bg-white rounded-full p-2.5 lg:p-3 shadow-lg hover:bg-slate-50 transition z-10"
                            title="ถัดไป (→)"
                        >
                            <IconChevronRight size={20} />
                        </button>
                    )}
                </div>
            ) : (
                // ───── Grid view ─────
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl flex flex-col" style={{ height: '90vh' }} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <IconLayoutGrid size={16} className="text-indigo-500" />
                            <span className="font-semibold text-slate-800 text-sm">
                                Preview ทั้งหมด ({recipients.length} ฉบับ)
                            </span>
                            <span className="text-xs text-slate-400 ml-2">— คลิกที่ฉบับใดๆ เพื่อขยายดู</span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={17} /></button>
                    </div>
                    <div className="flex-1 overflow-auto p-5 bg-slate-50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {recipients.map((r, i) => {
                                const state = renders[r.id];
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => setZoomIndex(i)}
                                        className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-lg overflow-hidden transition-all flex flex-col text-left group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative bg-slate-100 w-full overflow-hidden" style={{ aspectRatio: '210/297' }}>
                                            {state === 'loading' && (
                                                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                                    <IconRefresh size={18} className="animate-spin" />
                                                </div>
                                            )}
                                            {state === 'error' && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-300 text-xs gap-1">
                                                    <IconAlertTriangle size={16} />
                                                    <span>Render failed</span>
                                                </div>
                                            )}
                                            {typeof state === 'object' && state && (
                                                <iframe
                                                    srcDoc={state.html}
                                                    className="border-0 absolute top-0 left-0 pointer-events-none"
                                                    style={{
                                                        width: '250%',
                                                        height: '250%',
                                                        transform: 'scale(0.4)',
                                                        transformOrigin: 'top left',
                                                    }}
                                                    sandbox="allow-same-origin"
                                                    title={`Preview ${r.label}`}
                                                />
                                            )}
                                            {/* Index badge */}
                                            <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur text-slate-600 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shadow-sm">
                                                #{i + 1}
                                            </div>
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center pointer-events-none">
                                                <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-2 shadow-lg transition-opacity">
                                                    <IconEye size={18} className="text-indigo-600" />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Footer */}
                                        <div className="p-2.5 border-t border-slate-100 text-xs min-w-0">
                                            <p className="font-semibold text-slate-800 truncate">{r.label}</p>
                                            <p className="text-slate-500 truncate text-[11px]">{r.email}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

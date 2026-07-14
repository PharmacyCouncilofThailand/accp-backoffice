'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { useAuth } from '@/contexts/AuthContext';
import { api, type CertificateRecipient } from '@/lib/api';
import {
  IconCertificate,
  IconUpload,
  IconDatabase,
  IconUserPlus,
  IconDownload,
  IconMail,
  IconEye,
  IconTrash,
  IconAlertTriangle,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

const TITLE_PREFIX_OPTIONS = [
  'MR.',
  'MS.',
  'MRS.',
  'DR.',
  'PROF.',
  'ASSOC. PROF.',
  'ASST. PROF.',
  'นาย',
  'นาง',
  'นางสาว',
  'ดร.',
  'ศ.',
  'รศ.',
  'ผศ.',
];

type TemplateInfo = {
  code: string;
  name: string;
  nameLabel: string;
  dbSourceEnabled: boolean;
  dbSourceType: string;
};

function buildDisplayName(r: CertificateRecipient): string {
  if (r.certificateNameOverride?.trim()) return r.certificateNameOverride.trim();
  return [r.titlePrefix, r.firstName, r.middleName, r.lastName]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function emptyRecipient(): CertificateRecipient {
  return {
    titlePrefix: 'DR.',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    institution: '',
    sourceType: 'manual',
  };
}

export default function CertificatesPage() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);
  const [recipients, setRecipients] = useState<CertificateRecipient[]>([]);
  const [sourceTab, setSourceTab] = useState<'upload' | 'database' | 'manual'>('upload');
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState('');
  const [search, setSearch] = useState('');
  const [checkedInOnly, setCheckedInOnly] = useState(true);
  const [manualForm, setManualForm] = useState(emptyRecipient());
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState(
    'Dear recipient,\n\nPlease find attached your certificate from the 25th Asian Conference on Clinical Pharmacy (ACCP 2026).\n\nThank you for your participation.\n\nBest regards,\nACCP 2026 Organizing Committee',
  );
  const [sendResults, setSendResults] = useState<
    Array<{ email: string; name: string; status: string; reason?: string }>
  >([]);

  useEffect(() => {
    if (!token) return;
    api.certificates
      .getTemplates(token)
      .then((res) => setTemplates(res.data))
      .catch((err) => toast.error(err.message));
  }, [token]);

  const missingPrefixCount = useMemo(
    () => recipients.filter((r) => !r.titlePrefix?.trim()).length,
    [recipients],
  );

  const missingEmailCount = useMemo(
    () => recipients.filter((r) => !r.email?.trim()).length,
    [recipients],
  );

  function updateRecipient(index: number, patch: Partial<CertificateRecipient>) {
    setRecipients((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        return { ...next, certificateName: buildDisplayName(next) };
      }),
    );
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCsvUpload(file: File) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.certificates.parseUpload(token, file);
      if (res.data.errors.length > 0) {
        toast.error(`${res.data.errors.length} row(s) failed validation`);
      }
      setRecipients((prev) => [...prev, ...res.data.recipients]);
      toast.success(`Loaded ${res.data.recipients.length} recipient(s)`);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDatabaseLoad() {
    if (!token || !selectedTemplate) return;
    setLoading(true);
    try {
      const res = await api.certificates.resolveRecipients(token, {
        templateCode: selectedTemplate.code,
        sources: [
          {
            type: 'database',
            filter: {
              eventId: eventId ? Number(eventId) : undefined,
              checkedIn: checkedInOnly,
              search: search || undefined,
            },
          },
        ],
        deduplicateBy: 'email',
      });
      setRecipients((prev) => {
        const merged = [...prev, ...res.data.recipients];
        const seen = new Set<string>();
        return merged.filter((r) => {
          const key = (r.email || buildDisplayName(r)).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      toast.success(`Loaded ${res.data.recipients.length} recipient(s) from database`);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Database load failed');
    } finally {
      setLoading(false);
    }
  }

  function handleAddManual() {
    if (!manualForm.firstName.trim() || !manualForm.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    const row: CertificateRecipient = {
      ...manualForm,
      sourceType: 'manual',
      certificateName: buildDisplayName(manualForm),
    };
    setRecipients((prev) => [...prev, row]);
    setManualForm(emptyRecipient());
    toast.success('Recipient added');
    setStep(3);
  }

  async function handleDownloadZip() {
    if (!token || !selectedTemplate) return;
    if (missingPrefixCount > 0) {
      toast.error('All recipients must have a title prefix');
      return;
    }
    setLoading(true);
    try {
      await api.certificates.downloadZip(token, selectedTemplate.code, recipients);
      toast.success('ZIP downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmail(dryRun: boolean) {
    if (!token || !selectedTemplate) return;
    if (missingPrefixCount > 0) {
      toast.error('All recipients must have a title prefix');
      return;
    }
    if (!dryRun && missingEmailCount > 0) {
      toast.error('All recipients must have an email to send');
      return;
    }
    setLoading(true);
    try {
      const res = await api.certificates.sendEmail(token, {
        templateCode: selectedTemplate.code,
        recipients,
        subject: emailSubject || undefined,
        bodyHtml: emailBody,
        dryRun,
      });
      setSendResults(res.data.results);
      toast.success(
        dryRun
          ? `Dry run: ${res.data.summary.skipped} recipient(s)`
          : `Sent ${res.data.summary.sent}, failed ${res.data.summary.failed}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewRow(index: number) {
    if (!token || !selectedTemplate) return;
    const name = buildDisplayName(recipients[index]);
    try {
      await api.certificates.previewPdf(token, selectedTemplate.code, name);
    } catch {
      toast.error('Preview failed');
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <IconCertificate size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Certificate Center</h1>
            <p className="text-sm text-gray-500">
              Generate certificates from templates, CSV, database, or manual entry
            </p>
          </div>
        </div>

        <div className="flex gap-2 text-sm">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={`px-3 py-1 rounded-full border ${
                step === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Step {n}
            </button>
          ))}
        </div>

        {step === 1 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">1. Select Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.code}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setStep(2);
                  }}
                  className={`text-left p-4 rounded-lg border transition ${
                    selectedTemplate?.code === template.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wide text-blue-700 font-medium">
                    {template.nameLabel}
                  </div>
                  <div className="font-semibold text-gray-900 mt-1">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {template.dbSourceEnabled
                      ? `DB source: ${template.dbSourceType}`
                      : 'Manual / CSV only'}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && selectedTemplate && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              2. Add Recipients — {selectedTemplate.name}
            </h2>

            <div className="flex gap-2">
              {([
                ['upload', 'Upload CSV', IconUpload],
                ['database', 'Database', IconDatabase],
                ['manual', 'Manual', IconUserPlus],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSourceTab(key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    sourceTab === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {sourceTab === 'upload' && (
              <div className="border border-dashed border-gray-300 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-3">
                  CSV columns: <code>title_prefix</code>, <code>first_name</code>,{' '}
                  <code>last_name</code>, optional <code>middle_name</code>,{' '}
                  <code>email</code>, <code>institution</code>
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={loading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCsvUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {sourceTab === 'database' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Event ID (optional)"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                  placeholder="Search name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {selectedTemplate.dbSourceType === 'registration' && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={checkedInOnly}
                      onChange={(e) => setCheckedInOnly(e.target.checked)}
                    />
                    Checked-in only
                  </label>
                )}
                <button
                  type="button"
                  disabled={loading || !selectedTemplate.dbSourceEnabled}
                  onClick={() => void handleDatabaseLoad()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                >
                  Load from Database
                </button>
              </div>
            )}

            {sourceTab === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={manualForm.titlePrefix}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, titlePrefix: e.target.value }))
                  }
                >
                  {TITLE_PREFIX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="First name"
                  value={manualForm.firstName}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Middle name"
                  value={manualForm.middleName || ''}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, middleName: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Last name"
                  value={manualForm.lastName}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Email"
                  value={manualForm.email || ''}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Institution"
                  value={manualForm.institution || ''}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, institution: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={handleAddManual}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
                >
                  Add Recipient
                </button>
              </div>
            )}

            <div className="text-sm text-gray-600">
              Current list: <strong>{recipients.length}</strong> recipient(s)
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">3. Preview & Edit</h2>
              {missingPrefixCount > 0 && (
                <div className="inline-flex items-center gap-2 text-amber-700 text-sm">
                  <IconAlertTriangle size={16} />
                  {missingPrefixCount} missing title prefix
                </div>
              )}
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Prefix</th>
                    <th className="px-3 py-2 text-left">First</th>
                    <th className="px-3 py-2 text-left">Middle</th>
                    <th className="px-3 py-2 text-left">Last</th>
                    <th className="px-3 py-2 text-left">Certificate Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((row, index) => (
                    <tr key={`${row.sourceId ?? 'row'}-${index}`} className="border-t">
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-28"
                          value={row.titlePrefix}
                          onChange={(e) =>
                            updateRecipient(index, { titlePrefix: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-28"
                          value={row.firstName}
                          onChange={(e) =>
                            updateRecipient(index, { firstName: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-24"
                          value={row.middleName || ''}
                          onChange={(e) =>
                            updateRecipient(index, { middleName: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-28"
                          value={row.lastName}
                          onChange={(e) =>
                            updateRecipient(index, { lastName: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="font-medium"
                          style={{ color: '#002060', fontFamily: 'Garamond, serif' }}
                        >
                          {buildDisplayName(row)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-44"
                          value={row.email || ''}
                          onChange={(e) =>
                            updateRecipient(index, { email: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          onClick={() => void handlePreviewRow(index)}
                          title="Preview PDF"
                        >
                          <IconEye size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"
                          onClick={() => removeRecipient(index)}
                          title="Remove"
                        >
                          <IconTrash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recipients.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                        No recipients yet. Go to Step 2 to add recipients.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {step === 4 && selectedTemplate && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">4. Generate & Send</h2>
            <p className="text-sm text-gray-600">
              Template: <strong>{selectedTemplate.name}</strong> — {recipients.length}{' '}
              recipient(s)
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading || recipients.length === 0}
                onClick={() => void handleDownloadZip()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
              >
                <IconDownload size={16} />
                Download ZIP
              </button>
              <button
                type="button"
                disabled={loading || recipients.length === 0}
                onClick={() => void handleSendEmail(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
              >
                Dry Run Email
              </button>
              <button
                type="button"
                disabled={loading || recipients.length === 0}
                onClick={() => void handleSendEmail(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
              >
                <IconMail size={16} />
                Send Email
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Email subject (optional)"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <div className="text-xs text-gray-500 self-center">
                {missingEmailCount > 0
                  ? `${missingEmailCount} recipient(s) missing email`
                  : 'All recipients have email'}
              </div>
            </div>
            <textarea
              className="border rounded-lg px-3 py-2 text-sm w-full min-h-28"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />

            {sendResults.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendResults.map((r) => (
                      <tr key={`${r.email}-${r.name}`} className="border-t">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              r.status === 'sent'
                                ? 'text-emerald-700'
                                : r.status === 'failed'
                                  ? 'text-red-700'
                                  : 'text-gray-600'
                            }
                          >
                            {r.status}
                            {r.reason ? ` — ${r.reason}` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

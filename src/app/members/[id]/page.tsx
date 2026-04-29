"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout";
import { api } from "@/lib/api";
import { getFullName, getInitials } from "@/lib/name";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import {
  IconArrowLeft,
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconMail,
  IconPhone,
  IconBuilding,
  IconWorld,
  IconId,
  IconCertificate,
  IconCalendar,
  IconLogin2,
  IconLoader2,
  IconSchool,
  IconAlertTriangle,
} from "@tabler/icons-react";

interface MemberDetail {
  id: number;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  role: string;
  status: string;
  phone: string | null;
  country: string | null;
  institution: string | null;
  university?: string | null;
  thaiIdCard: string | null;
  passportId: string | null;
  pharmacyLicenseId: string | null;
  verificationDocUrl: string | null;
  rejectionReason: string | null;
  resubmissionCount: number;
  createdAt: string;
}

const roleOptions = [
  { value: "thstd", label: "Thai Student" },
  { value: "interstd", label: "International Student" },
  { value: "thpro", label: "Thai Professional" },
  { value: "interpro", label: "International Professional" },
  { value: "general", label: "General" },
  { value: "admin", label: "Admin" },
];

const statusOptions = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
];

const roleLabels: Record<string, { label: string; className: string }> = {
  thstd: { label: "Thai Student", className: "bg-blue-100 text-blue-800" },
  interstd: { label: "International Student", className: "bg-purple-100 text-purple-800" },
  thpro: { label: "Thai Professional", className: "bg-green-100 text-green-800" },
  interpro: { label: "International Professional", className: "bg-orange-100 text-orange-800" },
  guest: { label: "Guest", className: "bg-teal-100 text-teal-800" },
  general: { label: "General", className: "bg-gray-100 text-gray-800" },
  admin: { label: "Admin", className: "bg-red-100 text-red-800" },
};

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_approval: { label: "Pending", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function MemberDetailPage() {
  const { token, isAdmin } = useAuth();
  const params = useParams();
  const router = useRouter();
  const memberId = Number(params.id);

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // Convert to Student modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTargetRole, setConvertTargetRole] = useState<"thstd" | "interstd">("thstd");
  const [convertReason, setConvertReason] = useState("");
  const [converting, setConverting] = useState(false);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    role: "",
    status: "",
    phone: "",
    country: "",
    institution: "",
    university: "",
    thaiIdCard: "",
    passportId: "",
    pharmacyLicenseId: "",
    password: "",
  });

  const fetchMember = useCallback(async () => {
    if (!token || !memberId) return;
    setLoading(true);
    try {
      const data = await api.members.get(token, memberId);
      const m = data.member as unknown as MemberDetail;
      setMember(m);
      setForm({
        email: m.email,
        firstName: m.firstName,
        middleName: m.middleName || "",
        lastName: m.lastName,
        role: m.role,
        status: m.status,
        phone: m.phone || "",
        country: m.country || "",
        institution: m.institution || "",
        university: m.university || "",
        thaiIdCard: m.thaiIdCard || "",
        passportId: m.passportId || "",
        pharmacyLicenseId: m.pharmacyLicenseId || "",
        password: "",
      });
    } catch (error) {
      console.error("Failed to fetch member:", error);
      toast.error("Failed to load member");
    } finally {
      setLoading(false);
    }
  }, [token, memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handleSave = async () => {
    if (!token || !memberId) return;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        email: form.email,
        firstName: form.firstName,
        middleName: form.middleName || null,
        lastName: form.lastName,
        role: form.role,
        status: form.status,
        phone: form.phone || null,
        country: form.country || null,
        institution: form.institution || null,
        university: form.university || null,
        thaiIdCard: form.thaiIdCard || null,
        passportId: form.passportId || null,
        pharmacyLicenseId: form.pharmacyLicenseId || null,
      };

      if (form.password) {
        updateData.password = form.password;
      }

      await api.members.update(token, memberId, updateData);
      toast.success("Member updated successfully");
      setEditing(false);
      setForm((prev) => ({ ...prev, password: "" }));
      fetchMember();
    } catch (error) {
      console.error("Failed to update member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async () => {
    if (!token || !member) return;
    if (member.status !== "active") {
      toast.error("Cannot login as a user whose account is not active");
      return;
    }
    const confirmed = window.confirm(
      `Login as ${member.firstName} ${member.lastName} (${member.email})?\n\nYou will be redirected to the public site and logged in as this user in a new tab.`
    );
    if (!confirmed) return;

    setImpersonating(true);
    try {
      const res = await api.members.impersonate(token, member.id);
      if (!res.success || !res.ssoToken || !res.targetUrl) {
        throw new Error("Failed to generate SSO token");
      }
      const url = `${res.targetUrl.replace(/\/$/, "")}/auth/sso?sso=${encodeURIComponent(
        res.ssoToken
      )}&redirect=${encodeURIComponent("/")}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Opened public site in a new tab");
    } catch (error) {
      console.error("Failed to impersonate user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to login as user");
    } finally {
      setImpersonating(false);
    }
  };

  const openConvertModal = () => {
    if (!member) return;
    // Smart defaults: country=Thailand -> thstd, else interstd
    const isThaiUser = (member.country || "").toLowerCase() === "thailand";
    setConvertTargetRole(isThaiUser ? "thstd" : "interstd");
    const currentRoleLabel = roleLabels[member.role]?.label ?? member.role;
    setConvertReason(
      `Your account was registered as ${currentRoleLabel} but should be a student account. Please upload your student ID card or enrollment certificate so we can verify your student status.`,
    );
    setShowConvertModal(true);
  };

  const handleRequestVerification = async () => {
    if (!token || !member) return;
    if (convertReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    setConverting(true);
    try {
      const res = await api.members.requestVerification(token, member.id, {
        targetRole: convertTargetRole,
        reason: convertReason.trim(),
      });
      if (res.emailSent) {
        toast.success("Account converted. Email sent to user.");
      } else {
        toast.success("Account converted, but email failed to send. Please notify the user manually.");
      }
      setShowConvertModal(false);
      fetchMember();
    } catch (error) {
      console.error("Failed to request verification:", error);
      toast.error(error instanceof Error ? error.message : "Failed to convert account");
    } finally {
      setConverting(false);
    }
  };

  const handleCancel = () => {
    if (!member) return;
    setForm({
      email: member.email,
      firstName: member.firstName,
      middleName: member.middleName || "",
      lastName: member.lastName,
      role: member.role,
      status: member.status,
      phone: member.phone || "",
      country: member.country || "",
      institution: member.institution || "",
      university: member.university || "",
      thaiIdCard: member.thaiIdCard || "",
      passportId: member.passportId || "",
      pharmacyLicenseId: member.pharmacyLicenseId || "",
      password: "",
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Member Detail">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading member...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!member) {
    return (
      <AdminLayout title="Member Detail">
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">Member not found</p>
          <button onClick={() => router.push("/members")} className="btn-primary mt-4">
            Back to Members
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Member Detail">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/members")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IconArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
              {getInitials(member.firstName, member.lastName)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {getFullName(member.firstName, member.middleName, member.lastName)}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${roleLabels[member.role]?.className}`}>
                  {roleLabels[member.role]?.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusLabels[member.status]?.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-green-500" : member.status === "pending_approval" ? "bg-yellow-500" : "bg-red-500"}`}></span>
                  {statusLabels[member.status]?.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={handleCancel} className="btn-secondary flex items-center gap-2" disabled={saving}>
                <IconX size={18} /> Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={saving}>
                <IconDeviceFloppy size={18} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              {/* Convert to Student: only for non-student / non-admin accounts */}
              {(member.role === "thpro" || member.role === "interpro" || member.role === "general") && (
                <button
                  onClick={openConvertModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm font-medium"
                  title="Change account to Student and request student verification document"
                >
                  <IconSchool size={18} />
                  Convert to Student
                </button>
              )}
              {isAdmin && member.status === "active" && (
                <button
                  onClick={handleImpersonate}
                  className="btn-secondary flex items-center gap-2"
                  disabled={impersonating}
                  title="Open the public site logged in as this user (new tab)"
                >
                  {impersonating ? (
                    <IconLoader2 size={18} className="animate-spin" />
                  ) : (
                    <IconLogin2 size={18} />
                  )}
                  {impersonating ? "Opening..." : "Login as User"}
                </button>
              )}
              <button onClick={() => setEditing(true)} className="btn-primary flex items-center gap-2">
                <IconEdit size={18} /> Edit Member
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{member.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Middle Name <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={form.middleName}
                    onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{member.middleName || "-"}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{member.lastName}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconMail size={16} className="text-gray-400" />
                    {member.email}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                    placeholder="e.g. +66812345678"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconPhone size={16} className="text-gray-400" />
                    {member.phone || <span className="text-gray-400">-</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                {editing ? (
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input-field"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${roleLabels[member.role]?.className}`}>
                    {roleLabels[member.role]?.label}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                {editing ? (
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input-field"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusLabels[member.status]?.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-green-500" : member.status === "pending_approval" ? "bg-yellow-500" : "bg-red-500"}`}></span>
                    {statusLabels[member.status]?.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Organization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Institution/University</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconBuilding size={16} className="text-gray-400" />
                    {member.institution || <span className="text-gray-400">-</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconWorld size={16} className="text-gray-400" />
                    {member.country || <span className="text-gray-400">-</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ID & Verification */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">ID & Verification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Thai ID Card</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.thaiIdCard}
                    onChange={(e) => setForm({ ...form, thaiIdCard: e.target.value })}
                    className="input-field"
                    maxLength={13}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconId size={16} className="text-gray-400" />
                    {member.thaiIdCard || <span className="text-gray-400">-</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Passport ID</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.passportId}
                    onChange={(e) => setForm({ ...form, passportId: e.target.value })}
                    className="input-field"
                    maxLength={20}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconId size={16} className="text-gray-400" />
                    {member.passportId || <span className="text-gray-400">-</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Pharmacy License ID</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.pharmacyLicenseId}
                    onChange={(e) => setForm({ ...form, pharmacyLicenseId: e.target.value })}
                    className="input-field"
                    maxLength={20}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <IconCertificate size={16} className="text-gray-400" />
                    {member.pharmacyLicenseId || <span className="text-gray-400">-</span>}
                  </div>
                )}
              </div>
              {member.verificationDocUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Verification Document</label>
                  <a
                    href={member.verificationDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Change Password (edit mode only) */}
          {editing && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  placeholder="Leave blank to keep current password"
                  minLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters. Leave blank to keep the current password.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Meta */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">ID:</span>
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{member.id}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IconCalendar size={14} className="text-gray-400" />
                <span className="text-gray-500">Joined:</span>
                <span className="text-gray-900">
                  {new Date(member.createdAt).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {member.resubmissionCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Resubmissions:</span>
                  <span className="text-gray-900">{member.resubmissionCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Reason */}
          {member.rejectionReason && (
            <div className="card border-red-200 bg-red-50">
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-2">Rejection Reason</h3>
              <p className="text-sm text-red-600">{member.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Convert to Student Modal */}
      {showConvertModal && member && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !converting && setShowConvertModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <IconSchool size={22} className="text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">Convert Account to Student</h2>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Warning */}
              <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <IconAlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">This action will:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Change role to the selected student type</li>
                    <li>Mark account as <strong>rejected</strong> until document is approved</li>
                    <li>Clear any existing verification document</li>
                    <li>Email the user with a link to upload their student document</li>
                  </ul>
                </div>
              </div>

              {/* Member info */}
              <div className="text-sm text-gray-600">
                <span className="text-gray-500">User:</span>{" "}
                <span className="font-medium text-gray-900">
                  {getFullName(member.firstName, member.middleName, member.lastName)}
                </span>{" "}
                <span className="text-gray-400">({member.email})</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="text-gray-500">Current role:</span>{" "}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleLabels[member.role]?.className}`}>
                  {roleLabels[member.role]?.label}
                </span>
              </div>

              {/* Target role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convert to <span className="text-red-500">*</span>
                </label>
                <select
                  value={convertTargetRole}
                  onChange={(e) => setConvertTargetRole(e.target.value as "thstd" | "interstd")}
                  disabled={converting}
                  className="input-field"
                >
                  <option value="thstd">Thai Student (thstd)</option>
                  <option value="interstd">International Student (interstd)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Default suggested based on user&apos;s country. You can override if needed.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason / Note to user <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={convertReason}
                  onChange={(e) => setConvertReason(e.target.value)}
                  disabled={converting}
                  rows={5}
                  maxLength={1000}
                  className="input-field resize-none"
                  placeholder="Explain why the account is being converted..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  {convertReason.length}/1000 characters — included in the email to the user.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestVerification}
                disabled={converting || convertReason.trim().length < 10}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {converting ? (
                  <IconLoader2 size={18} className="animate-spin" />
                ) : (
                  <IconSchool size={18} />
                )}
                {converting ? "Converting..." : "Convert & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

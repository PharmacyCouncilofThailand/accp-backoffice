"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import {
  IconArrowLeft,
  IconDeviceFloppy,
} from "@tabler/icons-react";

const roleOptions = [
  { value: "thstd", label: "Thai Student" },
  { value: "interstd", label: "International Student" },
  { value: "thpro", label: "Thai Professional" },
  { value: "interpro", label: "International Professional" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "rejected", label: "Rejected" },
];

export default function CreateMemberPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "thstd",
    status: "active",
    phone: "",
    country: "",
    institution: "",
    university: "",
    thaiIdCard: "",
    passportId: "",
    pharmacyLicenseId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
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

      const res = await api.members.create(token, data);
      const newMember = res.member as { id: number };
      toast.success("Member created successfully");
      router.push(`/members/${newMember.id}`);
    } catch (error) {
      console.error("Failed to create member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Create Member">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/members")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <IconArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Create New Member</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Account */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Account</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    required
                    placeholder="member@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                    placeholder="e.g. +66812345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Thailand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input-field"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input-field"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Organization</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Institution/University</label>
                  <input
                    type="text"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* ID Documents */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">ID Documents</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Thai ID Card</label>
                  <input
                    type="text"
                    value={form.thaiIdCard}
                    onChange={(e) => setForm({ ...form, thaiIdCard: e.target.value })}
                    className="input-field"
                    maxLength={13}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Passport ID</label>
                  <input
                    type="text"
                    value={form.passportId}
                    onChange={(e) => setForm({ ...form, passportId: e.target.value })}
                    className="input-field"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Pharmacy License ID</label>
                  <input
                    type="text"
                    value={form.pharmacyLicenseId}
                    onChange={(e) => setForm({ ...form, pharmacyLicenseId: e.target.value })}
                    className="input-field"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="card sticky top-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Actions</h3>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <IconDeviceFloppy size={18} />
                {saving ? "Creating..." : "Create Member"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/members")}
                className="btn-secondary w-full mt-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}

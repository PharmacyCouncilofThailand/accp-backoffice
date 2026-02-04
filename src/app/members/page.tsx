"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  IconSearch,
  IconRefresh,
  IconUsers,
  IconUserCheck,
  IconClock,
  IconUserX,
  IconMail,
  IconPhone,
  IconBuilding,
  IconWorld,
} from "@tabler/icons-react";

// Types
interface Member {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "thstd" | "interstd" | "thpro" | "interpro";
  status: "pending_approval" | "active" | "rejected";
  phone: string | null;
  country: string | null;
  institution: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Role labels
const roleLabels: Record<string, { label: string; className: string }> = {
  thstd: { label: "Thai Student", className: "bg-blue-100 text-blue-800" },
  interstd: {
    label: "International Student",
    className: "bg-purple-100 text-purple-800",
  },
  thpro: {
    label: "Thai Professional",
    className: "bg-green-100 text-green-800",
  },
  interpro: {
    label: "International Professional",
    className: "bg-orange-100 text-orange-800",
  },
};

// Status labels
const statusLabels: Record<string, { label: string; className: string }> = {
  pending_approval: {
    label: "Pending",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export default function MembersPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Stats
  const stats = {
    total: pagination?.total || 0,
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending_approval").length,
    rejected: members.filter((m) => m.status === "rejected").length,
  };

  const fetchMembers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "20");
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await api.members.list(token, params.toString());
      setMembers(response.members as unknown as Member[]);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleReset = () => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  return (
    <AdminLayout title="Members">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <IconUsers size={24} stroke={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Members</p>
            </div>
          </div>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <IconUserCheck size={24} stroke={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {stats.active}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
              <IconClock size={24} stroke={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
              <IconUserX size={24} stroke={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Member List</h2>
          <div className="relative flex-1 max-w-md">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field w-auto"
          >
            <option value="">All Roles</option>
            <option value="thstd">Thai Student</option>
            <option value="interstd">International Student</option>
            <option value="thpro">Thai Professional</option>
            <option value="interpro">International Professional</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field w-auto"
          >
            <option value="">All Status</option>
            <option value="pending_approval">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
            title="Reset filters"
          >
            <IconRefresh size={18} />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Loading members...</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Institution
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No members found
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4 text-center">
                          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {member.id}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                              {member.firstName.charAt(0)}
                              {member.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <IconMail size={14} />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <IconPhone size={14} />
                                {member.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${roleLabels[member.role]?.className}`}
                          >
                            {roleLabels[member.role]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusLabels[member.status]?.className}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.status === "active"
                                  ? "bg-green-500"
                                  : member.status === "pending_approval"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            ></span>
                            {statusLabels[member.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {member.institution && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <IconBuilding size={14} />
                                {member.institution}
                              </div>
                            )}
                            {member.country && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <IconWorld size={14} />
                                {member.country}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-gray-600">
                            {new Date(member.createdAt).toLocaleDateString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-500">
                {pagination
                  ? `Showing ${members.length} of ${pagination.total} members`
                  : "Loading..."}
              </p>
              {pagination && pagination.totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(pagination.totalPages, p + 1),
                      )
                    }
                    disabled={currentPage === pagination.totalPages}
                    className="btn-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

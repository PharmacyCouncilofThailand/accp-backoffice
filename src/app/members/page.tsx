"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout";
import { api } from "@/lib/api";
import { getFullName, getInitials } from "@/lib/name";
import { useAuth } from "@/contexts/AuthContext";
import { Pagination } from "@/components/common";
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
  IconTrash,
  IconEye,
  IconEdit,
  IconPlus,
  IconLoader2,
  IconChevronDown,
  IconChevronUp,
  IconTicketOff,
} from "@tabler/icons-react";

// Types
interface Member {
  id: number;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  role: "thstd" | "interstd" | "thpro" | "interpro" | "guest" | "general" | "admin";
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

interface CountryStats {
  total: number;
  withCountry: number;
  unknown: number;
  byCountry: { country: string; count: number }[];
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
  guest: {
    label: "Guest",
    className: "bg-teal-100 text-teal-800",
  },
  general: {
    label: "General",
    className: "bg-gray-100 text-gray-800",
  },
  admin: {
    label: "Admin",
    className: "bg-red-100 text-red-800",
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
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [eventOptions, setEventOptions] = useState<{ id: number; name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [countryFilter, setCountryFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);

  // Country stats
  const [countryStats, setCountryStats] = useState<CountryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCountryChartOpen, setIsCountryChartOpen] = useState(true);

  // Country stats: members WITHOUT primary ticket
  const [noTicketStats, setNoTicketStats] = useState<CountryStats | null>(null);
  const [isLoadingNoTicketStats, setIsLoadingNoTicketStats] = useState(false);
  const [isNoTicketChartOpen, setIsNoTicketChartOpen] = useState(true);

  // Stats (global totals from API)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.members.stats(token);
      const getCount = (status: string) =>
        data.byStatus.find((s: any) => s.status === status)?.count || 0;
      setStats({
        total: data.total,
        active: getCount("active"),
        pending: getCount("pending_approval"),
        rejected: getCount("rejected"),
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch events for filter dropdown
  useEffect(() => {
    if (!token) return;
    api.backofficeEvents.list(token, 'limit=100').then((res) => {
      setEventOptions((res.events as any[]).map((e) => ({ id: e.id as number, name: e.eventName as string })));
    }).catch(() => {});
  }, [token]);

  // Load country stats on mount and when role/status filters change
  const fetchCountryStats = useCallback(async () => {
    if (!token) return;
    setIsLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.members.statsByCountry(token, params.toString());
      setCountryStats(res);
    } catch (error) {
      console.error("Failed to fetch country stats:", error);
      setCountryStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [token, roleFilter, statusFilter]);

  useEffect(() => {
    fetchCountryStats();
  }, [fetchCountryStats]);

  // Load no-primary-ticket stats when an event is selected
  const fetchNoTicketStats = useCallback(async () => {
    if (!token || !eventFilter) {
      setNoTicketStats(null);
      return;
    }
    setIsLoadingNoTicketStats(true);
    try {
      const params = new URLSearchParams();
      params.append("eventId", eventFilter);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.members.statsByCountryNoPrimaryTicket(token, params.toString());
      setNoTicketStats(res);
    } catch (error) {
      console.error("Failed to fetch no-ticket country stats:", error);
      setNoTicketStats(null);
    } finally {
      setIsLoadingNoTicketStats(false);
    }
  }, [token, eventFilter, roleFilter, statusFilter]);

  useEffect(() => {
    fetchNoTicketStats();
  }, [fetchNoTicketStats]);

  const fetchMembers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (eventFilter) params.append("eventId", eventFilter);
      if (countryFilter) params.append("country", countryFilter);

      const response = await api.members.list(token, params.toString());
      setMembers(response.members as unknown as Member[]);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, search, roleFilter, statusFilter, eventFilter, countryFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleReset = () => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setEventFilter("");
    setCountryFilter("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!token || !deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await api.members.delete(token, deleteConfirm.id);
      setDeleteConfirm(null);
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete member:", error);
      alert(error instanceof Error ? error.message : "Failed to delete member");
    } finally {
      setDeletingId(null);
    }
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

      {/* Country Breakdown Widget */}
      <div className="card mb-6">
        <button
          onClick={() => setIsCountryChartOpen(!isCountryChartOpen)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <IconWorld size={18} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Members by Country</h3>
            {countryStats && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {countryStats.byCountry.length} countries
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {countryFilter && (
              <span
                onClick={(e) => { e.stopPropagation(); setCountryFilter(""); setCurrentPage(1); }}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Clear filter
              </span>
            )}
            {countryStats && (
              <span className="text-sm font-semibold text-gray-700 tabular-nums">
                {countryStats.total.toLocaleString()} total
              </span>
            )}
            {isCountryChartOpen ? (
              <IconChevronUp size={18} className="text-gray-400" />
            ) : (
              <IconChevronDown size={18} className="text-gray-400" />
            )}
          </div>
        </button>

        {isCountryChartOpen && (
          <div className="mt-4">
            {isLoadingStats ? (
              <div className="flex justify-center py-6">
                <IconLoader2 size={24} className="animate-spin text-emerald-600" />
              </div>
            ) : !countryStats || countryStats.byCountry.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No country data available.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
                  {countryStats.byCountry.map((c, idx) => {
                    const maxCount = countryStats.byCountry[0]?.count || 1;
                    const barPct = (c.count / maxCount) * 100;
                    const denominator = countryStats.withCountry || 1;
                    const pct = (c.count / denominator) * 100;
                    const isActive = countryFilter === c.country;
                    return (
                      <button
                        key={c.country}
                        onClick={() => {
                          setCountryFilter(isActive ? "" : c.country);
                          setCurrentPage(1);
                        }}
                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all ${
                          isActive
                            ? "bg-blue-50 ring-1 ring-blue-300"
                            : "hover:bg-gray-50"
                        }`}
                        title={`Click to filter by ${c.country}`}
                      >
                        <span className={`w-4 text-[10px] font-semibold text-right shrink-0 ${
                          idx < 3 ? "text-emerald-600" : "text-gray-300"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className={`text-xs font-medium truncate shrink-0 w-28 text-left ${
                            isActive ? "text-blue-700" : "text-gray-700"
                          }`}>
                            {c.country}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isActive
                                  ? "bg-blue-500"
                                  : idx < 3
                                    ? "bg-emerald-500"
                                    : "bg-emerald-300"
                              }`}
                              style={{ width: `${Math.max(barPct, 3)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[11px] tabular-nums text-gray-500 shrink-0 w-16 text-right">
                          <span className={`font-semibold ${isActive ? "text-blue-700" : "text-gray-700"}`}>{c.count}</span>
                          <span className="text-gray-300 ml-0.5">({pct.toFixed(0)}%)</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {countryStats.unknown > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                    + {countryStats.unknown} member{countryStats.unknown > 1 ? "s" : ""} without country info
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Country Chart 2: Members WITHOUT Primary Ticket (only when event is selected) */}
      {eventFilter && (
        <div className="card mb-6">
          <button
            onClick={() => setIsNoTicketChartOpen(!isNoTicketChartOpen)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <IconTicketOff size={18} className="text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Without Primary Ticket by Country</h3>
              <span className="text-xs text-gray-500">
                ({eventOptions.find((e) => String(e.id) === eventFilter)?.name || "selected event"})
              </span>
              {noTicketStats && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {noTicketStats.byCountry.length} countries
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {noTicketStats && (
                <span className="text-sm font-semibold text-amber-700 tabular-nums">
                  {noTicketStats.total.toLocaleString()} pending
                </span>
              )}
              {isNoTicketChartOpen ? (
                <IconChevronUp size={18} className="text-gray-400" />
              ) : (
                <IconChevronDown size={18} className="text-gray-400" />
              )}
            </div>
          </button>

          {isNoTicketChartOpen && (
            <div className="mt-4">
              {isLoadingNoTicketStats ? (
                <div className="flex justify-center py-6">
                  <IconLoader2 size={24} className="animate-spin text-amber-600" />
                </div>
              ) : !noTicketStats || noTicketStats.byCountry.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  All members have purchased a primary ticket for this event 🎉
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
                    {noTicketStats.byCountry.map((c, idx) => {
                      const maxCount = noTicketStats.byCountry[0]?.count || 1;
                      const barPct = (c.count / maxCount) * 100;
                      const denominator = noTicketStats.withCountry || 1;
                      const pct = (c.count / denominator) * 100;
                      const isActive = countryFilter === c.country;
                      return (
                        <button
                          key={c.country}
                          onClick={() => {
                            setCountryFilter(isActive ? "" : c.country);
                            setCurrentPage(1);
                          }}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all ${
                            isActive
                              ? "bg-blue-50 ring-1 ring-blue-300"
                              : "hover:bg-gray-50"
                          }`}
                          title={`Click to filter members by ${c.country}`}
                        >
                          <span className={`w-4 text-[10px] font-semibold text-right shrink-0 ${
                            idx < 3 ? "text-amber-600" : "text-gray-300"
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={`text-xs font-medium truncate shrink-0 w-28 text-left ${
                              isActive ? "text-blue-700" : "text-gray-700"
                            }`}>
                              {c.country}
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isActive
                                    ? "bg-blue-500"
                                    : idx < 3
                                      ? "bg-amber-500"
                                      : "bg-amber-300"
                                }`}
                                style={{ width: `${Math.max(barPct, 3)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[11px] tabular-nums text-gray-500 shrink-0 w-16 text-right">
                            <span className={`font-semibold ${isActive ? "text-blue-700" : "text-gray-700"}`}>{c.count}</span>
                            <span className="text-gray-300 ml-0.5">({pct.toFixed(0)}%)</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {noTicketStats.unknown > 0 && (
                    <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                      + {noTicketStats.unknown} member{noTicketStats.unknown > 1 ? "s" : ""} without country info
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Member List</h2>
          <div className="flex items-center gap-3 flex-1 md:justify-end">
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
            <button
              type="button"
              onClick={() => router.push("/members/create")}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <IconPlus size={18} />
              Add Member
            </button>
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
            <option value="guest">Guest</option>
            <option value="general">General</option>
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

          {eventOptions.length > 1 && (
            <select
              value={eventFilter}
              onChange={(e) => { setEventFilter(e.target.value); setCurrentPage(1); }}
              className="input-field w-auto"
            >
              <option value="">All Events</option>
              {eventOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}

          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1); }}
            disabled={!countryStats || countryStats.byCountry.length === 0}
            className="input-field w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Countries</option>
            {countryStats?.byCountry.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.count})
              </option>
            ))}
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
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
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
                              {getInitials(member.firstName, member.lastName)}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => router.push(`/members/${member.id}`)}
                                className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                              >
                                {getFullName(member.firstName, member.middleName, member.lastName)}
                              </button>
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
                              className={`w-1.5 h-1.5 rounded-full ${member.status === "active"
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
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => router.push(`/members/${member.id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <IconEye size={18} stroke={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/members/${member.id}`)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit member"
                            >
                              <IconEdit size={18} stroke={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(member)}
                              disabled={deletingId === member.id}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete member"
                            >
                              {deletingId === member.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <IconTrash size={18} stroke={1.5} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={pagination?.totalPages || 1}
              totalCount={pagination?.total || 0}
              onPageChange={setCurrentPage}
              itemName="members"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <IconTrash size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Member
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900">
                {getFullName(deleteConfirm.firstName, deleteConfirm.middleName, deleteConfirm.lastName)}
              </span>
              ?
            </p>
            <p className="text-sm text-red-600 mb-6">
              This will permanently remove the member and all related data
              (orders, registrations, abstracts, etc.).
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary"
                disabled={deletingId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingId !== null ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

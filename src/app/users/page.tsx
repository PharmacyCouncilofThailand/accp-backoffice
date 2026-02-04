"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout";
import {
  IconUserPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconCheck,
  IconX,
  IconCalendarEvent,
  IconLoader2,
} from "@tabler/icons-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

// User roles
const roles = [
  {
    id: "admin",
    label: "Admin",
    color: "bg-red-100 text-red-800",
    description: "Full access to all features",
  },
  {
    id: "organizer",
    label: "Organizer",
    color: "bg-blue-100 text-blue-800",
    description: "View dashboard and manage events",
  },
  {
    id: "reviewer",
    label: "Reviewer",
    color: "bg-purple-100 text-purple-800",
    description: "Review and approve abstracts",
  },
  {
    id: "staff",
    label: "Staff",
    color: "bg-green-100 text-green-800",
    description: "Check-in attendees",
  },
  {
    id: "verifier",
    label: "Verifier",
    color: "bg-orange-100 text-orange-800",
    description: "Verify student identity documents",
  },
];

// Abstract categories for reviewer assignment
const abstractCategories = [
  {
    id: "clinical_pharmacy",
    label: "Clinical Pharmacy",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "social_administrative",
    label: "Social & Administrative Pharmacy",
    color: "bg-green-100 text-green-800",
  },
  {
    id: "community_pharmacy",
    label: "Community Pharmacy",
    color: "bg-purple-100 text-purple-800",
  },
  {
    id: "pharmacology_toxicology",
    label: "Pharmacology & Toxicology",
    color: "bg-red-100 text-red-800",
  },
  {
    id: "pharmacy_education",
    label: "Pharmacy Education",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    id: "digital_pharmacy",
    label: "Digital Pharmacy & Innovation",
    color: "bg-indigo-100 text-indigo-800",
  },
];

// Presentation types for reviewer assignment
const presentationTypes = [
  { id: "poster", label: "Poster", color: "bg-cyan-100 text-cyan-800" },
  {
    id: "oral",
    label: "Oral Presentation",
    color: "bg-orange-100 text-orange-800",
  },
];

// Mock data removed

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  assignedEventIds: number[];
  assignedCategories?: string[]; // For reviewers: abstract categories they can review
  assignedPresentationTypes?: string[]; // For reviewers: presentation types they can review
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<any[]>([]); // Using any for events to match API response flexibility
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [eventSearchTerm, setEventSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        // Fetch users
        // Note: api.users.list returns { users: any[] }
        const usersData = await api.users
          .list(token)
          .catch(() => ({ users: [] }));

        // Fetch events - use backoffice endpoint with token
        const eventsData = await api.backofficeEvents
          .list(token)
          .catch(() => ({ events: [], pagination: {} }));

        if (usersData?.users) {
          // Adapt API user to local User interface if needed
          setUsers(
            usersData.users.map((u: any) => ({
              ...u,
              name: u.name || `${u.firstName} ${u.lastName}`.trim(),
              status: u.isActive ? "active" : "inactive",
              assignedEventIds: u.assignedEventIds || [],
              assignedCategories: u.assignedCategories || [],
              assignedPresentationTypes: u.assignedPresentationTypes || [],
            })),
          );
        }

        if (eventsData?.events) {
          setEvents(eventsData.events);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    isActive: true, // Default to true
    assignedEventIds: [] as number[],
    assignedCategories: [] as string[], // For reviewers
    assignedPresentationTypes: [] as string[], // For reviewers
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredEvents = events.filter(
    (e) =>
      (e.eventCode || "")
        .toLowerCase()
        .includes(eventSearchTerm.toLowerCase()) ||
      (e.eventName || "").toLowerCase().includes(eventSearchTerm.toLowerCase()),
  );

  const getRoleInfo = (roleId: string) => {
    return roles.find((r) => r.id === roleId) || roles[0];
  };

  const getEventNames = (eventIds: number[]) => {
    return eventIds
      .map((id) => events.find((e) => e.id === id)?.eventCode)
      .filter(Boolean);
  };

  const handleCreate = async () => {
    if (!token) return;
    try {
      // Split name into first and last name
      const nameParts = formData.name.trim().split(" ");
      const firstName = nameParts[0] || "-";
      const lastName = nameParts.slice(1).join(" ") || "-";

      // 1. Create user with assignedCategories if reviewer
      const result = await api.users.create(token, {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        firstName,
        lastName,
        // Include assignedCategories and assignedPresentationTypes for reviewers
        ...(formData.role === "reviewer" && {
          assignedCategories: formData.assignedCategories,
          assignedPresentationTypes: formData.assignedPresentationTypes,
        }),
      });

      // 2. Assign events if not admin and user was created
      const userId = (result?.user as Record<string, unknown>)?.id as number;
      if (
        userId &&
        formData.role !== "admin" &&
        formData.assignedEventIds.length > 0
      ) {
        await api.users.assignEvents(token, userId, formData.assignedEventIds);
      }

      setShowCreateModal(false);
      setEventSearchTerm("");
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "staff",
        isActive: true,
        assignedEventIds: [],
        assignedCategories: [],
        assignedPresentationTypes: [],
      });
      toast.success("User created successfully!");

      // Refresh list
      const usersData = await api.users
        .list(token)
        .catch(() => ({ users: [] }));
      if (usersData?.users) {
        setUsers(
          usersData.users.map((u: any) => ({
            ...u,
            name: u.name || `${u.firstName} ${u.lastName}`.trim(),
            status: u.isActive ? "active" : "inactive",
            assignedEventIds: u.assignedEventIds || [],
          })),
        );
      }
    } catch (error: any) {
      console.error("Failed to create user:", error);
      toast.error(`Failed to create user: ${error.message || "Unknown error"}`);
    }
  };

  const handleEdit = async () => {
    if (!token || !selectedUser) return;
    try {
      // Prepare update data
      const updates: any = {
        firstName: formData.name.split(" ")[0] || formData.name,
        lastName: formData.name.split(" ").slice(1).join(" ") || "-",
        role: formData.role,
        email: formData.email,
        isActive: formData.isActive,
        // Include assignedCategories and assignedPresentationTypes for reviewers
        ...(formData.role === "reviewer" && {
          assignedCategories: formData.assignedCategories,
          assignedPresentationTypes: formData.assignedPresentationTypes,
        }),
      };
      if (formData.password) {
        updates.password = formData.password;
      }

      // 1. Update user details
      await api.users.update(token, selectedUser.id, updates);

      // 2. Update assignments if not admin
      if (updates.role !== "admin") {
        await api.users.assignEvents(
          token,
          selectedUser.id,
          formData.assignedEventIds,
        );
      }

      setShowEditModal(false);
      setSelectedUser(null);
      toast.success("User updated successfully!");

      // Refresh list
      const usersData = await api.users
        .list(token)
        .catch(() => ({ users: [] }));
      if (usersData?.users) {
        setUsers(
          usersData.users.map((u: any) => ({
            ...u,
            name: u.name || `${u.firstName} ${u.lastName}`.trim(),
            status: u.isActive ? "active" : "inactive",
            assignedEventIds: u.assignedEventIds || [],
          })),
        );
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedUser) return;
    try {
      await api.users.delete(token, selectedUser.id);

      setShowDeleteModal(false);
      setSelectedUser(null);
      toast.success("User deleted successfully!");

      // Refresh list
      setUsers(users.filter((u) => u.id !== selectedUser.id));
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleAssign = async () => {
    if (!token || !selectedUser) return;
    try {
      await api.users.assignEvents(
        token,
        selectedUser.id,
        formData.assignedEventIds,
      );

      setShowAssignModal(false);
      setSelectedUser(null);
      toast.success("Event assignments updated!");

      // Refresh list
      const usersData = await api.users
        .list(token)
        .catch(() => ({ users: [] }));
      if (usersData?.users) {
        setUsers(
          usersData.users.map((u: any) => ({
            ...u,
            name: u.name || `${u.firstName} ${u.lastName}`.trim(),
            status: u.isActive ? "active" : "inactive",
            assignedEventIds: u.assignedEventIds || [],
          })),
        );
      }
    } catch (error) {
      console.error("Failed to assign events:", error);
      toast.error("Failed to assign events");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEventSearchTerm("");
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.status === "active", // Map string status back to boolean
      assignedEventIds: user.assignedEventIds,
      assignedCategories: user.assignedCategories || [],
      assignedPresentationTypes: user.assignedPresentationTypes || [],
    });
    setShowEditModal(true);
  };

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setEventSearchTerm("");
    setFormData({
      ...formData,
      assignedEventIds: [...user.assignedEventIds],
    });
    setShowAssignModal(true);
  };

  const toggleEventAssignment = (eventId: number) => {
    setFormData((prev) => ({
      ...prev,
      assignedEventIds: prev.assignedEventIds.includes(eventId)
        ? prev.assignedEventIds.filter((id) => id !== eventId)
        : [...prev.assignedEventIds, eventId],
    }));
  };

  const toggleCategoryAssignment = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedCategories: prev.assignedCategories.includes(categoryId)
        ? prev.assignedCategories.filter((id) => id !== categoryId)
        : [...prev.assignedCategories, categoryId],
    }));
  };

  const togglePresentationTypeAssignment = (typeId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedPresentationTypes: prev.assignedPresentationTypes.includes(typeId)
        ? prev.assignedPresentationTypes.filter((id) => id !== typeId)
        : [...prev.assignedPresentationTypes, typeId],
    }));
  };

  return (
    <AdminLayout title="User Management">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`card py-4 cursor-pointer hover:shadow-md transition-shadow ${roleFilter === role.id ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setRoleFilter(roleFilter === role.id ? "" : role.id)}
          >
            <p className="text-2xl font-bold text-gray-800">
              {users.filter((u) => u.role === role.id).length}
            </p>
            <p className="text-sm text-gray-500">{role.label}</p>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">All Users</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <IconUserPlus size={18} />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field-search"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <IconLoader2 size={32} className="animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Loading users...</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Assigned Events
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const roleInfo = getRoleInfo(user.role);
                      const eventCodes = getEventNames(user.assignedEventIds);
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-medium text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.name}
                                </p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}
                            >
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {user.role === "admin" ? (
                              <span className="text-xs text-gray-400 italic">
                                All Events Access
                              </span>
                            ) : eventCodes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {eventCodes.map((code) => (
                                  <span
                                    key={code}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No events assigned
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.status === "active"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${user.status === "active"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                  }`}
                              ></span>
                              {user.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex gap-1 justify-center items-center">
                              {user.role !== "admin" && (
                                <button
                                  className="p-2 hover:bg-blue-50 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                  title="Assign Events"
                                  onClick={() => openAssignModal(user)}
                                >
                                  <IconCalendarEvent size={18} />
                                </button>
                              )}
                              <button
                                className="p-2 hover:bg-yellow-50 rounded-lg text-gray-500 hover:text-yellow-600 transition-colors"
                                title="Edit"
                                onClick={() => openEditModal(user)}
                              >
                                <IconPencil size={18} />
                              </button>
                              <button
                                className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                                title="Delete"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <IconTrash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No users found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Role Permissions Info */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Role Permissions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role.color} mb-2`}
              >
                {role.label}
              </span>
              <p className="text-sm text-gray-600">{role.description}</p>
              {role.id === "admin" && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  Access to all events
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                  <IconUserPlus size={20} /> Add New User
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  className="input-field"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value,
                      assignedCategories: [],
                    })
                  }
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Abstract Category Assignment (only for reviewer) */}
              {formData.role === "reviewer" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Abstract Categories *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select which abstract categories this reviewer can review
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {abstractCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded px-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedCategories.includes(
                            category.id,
                          )}
                          onChange={() => toggleCategoryAssignment(category.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.color}`}
                        >
                          {category.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Selected: {formData.assignedCategories.length} category(ies)
                  </p>
                </div>
              )}

              {/* Presentation Type Assignment (only for reviewer) */}
              {formData.role === "reviewer" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Presentation Types *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select which presentation types this reviewer can review
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {presentationTypes.map((type) => (
                      <label
                        key={type.id}
                        className="flex items-center gap-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded px-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedPresentationTypes.includes(
                            type.id,
                          )}
                          onChange={() =>
                            togglePresentationTypeAssignment(type.id)
                          }
                          className="w-4 h-4 text-orange-600 rounded"
                        />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type.color}`}
                        >
                          {type.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Selected: {formData.assignedPresentationTypes.length}{" "}
                    type(s)
                  </p>
                </div>
              )}
              {/* Event Assignment (only for non-admin) */}
              {formData.role !== "admin" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Events *
                  </label>
                  <div className="mb-2 relative">
                    <IconSearch
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search events..."
                      className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      value={eventSearchTerm}
                      onChange={(e) => setEventSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {filteredEvents.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedEventIds.includes(event.id)}
                          onChange={() => toggleEventAssignment(event.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <p className="font-medium text-sm">
                            {event.eventCode}
                          </p>
                          <p className="text-xs text-gray-500">
                            {event.eventName}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center gap-2"
              >
                <IconCheck size={18} /> Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                  <IconPencil size={20} /> Edit User
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  className="input-field"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isActive}
                    onClick={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.isActive ? "bg-green-500" : "bg-gray-200"
                      }`}
                  >
                    <span
                      className={`${formData.isActive ? "translate-x-6" : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                  <span
                    className={`text-sm font-medium ${formData.isActive ? "text-green-600" : "text-gray-500"}`}
                  >
                    {formData.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Abstract Category Assignment (only for reviewer) */}
              {formData.role === "reviewer" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Abstract Categories
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select which abstract categories this reviewer can review
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {abstractCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded px-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedCategories.includes(
                            category.id,
                          )}
                          onChange={() => toggleCategoryAssignment(category.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.color}`}
                        >
                          {category.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Selected: {formData.assignedCategories.length} category(ies)
                  </p>
                </div>
              )}

              {/* Presentation Type Assignment (only for reviewer) */}
              {formData.role === "reviewer" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Presentation Types
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select which presentation types this reviewer can review
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {presentationTypes.map((type) => (
                      <label
                        key={type.id}
                        className="flex items-center gap-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded px-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedPresentationTypes.includes(
                            type.id,
                          )}
                          onChange={() =>
                            togglePresentationTypeAssignment(type.id)
                          }
                          className="w-4 h-4 text-orange-600 rounded"
                        />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type.color}`}
                        >
                          {type.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Selected: {formData.assignedPresentationTypes.length}{" "}
                    type(s)
                  </p>
                </div>
              )}

              {/* Event Assignment (only for non-admin) */}
              {formData.role !== "admin" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Events
                  </label>
                  <div className="mb-2 relative">
                    <IconSearch
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search events..."
                      className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      value={eventSearchTerm}
                      onChange={(e) => setEventSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {filteredEvents.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedEventIds.includes(event.id)}
                          onChange={() => toggleEventAssignment(event.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <p className="font-medium text-sm">
                            {event.eventCode}
                          </p>
                          <p className="text-xs text-gray-500">
                            {event.eventName}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="btn-primary flex items-center gap-2"
              >
                <IconCheck size={18} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Events Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 bg-blue-600 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <IconCalendarEvent size={20} /> Assign Events
              </h3>
              <p className="text-blue-100 text-sm mt-1">{selectedUser.name}</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select which events this user can access:
              </p>
              <div className="mb-3 relative">
                <IconSearch
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  value={eventSearchTerm}
                  onChange={(e) => setEventSearchTerm(e.target.value)}
                />
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {filteredEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedEventIds.includes(event.id)}
                      onChange={() => toggleEventAssignment(event.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{event.eventCode}</p>
                      <p className="text-sm text-gray-500">{event.eventName}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Selected: {formData.assignedEventIds.length} event(s)
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="btn-primary flex items-center gap-2"
              >
                <IconCheck size={18} /> Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 bg-red-600 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <IconTrash size={20} /> Delete User
              </h3>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconTrash size={32} className="text-red-600" />
              </div>
              <p className="mb-2 text-gray-900 font-medium">Are you sure you want to delete this user?</p>
              <p className="font-semibold text-gray-800">{selectedUser.name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

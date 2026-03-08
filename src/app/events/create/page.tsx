"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout";
import { api } from "@/lib/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import {
  IconCalendarEvent,
  IconLayoutGrid,
  IconTicket,
  IconPhoto,
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconPlus,
  IconPencil,
  IconTrash,
  IconX,
  IconMicrophone,
  IconTarget,
  IconLoader2,
  IconClock,
} from "@tabler/icons-react";
import { Images, Upload, X } from "lucide-react";

interface Speaker {
  id: number;
  firstName: string;
  lastName: string;
  organization: string | null;
}

// Step types
type Step = 1 | 2 | 3 | 4;

// Types
interface SessionData {
  id?: number;
  sessionCode: string;
  sessionName: string;
  sessionType:
    | "workshop"
    | "gala_dinner"
    | "lecture"
    | "ceremony"
    | "break"
    | "other";
  description: string;
  room: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isMainSession?: boolean;
  selectedSpeakerIds?: number[];
  agenda?: { time: string; topic: string }[];
}

interface TicketData {
  id?: number;
  name: string;
  category: "primary" | "addon";
  groupName?: string;
  price: string;
  currency: "THB" | "USD";
  originalPrice?: string;
  description?: string;
  features?: string[];
  badgeText?: string;
  quota: string;
  saleStartDate: string;
  saleEndDate: string;
  allowedRoles: string[];
  priority: string;
  isActive?: boolean;
  sessionIds?: number[];
  sessionId?: number;
}

interface EventFormData {
  eventCode: string;
  eventName: string;
  description: string;
  eventType: "single_room" | "multi_session";
  location: string;
  mapUrl: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  conferenceCode: string;
  cpeCredits: string;
  status: "draft" | "published";
  imageUrl: string;
  coverImage: string;
}

// Helper function to format datetime for display
const formatDateTime = (dateTimeStr: string): string => {
  if (!dateTimeStr) return "-";
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    });
  } catch {
    return dateTimeStr;
  }
};

const getBackofficeToken = () =>
  localStorage.getItem("backoffice_token") ||
  sessionStorage.getItem("backoffice_token") ||
  "";

// Helper function to format time only
const formatTime = (dateTimeStr: string): string => {
  if (!dateTimeStr) return "-";
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    });
  } catch {
    return dateTimeStr;
  }
};

export default function CreateEventPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Handle image upload to accp-api via api proxy
  const handleImageUpload = async (file: File, type: "thumbnail" | "cover") => {
    try {
      setIsUploading(true);
      const data = new FormData();
      data.append("file", file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/upload/event-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: data,
      });

      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();

      setFormData((prev) => ({
        ...prev,
        [type === "thumbnail" ? "imageUrl" : "coverImage"]: result.url,
      }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Draft storage key
  const DRAFT_KEY = "event_create_draft";

  // Event form data
  const [formData, setFormData] = useState<EventFormData>({
    eventCode: "",
    eventName: "",
    description: "",
    eventType: "single_room",
    location: "",
    mapUrl: "",
    startDate: "",
    endDate: "",
    maxCapacity: 100,
    conferenceCode: "",
    cpeCredits: "",
    status: "draft",
    imageUrl: "",
    coverImage: "",
  });

  // Sessions and Tickets
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [venueImages, setVenueImages] = useState<{ id?: string, file?: File, previewUrl: string, url?: string, caption?: string }[]>([]);
  const [imageCaption, setImageCaption] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  // Load draft from localStorage on mount
  useEffect(() => {
    // Check if this is a reload vs fresh navigation
    // We use sessionStorage to flag a reload
    const isReload = sessionStorage.getItem("event_create_reload");

    if (!isReload) {
      // Fresh visit: Clear any stale draft
      localStorage.removeItem(DRAFT_KEY);
    } else {
      // Reload: Consume the flag and allow draft to load
      sessionStorage.removeItem("event_create_reload");
    }

    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.formData) setFormData(draft.formData);
        const hasSessions = draft.sessions && draft.sessions.length > 0;
        if (hasSessions) setSessions(draft.sessions);
        if (draft.tickets) setTickets(draft.tickets);
        if (draft.venueImages) setVenueImages(draft.venueImages);
        // Only restore step if we have valid data, otherwise default to 1
        if (draft.currentStep) setCurrentStep(draft.currentStep);

        toast.success("Draft restored from previous session");
      } catch (e) {
        console.error("Draft save error:", e);
      }
    }
    setDraftLoaded(true);

    // Set up beforeunload handler to flag reloads
    const handleBeforeUnload = () => {
      sessionStorage.setItem("event_create_reload", "true");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Save draft to localStorage when state changes
  useEffect(() => {
    if (!draftLoaded) return; // Don't save until initial load is complete
    const draft = { formData, sessions, tickets, currentStep };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [formData, sessions, tickets, currentStep, draftLoaded]);

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        const token = getBackofficeToken();
        const res = await api.speakers.list(token);
        setSpeakers(res.speakers as unknown as Speaker[]);
      } catch (err) {
        console.error("Failed to fetch speakers:", err);
      }
    };
    fetchSpeakers();
  }, []);

  // Session form data
  const [sessionForm, setSessionForm] = useState<SessionData>({
    sessionCode: "",
    sessionName: "",
    sessionType: "other",
    description: "",
    room: "",
    startTime: "",
    endTime: "",
    maxCapacity: 50,
    selectedSpeakerIds: [],
    isMainSession: false,
    agenda: [],
  });

  // Ticket form data
  const [ticketForm, setTicketForm] = useState<TicketData>({
    name: "",
    category: "primary",
    groupName: "",
    price: "",
    currency: "THB",
    originalPrice: "",
    description: "",
    features: [],
    badgeText: "",
    quota: "100",
    saleStartDate: "",
    saleEndDate: "",
    allowedRoles: ["thstd"],
    priority: "regular",
    isActive: true,
    sessionIds: [],
  });
  const [ticketFeatureInput, setTicketFeatureInput] = useState("");

  // Generate a unique event code
  const generateEventCode = () => {
    const prefix = "EVT";
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${prefix}${year}-${randomPart}`;
    setFormData((prev) => ({ ...prev, eventCode: newCode }));
  };

  const steps = [
    { id: 1, icon: IconCalendarEvent, label: "Event Details" },
    { id: 2, icon: IconLayoutGrid, label: "Sessions" },
    { id: 3, icon: IconTicket, label: "Tickets" },
    { id: 4, icon: IconPhoto, label: "Venue/Images" },
  ];

  // Always show sessions step for all event types
  const shouldShowSessions = true;

  // Validate Step 1: Event Details
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.eventCode.trim()) errors.eventCode = "Event Code is required";
    if (!formData.eventName.trim()) errors.eventName = "Event Name is required";
    if (!formData.startDate) errors.startDate = "Start Date is required";
    if (!formData.endDate) errors.endDate = "End Date is required";
    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      errors.endDate = "End Date must be after Start Date";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToStep = (step: Step) => {
    if (step >= 1 && step <= 4) {
      // Only allow going to previous steps or current step
      if (step <= currentStep) {
        setCurrentStep(step);
      }
    }
  };

  // Navigate to next step with validation
  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Auto-create default MAIN session if no sessions exist
      if (sessions.length === 0) {
        const defaultSession: SessionData = {
          id: Date.now(),
          sessionCode: `${formData.eventCode}-MAIN`,
          sessionName: formData.eventName,
          sessionType: "lecture", // Default for main session
          description: formData.description, // Copy event description to learning objectives
          room: formData.location || "",
          startTime: formData.startDate || "",
          endTime: formData.endDate || "",
          maxCapacity: formData.maxCapacity || 100,
          isMainSession: true, // Mark as Main Session
          selectedSpeakerIds: [],
        };
        setSessions([defaultSession]);
        toast.success("Main session created automatically");
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  // Add/Update session
  const handleAddSession = () => {
    if (!sessionForm.sessionCode || !sessionForm.sessionName) return;

    if (editingSessionId) {
      // Update existing session
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSessionId
            ? { ...sessionForm, id: editingSessionId }
            : s,
        ),
      );
      setEditingSessionId(null);
    } else {
      // Add new session
      const newSession: SessionData = {
        ...sessionForm,
        id: Date.now(),
        // If this is the first session, force it to be Main Session if none exists
        isMainSession: sessions.length === 0 || sessionForm.isMainSession,
      };
      setSessions((prev) => [...prev, newSession]);
    }

    setSessionForm({
      sessionCode: "",
      sessionName: "",
      sessionType: "other",
      description: "",
      room: "",
      startTime: "",
      endTime: "",
      maxCapacity: 50,
      selectedSpeakerIds: [],
      isMainSession: false,
      agenda: [],
    });
    setShowSessionModal(false);
  };

  // Edit session
  const handleEditSession = (session: SessionData) => {
    setSessionForm({
      sessionCode: session.sessionCode,
      sessionName: session.sessionName,
      sessionType: (session.sessionType as any) || "other",
      description: session.description || "",
      room: session.room || "",
      startTime: session.startTime,
      endTime: session.endTime,
      maxCapacity: session.maxCapacity,
      selectedSpeakerIds: session.selectedSpeakerIds || [],
      isMainSession: session.isMainSession || false,
      agenda: session.agenda || [],
    });
    setEditingSessionId(session.id!);
    setShowSessionModal(true);
  };

  // Delete session
  const handleDeleteSession = (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  // Add ticket
  const handleAddTicket = () => {
    if (!ticketForm.name || !ticketForm.price) return;
    const quotaNum = parseInt(ticketForm.quota) || 0;
    if (quotaNum < 1) {
      toast.error("Quota must be at least 1");
      return;
    }

    if (editingTicketId) {
      // Update existing ticket
      setTickets((prev) =>
        prev.map((t) =>
          t.id === editingTicketId ? { ...ticketForm, id: editingTicketId } : t,
        ),
      );
      setEditingTicketId(null);
    } else {
      // Add new ticket
      setTickets((prev) => [...prev, { ...ticketForm, id: Date.now() }]);
    }

    setTicketForm({
      name: "",
      category: "primary",
      groupName: "",
      price: "",
      currency: "THB",
      originalPrice: "",
      description: "",
      features: [],
      badgeText: "",
      quota: "100",
      saleStartDate: "",
      saleEndDate: "",
      allowedRoles: ["thstd"],
      priority: "regular",
      isActive: true,
      sessionIds: [],
    });
    setTicketFeatureInput("");
    setShowTicketModal(false);
  };

  // Edit ticket
  const handleEditTicket = (ticket: TicketData) => {
    setTicketForm({
      name: ticket.name,
      category: ticket.category,
      groupName: ticket.groupName || "",
      price: ticket.price,
      currency: ticket.currency,
      originalPrice: ticket.originalPrice || "",
      description: ticket.description || "",
      features: ticket.features || [],
      badgeText: ticket.badgeText || "",
      quota: ticket.quota,
      saleStartDate: ticket.saleStartDate,
      saleEndDate: ticket.saleEndDate,
      allowedRoles: ticket.allowedRoles,
      priority: ticket.priority || "regular",
      isActive: ticket.isActive ?? true,
      sessionIds:
        ticket.sessionIds || (ticket.sessionId ? [ticket.sessionId] : []),
    });
    setEditingTicketId(ticket.id!);
    setShowTicketModal(true);
  };

  // Delete ticket
  const handleDeleteTicket = (id: number) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  // Submit form
  const handleFinish = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const token = getBackofficeToken();

      // Create event
      const eventData = {
        eventCode: formData.eventCode,
        eventName: formData.eventName,
        description: formData.description || undefined,
        eventType: formData.eventType,
        location: formData.location || undefined,
        mapUrl: formData.mapUrl || undefined,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        maxCapacity: formData.maxCapacity,
        conferenceCode: formData.conferenceCode || undefined,
        cpeCredits: formData.cpeCredits || undefined,
        status: formData.status,
        imageUrl: formData.imageUrl || undefined,
        coverImage: formData.coverImage || undefined,
      };

      const { event } = await api.backofficeEvents.create(token, eventData);

      // Create sessions and track ID mapping
      const sessionIdMap = new Map<number, number>(); // local ID -> API ID
      if (sessions.length > 0) {
        for (const session of sessions) {
          // Get speaker names from selected IDs
          const speakerNames = (session.selectedSpeakerIds || [])
            .map((id) => {
              const speaker = speakers.find((s) => s.id === id);
              return speaker ? `${speaker.firstName} ${speaker.lastName}` : "";
            })
            .filter(Boolean);

          const sessionResponse = await api.backofficeEvents.createSession(
            token,
            event.id,
            {
              sessionCode: session.sessionCode,
              sessionName: session.sessionName,
              description: session.description || undefined,
              room: session.room || undefined,
              startTime: new Date(session.startTime).toISOString(),
              endTime: new Date(session.endTime).toISOString(),
              speakers: JSON.stringify(speakerNames),
              maxCapacity: session.maxCapacity,
              isMainSession: session.isMainSession || false,
              sessionType: session.sessionType,
              agenda: session.agenda && session.agenda.length > 0 ? session.agenda : undefined,
            },
          );
          // Map local session ID to API session ID
          if (session.id && sessionResponse.session) {
            sessionIdMap.set(session.id, (sessionResponse.session as any).id);
          }
        }
      }

      // Upload accumulated venue images
      if (venueImages.length > 0) {
        for (const img of venueImages) {
          if (img.file) {
            const formData = new FormData();
            formData.append("file", img.file);

            try {
              // 1. Upload the physical file first
              const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/upload/venue-image`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });
              
              if (!uploadRes.ok) throw new Error("File upload failed");
              const uploadData = await uploadRes.json();
              
              if (uploadData.url) {
                // 2. Link the uploaded URL to the event
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/backoffice/events/${event.id}/images`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    imageUrl: uploadData.url,
                    caption: img.caption || undefined,
                  }),
                });
              }
            } catch (err) {
              console.error("Failed to upload a venue image:", err);
            }
          }
        }
      }

      // Create tickets
      for (const ticket of tickets) {
        // Map local sessionIds to API sessionIds
        let apiSessionIds: number[] = [];

        if (ticket.category === "primary") {
          // Auto-link Primary tickets to ALL Main Sessions
          const mainSessions = sessions.filter((s) => s.isMainSession);
          for (const mainSession of mainSessions) {
            if (mainSession.id) {
              const apiId = sessionIdMap.get(mainSession.id);
              if (apiId) apiSessionIds.push(apiId);
            }
          }
        } else if (
          ticket.category === "addon" &&
          ticket.sessionIds &&
          ticket.sessionIds.length > 0
        ) {
          // Link Add-on tickets to selected sessions
          apiSessionIds = ticket.sessionIds
            .map((localId) => sessionIdMap.get(localId))
            .filter((id) => id !== undefined) as number[];
        } else if (ticket.category === "addon" && ticket.sessionId) {
          // Backward compat for local state if needed
          const mapped = sessionIdMap.get(ticket.sessionId);
          if (mapped) apiSessionIds.push(mapped);
        }

        const ticketPayload: Record<string, unknown> = {
          name: ticket.name,
          category: ticket.category,
          groupName: ticket.groupName || undefined,
          price: ticket.price, // Already a string
          currency: ticket.currency,
          originalPrice: ticket.originalPrice ? Number(ticket.originalPrice) : undefined,
          description: ticket.description || undefined,
          features: ticket.features && ticket.features.length > 0 ? ticket.features : [],
          badgeText: ticket.badgeText || undefined,
          quota: parseInt(ticket.quota) || 0,
          allowedRoles: JSON.stringify(ticket.allowedRoles),
          priority: ticket.priority || "regular",
          isActive: ticket.isActive ?? true,
          sessionIds: apiSessionIds,
        };
        if (ticket.saleStartDate) {
          ticketPayload.saleStartDate = new Date(
            ticket.saleStartDate,
          ).toISOString();
        }
        if (ticket.saleEndDate) {
          ticketPayload.saleEndDate = new Date(
            ticket.saleEndDate,
          ).toISOString();
        }
        await api.backofficeEvents.createTicket(token, event.id, ticketPayload);
      }

      toast.success("Event created successfully!");
      localStorage.removeItem(DRAFT_KEY); // Clear draft on success
      router.push("/events");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create event";
      setError(errorMessage);
      toast.error(errorMessage); // Show toast as well since we might be on Step 4
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Create New Event">
      {/* Back Button */}
      <div className="mb-4">
        <Link
          href="/events"
          className="btn-secondary inline-flex items-center gap-2"
        >
          <IconArrowLeft size={18} /> Back to Events
        </Link>
      </div>

      {/* Step Progress Wizard */}
      <div className="card mb-6">
        <div className="relative py-4">
          {/* Progress Line */}
          <div className="absolute h-1 bg-gray-200 left-[10%] right-[10%] top-[32px] z-0" />
          <div
            className="absolute h-1 bg-green-500 left-[10%] top-[32px] z-[1] transition-all duration-300"
            style={{
              width: shouldShowSessions
                ? `${((currentStep - 1) / 3) * 80}%`
                : `${(([1, 3, 4].indexOf(currentStep) || 0) / 2) * 80}%`,
            }}
          />

          <div className="flex justify-between relative z-[2]">
            {steps
              .filter((step) => shouldShowSessions || step.id !== 2)
              .map((step) => {
                const Icon = step.icon;
                // Calculate if step is completed based on actual step order
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                return (
                  <div
                    key={step.id}
                    className={`text-center flex-1 cursor-pointer`}
                    onClick={() =>
                      step.id <= currentStep && goToStep(step.id as Step)
                    }
                  >
                    <div
                      className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 transition-all
                      ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isCompleted ? (
                        <IconCheck size={24} />
                      ) : (
                        <Icon size={24} stroke={1.5} />
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-blue-600"
                          : isCompleted
                            ? "text-green-600"
                            : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Step 1: Event Details */}
      {currentStep === 1 && (
        <div className="card">
          <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
            <IconCalendarEvent size={20} />
            <h3 className="text-lg font-semibold">Step 1: Event Details</h3>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`input-field flex-1 ${validationErrors.eventCode ? "border-red-500" : ""}`}
                  placeholder="e.g., EVT2026-ABCD"
                  value={formData.eventCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      eventCode: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={generateEventCode}
                  className="btn-secondary whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              {validationErrors.eventCode && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.eventCode}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                className="input-field"
                value={formData.eventType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    eventType: e.target.value as
                      | "single_room"
                      | "multi_session",
                  }))
                }
              >
                <option value="single_room">Single Room</option>
                <option value="multi_session">Multi Session</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              className={`input-field ${validationErrors.eventName ? "border-red-500" : ""}`}
              placeholder="Enter event name"
              value={formData.eventName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, eventName: e.target.value }))
              }
            />
            {validationErrors.eventName && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.eventName}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input-field h-24"
              placeholder="Event description..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <DatePicker
                selected={
                  formData.startDate ? new Date(formData.startDate) : null
                }
                onChange={(date: Date | null) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: date ? date.toISOString() : "",
                  }))
                }
                showTimeSelect
                dateFormat="d MMM yyyy, h:mm aa"
                className={`input-field w-full ${validationErrors.startDate ? "border-red-500" : ""}`}
                placeholderText="Select start date"
                wrapperClassName="w-full"
              />
              {validationErrors.startDate && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.startDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <DatePicker
                selected={formData.endDate ? new Date(formData.endDate) : null}
                onChange={(date: Date | null) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: date ? date.toISOString() : "",
                  }))
                }
                showTimeSelect
                dateFormat="d MMM yyyy, h:mm aa"
                className={`input-field w-full ${validationErrors.endDate ? "border-red-500" : ""}`}
                placeholderText="Select end date"
                wrapperClassName="w-full"
              />
              {validationErrors.endDate && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.endDate}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Bangkok Convention Center"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps Link
              </label>
              <input
                type="url"
                className="input-field"
                placeholder="https://maps.google.com/..."
                value={formData.mapUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mapUrl: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                className="input-field"
                value={formData.maxCapacity || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxCapacity: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conference Code
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., ACCP2026"
                value={formData.conferenceCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    conferenceCode: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPE Credits
              </label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                placeholder="e.g., 6.00"
                value={formData.cpeCredits}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cpeCredits: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="input-field"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as "draft" | "published",
                }))
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <hr className="my-6" />

          <div className="flex justify-end">
            <button
              onClick={goToNextStep}
              className="btn-primary text-lg px-6 py-3 flex items-center gap-2"
            >
              Save & Continue <IconArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Sessions */}
      {currentStep === 2 && (
        <div className="card">
          <div className="bg-purple-600 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
            <IconLayoutGrid size={20} />
            <h3 className="text-lg font-semibold">Step 2: Sessions</h3>
          </div>

          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-4 flex items-center gap-2">
            <IconLayoutGrid size={18} /> Add sessions for your multi-session
            event
          </div>

          {/* Main Session Section */}
          {sessions.filter((s) => s.isMainSession).length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-semibold text-purple-700 mb-3 uppercase tracking-wider">
                Main Session
              </h4>
              <div className="grid gap-4">
                {sessions
                  .filter((s) => s.isMainSession)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="border border-purple-200 bg-purple-50 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-mono">
                            {session.sessionCode}
                          </span>
                          <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold border border-purple-200">
                            {session.sessionType?.replace("_", " ") || "OTHER"}
                          </span>
                          <h5 className="font-semibold text-gray-900">
                            {session.sessionName}
                          </h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {session.description || "No description"}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <IconCheck size={14} /> {session.room || "No Room"}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconCalendarEvent size={14} />{" "}
                            {formatDateTime(session.startTime)} -{" "}
                            {formatTime(session.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconTarget size={14} /> Cap: {session.maxCapacity}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditSession(session)}
                        className="p-2 hover:bg-purple-200 rounded text-purple-700"
                        title="Edit Main Session"
                      >
                        <IconPencil size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sub Sessions Section */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h4 className="text-md font-semibold text-gray-700 uppercase tracking-wider">
                Sub Sessions / Breakouts
              </h4>
              <button
                onClick={() => {
                  setSessionForm({
                    sessionCode: "",
                    sessionName: "",
                    sessionType: "other",
                    description: "",
                    room: "",
                    startTime: "",
                    endTime: "",
                    maxCapacity: 100,
                    selectedSpeakerIds: [],
                  });
                  setEditingSessionId(null);
                  setShowSessionModal(true);
                }}
                className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
              >
                <IconPlus size={16} /> Add Session
              </button>
            </div>

            {sessions.filter((s) => !s.isMainSession).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Session Name</th>
                      <th>Room</th>
                      <th>Time</th>
                      <th>Capacity</th>
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions
                      .filter((s) => !s.isMainSession)
                      .map((session) => (
                        <tr key={session.id}>
                          <td className="font-mono text-sm">
                            {session.sessionCode}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {session.sessionName}
                              </p>
                              <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border border-gray-200">
                                {session.sessionType?.replace("_", " ") ||
                                  "OTHER"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {session.description}
                            </p>
                          </td>
                          <td>{session.room}</td>
                          <td className="text-sm">
                            {formatDateTime(session.startTime)}
                            <br />
                            to {formatTime(session.endTime)}
                          </td>
                          <td>{session.maxCapacity}</td>
                          <td className="flex gap-1">
                            <button
                              onClick={() => handleEditSession(session)}
                              className="p-1.5 hover:bg-blue-100 rounded"
                            >
                              <IconPencil size={18} className="text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id!)}
                              className="p-1.5 hover:bg-red-100 rounded"
                            >
                              <IconTrash size={18} className="text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No sub-sessions added yet.</p>
              </div>
            )}
          </div>

          <hr className="my-6" />

          <div className="flex justify-between">
            <button
              onClick={goToPreviousStep}
              className="btn-secondary flex items-center gap-2"
            >
              <IconArrowLeft size={18} /> Back to Event Details
            </button>
            <button
              onClick={goToNextStep}
              className="btn-primary text-lg px-6 py-3 flex items-center gap-2"
            >
              Continue <IconArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Tickets */}
      {currentStep === 3 && (
        <div className="card">
          <div className="bg-yellow-500 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
            <IconTicket size={20} />
            <h3 className="text-lg font-semibold">Step 3: Tickets</h3>
          </div>

          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-4 flex items-center gap-2">
            <IconTicket size={18} /> Add ticket types for your event (e.g.,
            Early Bird, Member, Public)
          </div>

          <button
            onClick={() => setShowTicketModal(true)}
            className="btn-secondary mb-4 flex items-center gap-2"
          >
            <IconPlus size={18} /> Add Ticket Type
          </button>

          {/* Tickets Table */}
          {tickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Category / Role</th>
                    <th>Price</th>
                    <th>Quota</th>
                    <th>Order</th>
                    <th>Sale Period</th>
                    <th className="w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <p className="font-medium">{ticket.name}</p>
                      </td>
                      <td>
                        <span
                          className={`badge ${ticket.category === "primary" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                        >
                          {ticket.category === "primary" ? "Primary" : "Add-on"}
                        </span>
                        <span className="badge ml-1 bg-gray-100 text-gray-700">
                          {ticket.allowedRoles[0]
                            ?.replace("_", " ")
                            .toUpperCase() || "ALL"}
                        </span>
                        {ticket.category === "primary" && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <IconCheck size={12} /> Includes Main Session
                          </div>
                        )}
                        {ticket.category === "addon" &&
                          ticket.sessionIds &&
                          ticket.sessionIds.length > 0 && (
                            <div className="text-xs text-purple-600 mt-1">
                              {ticket.sessionIds.length === 1 ? (
                                <>
                                  →{" "}
                                  {sessions.find(
                                    (s) => s.id === ticket.sessionIds![0],
                                  )?.sessionName ||
                                    `Session #${ticket.sessionIds![0]}`}
                                </>
                              ) : (
                                <>
                                  → {ticket.sessionIds.length} sessions linked
                                </>
                              )}
                            </div>
                          )}
                      </td>
                      <td className="font-semibold">
                        {ticket.currency === "USD" ? "$" : "฿"}
                        {ticket.price}
                      </td>
                      <td>{ticket.quota}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ticket.priority === 'early_bird' ? 'bg-orange-100 text-orange-800' :
                          ticket.priority === 'regular' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.priority === 'early_bird' ? 'Early Bird' :
                           ticket.priority === 'regular' ? 'Regular' :
                           'Regular'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">
                        {formatDateTime(ticket.saleStartDate)}
                        <br />
                        to {formatDateTime(ticket.saleEndDate)}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditTicket(ticket)}
                            className="p-1.5 hover:bg-blue-100 rounded"
                          >
                            <IconPencil size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket.id!)}
                            className="p-1.5 hover:bg-red-100 rounded"
                          >
                            <IconTrash size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tickets added yet. Click "Add Ticket Type" to create one.
            </div>
          )}

          <hr className="my-6" />

          <div className="flex justify-between">
            <button
              onClick={goToPreviousStep}
              className="btn-secondary flex items-center gap-2"
            >
              <IconArrowLeft size={18} />{" "}
              {shouldShowSessions
                ? "Back to Sessions"
                : "Back to Event Details"}
            </button>
            <button
              onClick={goToNextStep}
              className="btn-primary text-lg px-6 py-3 flex items-center gap-2"
            >
              Continue <IconArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Venue/Images */}
      {currentStep === 4 && (
        <div className="card">
          <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl -m-6 mb-6 flex items-center gap-2">
            <IconPhoto size={20} />
            <h3 className="text-lg font-semibold">Step 4: Venue/Images</h3>
          </div>

          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-6 flex items-center gap-2">
            <IconPhoto size={18} /> Upload display images and venue gallery photos. Venue images will be uploaded when you click Finish.
          </div>

          <div className="space-y-6">
            {/* Section 1: Thumbnail Image */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <h3 className="text-lg font-medium text-gray-900 md:mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <IconPhoto size={18} />
                    </div>
                    Thumbnail Image
                  </h3>
                  <p className="text-sm text-gray-500 hidden md:block">
                    This image is used on event cards and listings on the homepage. 
                    Recommended aspect ratio is 1:1 or 4:3.
                  </p>
                </div>
                <div className="md:w-2/3">
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl relative overflow-hidden group bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    {formData.imageUrl ? (
                      <>
                        <img src={formData.imageUrl} alt="Thumbnail preview" className="max-h-48 object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="cursor-pointer text-white flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full hover:bg-black/70 transition-colors">
                            <IconPlus size={20} />
                            <span>Change Thumbnail</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "thumbnail")} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                          <IconPhoto size={32} className="text-blue-400" />
                        </div>
                        <div className="flex text-sm text-gray-600 justify-center mt-4">
                          <label className="relative cursor-pointer bg-white px-4 py-2 border border-gray-200 rounded-lg font-medium text-blue-600 hover:bg-gray-50 hover:text-blue-500 transition-colors shadow-sm">
                            <span>Select an image file</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "thumbnail")} />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center">
                          <IconLoader2 size={32} className="animate-spin text-blue-600 mb-2" />
                          <span className="text-sm font-medium text-gray-700">Uploading...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Cover Image */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <h3 className="text-lg font-medium text-gray-900 md:mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <IconPhoto size={18} />
                    </div>
                    Cover Image
                  </h3>
                  <p className="text-sm text-gray-500 hidden md:block">
                    This image appears as the large banner at the top of the event detail page. 
                    Recommended aspect ratio is 16:9 for best display.
                  </p>
                </div>
                <div className="md:w-2/3">
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl relative overflow-hidden group bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    {formData.coverImage ? (
                      <>
                        <img src={formData.coverImage} alt="Cover preview" className="max-h-48 object-cover w-full rounded" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="cursor-pointer text-white flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full hover:bg-black/70 transition-colors">
                            <IconPlus size={20} />
                            <span>Change Cover</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "cover")} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                          <IconPhoto size={32} className="text-indigo-400" />
                        </div>
                        <div className="flex text-sm text-gray-600 justify-center mt-4">
                          <label className="relative cursor-pointer bg-white px-4 py-2 border border-gray-200 rounded-lg font-medium text-indigo-600 hover:bg-gray-50 hover:text-indigo-500 transition-colors shadow-sm">
                            <span>Select an image file</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "cover")} />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP up to 10MB</p>
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center">
                          <IconLoader2 size={32} className="animate-spin text-indigo-600 mb-2" />
                          <span className="text-sm font-medium text-gray-700">Uploading...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Venue Gallery */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex flex-col md:flex-row gap-8 mb-6">
                <div className="md:w-1/3">
                  <h3 className="text-lg font-medium text-gray-900 md:mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                      <IconPhoto size={18} />
                    </div>
                    Venue Gallery
                  </h3>
                  <p className="text-sm text-gray-500 hidden md:block mb-4">
                    Add multiple photos to showcase the event venue, parking area, or previous events.
                  </p>
                </div>
                <div className="md:w-2/3">
                  <div className="bg-gray-50 p-5 border border-gray-200 rounded-xl shadow-inner">
                    <h4 className="font-semibold mb-3 text-gray-800 text-sm uppercase tracking-wider">Add Gallery Image</h4>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                      <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Caption (Optional)
                        </label>
                        <input
                          type="text"
                          className="input-field bg-white shadow-sm"
                          placeholder="e.g. Main Conference Hall"
                          value={imageCaption}
                          onChange={(e) => setImageCaption(e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <input
                          type="file"
                          id="venue-image-upload-create"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const previewUrl = URL.createObjectURL(file);
                              setVenueImages((prev) => [
                                ...prev,
                                {
                                  id: Math.random().toString(36).substr(2, 9),
                                  file,
                                  previewUrl,
                                  caption: imageCaption,
                                },
                              ]);
                              setImageCaption("");
                            }
                          }}
                        />
                        <label
                          htmlFor="venue-image-upload-create"
                          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <IconPlus size={18} />
                          Add Image
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  Images to Upload 
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                    {venueImages.length}
                  </span>
                </h4>
                
                {venueImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {venueImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        className="group border border-gray-200 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                      >
                        <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                          <img
                            src={img.previewUrl || img.url}
                            alt={img.caption || `Venue ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                            {img.caption && (
                              <div className="text-white text-sm font-medium truncate drop-shadow-md mb-2">
                                {img.caption}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setVenueImages(prev => prev.filter((_, i) => i !== idx))}
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-sm flex items-center justify-center gap-1 w-full shadow-lg transition-colors border border-red-400"
                            >
                              <IconTrash size={16} /> <span className="font-medium">Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-100 mb-3">
                      <IconPhoto size={28} className="text-green-400" />
                    </div>
                    <h5 className="text-gray-700 font-medium">No gallery images</h5>
                    <p className="text-sm text-gray-500 mt-1">Add images to display them here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="my-6" />

          <div className="flex justify-between">
            <button
              onClick={goToPreviousStep}
              className="btn-secondary flex items-center gap-2"
            >
              <IconArrowLeft size={18} /> Back to Tickets
            </button>
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 size={20} className="animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <IconCheck size={20} /> Finish & Create
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <IconTicket size={20} />{" "}
                  {editingTicketId ? "Edit Ticket" : "Add Ticket Type"}
                </h3>
                <button
                  onClick={() => {
                    setShowTicketModal(false);
                    setEditingTicketId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    className="input-field"
                    value={ticketForm.category}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        category: e.target.value as "primary" | "addon",
                      }))
                    }
                  >
                    <option value="primary">Primary</option>
                    <option value="addon">Add-on</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience *
                  </label>
                  <select
                    className="input-field"
                    value={ticketForm.allowedRoles[0]}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        allowedRoles: [e.target.value],
                      }))
                    }
                  >
                    <option value="thstd">Thai Student</option>
                    <option value="thpro">Thai Professional</option>
                    <option value="interstd">International Student</option>
                    <option value="interpro">International Professional</option>
                    <option value="general">General / บุคคลทั่วไป</option>
                  </select>
                </div>
              </div>

              {/* Primary Ticket - Auto-linked Main Sessions */}
              {ticketForm.category === "primary" &&
                sessions.filter((s) => s.isMainSession).length > 0 && (
                  <div className="mb-4 bg-purple-50 p-3 rounded-md border border-purple-100">
                    <p className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                      <IconCheck size={16} /> Automatically linked to Main
                      Session(s):
                    </p>
                    <div className="space-y-1">
                      {sessions
                        .filter((s) => s.isMainSession)
                        .map((session) => (
                          <div
                            key={session.id}
                            className="text-sm text-purple-600 pl-5"
                          >
                            • {session.sessionName}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Session Selector - Only for Add-on tickets (Checkboxes) */}
              {ticketForm.category === "addon" && sessions.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link to Sessions/Workshops *
                  </label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {sessions
                      .filter((s) => !s.isMainSession)
                      .map((session) => (
                        <label
                          key={session.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={
                              ticketForm.sessionIds?.includes(session.id!) ||
                              false
                            }
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setTicketForm((prev) => {
                                const currentIds = prev.sessionIds || [];
                                if (isChecked) {
                                  return {
                                    ...prev,
                                    sessionIds: [...currentIds, session.id!],
                                  };
                                } else {
                                  return {
                                    ...prev,
                                    sessionIds: currentIds.filter(
                                      (id) => id !== session.id,
                                    ),
                                  };
                                }
                              });
                            }}
                          />
                          <div>
                            <div className="text-sm font-medium">
                              {session.sessionCode}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.sessionName}
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select one or more sessions for this add-on ticket
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quota *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={ticketForm.quota}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        quota: e.target.value,
                      }))
                    }
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ticket Priority
                  </label>
                  <select
                    className="input-field"
                    value={ticketForm.priority}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    <option value="early_bird">Early Bird</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Early Bird - Member"
                  value={ticketForm.name}
                  onChange={(e) =>
                    setTicketForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    className="input-field"
                    value={ticketForm.currency}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        currency: e.target.value as "THB" | "USD",
                      }))
                    }
                  >
                    <option value="THB">THB (฿)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="3500"
                    value={ticketForm.price}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="Show as strikethrough price"
                    value={ticketForm.originalPrice}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        originalPrice: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <select
                    className="input-field"
                    value={ticketForm.groupName}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        groupName: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- None --</option>
                    <option value="workshop">workshop</option>
                    <option value="gala">gala</option>
                    <option value="registration">registration</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={ticketForm.badgeText}
                  onChange={(e) =>
                    setTicketForm((prev) => ({
                      ...prev,
                      badgeText: e.target.value,
                    }))
                  }
                  placeholder='e.g. "Early Bird", "Best Value"'
                  maxLength={50}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={ticketForm.description}
                  onChange={(e) =>
                    setTicketForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional ticket description"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    value={ticketFeatureInput}
                    onChange={(e) => setTicketFeatureInput(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && ticketFeatureInput.trim()) {
                        e.preventDefault();
                        setTicketForm((prev) => ({
                          ...prev,
                          features: [...(prev.features || []), ticketFeatureInput.trim()],
                        }));
                        setTicketFeatureInput("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-sm px-3"
                    onClick={() => {
                      if (ticketFeatureInput.trim()) {
                        setTicketForm((prev) => ({
                          ...prev,
                          features: [...(prev.features || []), ticketFeatureInput.trim()],
                        }));
                        setTicketFeatureInput("");
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
                {(ticketForm.features || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(ticketForm.features || []).map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {f}
                        <button
                          type="button"
                          onClick={() =>
                            setTicketForm((prev) => ({
                              ...prev,
                              features: (prev.features || []).filter((_, idx) => idx !== i),
                            }))
                          }
                          className="text-gray-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Start Date & Time
                  </label>
                  <DatePicker
                    selected={
                      ticketForm.saleStartDate
                        ? new Date(ticketForm.saleStartDate)
                        : null
                    }
                    onChange={(date: Date | null) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        saleStartDate: date ? date.toISOString() : "",
                      }))
                    }
                    showTimeSelect
                    dateFormat="d MMM yyyy, h:mm aa"
                    className="input-field w-full"
                    placeholderText="Select start date"
                    wrapperClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale End Date & Time
                  </label>
                  <DatePicker
                    selected={
                      ticketForm.saleEndDate
                        ? new Date(ticketForm.saleEndDate)
                        : null
                    }
                    onChange={(date: Date | null) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        saleEndDate: date ? date.toISOString() : "",
                      }))
                    }
                    showTimeSelect
                    dateFormat="d MMM yyyy, h:mm aa"
                    className="input-field w-full"
                    placeholderText="Select end date"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setEditingTicketId(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleAddTicket} className="btn-primary">
                {editingTicketId ? "Update Ticket" : "Add Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editingSessionId ? "Edit Session" : "Create Session"}
                </h3>
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    setEditingSessionId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Main Session Checkbox - Logic: Show ONLY if it IS Main, OR if No Main exists */}
              {(sessionForm.isMainSession ||
                !sessions.some(
                  (s) => s.isMainSession && s.id !== editingSessionId,
                )) && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 bg-blue-50/50 border-blue-100/50">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      checked={sessionForm.isMainSession || false}
                      onChange={(e) =>
                        setSessionForm((prev) => ({
                          ...prev,
                          isMainSession: e.target.checked,
                        }))
                      }
                      disabled={sessionForm.isMainSession} // Lock if checked
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Main session
                        {sessionForm.isMainSession && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            Default (Locked)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Main sessions appear prominently and are auto-linked to
                        Primary tickets.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Session Code & Session Name */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Code *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="S-001"
                    value={sessionForm.sessionCode}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        sessionCode: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter session name"
                    value={sessionForm.sessionName}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        sessionName: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Session Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Type *
                </label>
                <select
                  className="input-field"
                  value={sessionForm.sessionType}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      sessionType: e.target.value as any,
                    }))
                  }
                >
                  <option value="workshop">Workshop</option>
                  <option value="gala_dinner">Gala Dinner</option>
                  <option value="lecture">Lecture</option>
                  <option value="ceremony">Ceremony</option>
                  <option value="break">Break</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <DatePicker
                    selected={
                      sessionForm.startTime
                        ? new Date(sessionForm.startTime)
                        : null
                    }
                    onChange={(date: Date | null) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        startTime: date ? date.toISOString() : "",
                      }))
                    }
                    showTimeSelect
                    dateFormat="d MMM yyyy, h:mm aa"
                    className="input-field w-full"
                    placeholderText="Select start time"
                    wrapperClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <DatePicker
                    selected={
                      sessionForm.endTime ? new Date(sessionForm.endTime) : null
                    }
                    onChange={(date: Date | null) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        endTime: date ? date.toISOString() : "",
                      }))
                    }
                    showTimeSelect
                    dateFormat="d MMM yyyy, h:mm aa"
                    className="input-field w-full"
                    placeholderText="Select end time"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>

              {/* Room & Max Capacity */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Meeting Room 1"
                    value={sessionForm.room}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        room: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="100"
                    value={sessionForm.maxCapacity}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        maxCapacity: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set to 0 for unlimited capacity
                  </p>
                </div>
              </div>

              {/* Instructor(s) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IconMicrophone size={16} /> Instructor(s)
                </label>
                <div className="border border-gray-300 rounded-md bg-white">
                  {speakers.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto p-2">
                      {speakers.map((speaker) => (
                        <label
                          key={speaker.id}
                          className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={sessionForm.selectedSpeakerIds?.includes(
                              speaker.id,
                            )}
                            onChange={(e) => {
                              const id = speaker.id;
                              setSessionForm((prev) => ({
                                ...prev,
                                selectedSpeakerIds: e.target.checked
                                  ? [...(prev.selectedSpeakerIds || []), id]
                                  : (prev.selectedSpeakerIds || []).filter(
                                      (sid) => sid !== id,
                                    ),
                              }));
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>
                            {speaker.firstName} {speaker.lastName}
                          </span>
                          {speaker.organization && (
                            <span className="text-xs text-gray-500">
                              ({speaker.organization})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-gray-500">
                      No instructors available
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {sessionForm.selectedSpeakerIds?.length || 0}{" "}
                  Instructor(s)
                </p>
              </div>

              {/* Learning Objectives */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IconTarget size={16} /> Learning Objectives
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Describe the learning objectives for this session..."
                  value={sessionForm.description}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Time & Agenda */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <IconClock size={16} /> Time & Agenda
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add agenda items with time slots (e.g. &quot;1:30 – 2:00 PM&quot; and topic).
                </p>
                {(sessionForm.agenda || []).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 mb-2">
                    <input
                      type="text"
                      className="input-field w-40"
                      placeholder="1:30 – 2:00 PM"
                      value={item.time}
                      onChange={(e) => {
                        const updated = [...(sessionForm.agenda || [])];
                        updated[idx] = { ...updated[idx], time: e.target.value };
                        setSessionForm((prev) => ({ ...prev, agenda: updated }));
                      }}
                    />
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="Topic description"
                      value={item.topic}
                      onChange={(e) => {
                        const updated = [...(sessionForm.agenda || [])];
                        updated[idx] = { ...updated[idx], topic: e.target.value };
                        setSessionForm((prev) => ({ ...prev, agenda: updated }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (sessionForm.agenda || []).filter((_, i) => i !== idx);
                        setSessionForm((prev) => ({ ...prev, agenda: updated }));
                      }}
                      className="text-red-400 hover:text-red-600 mt-2"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSessionForm((prev) => ({
                      ...prev,
                      agenda: [...(prev.agenda || []), { time: "", topic: "" }],
                    }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                >
                  <IconPlus size={14} /> Add agenda item
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSessionModal(false);
                  setEditingSessionId(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleAddSession} className="btn-primary">
                {editingSessionId ? "Update Session" : "Create Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

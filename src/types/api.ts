// API Type Definitions for ACCP Backoffice

// ============================================================================
// User Types
// ============================================================================

export type StaffRole = 'admin' | 'organizer' | 'reviewer' | 'staff' | 'verifier';

export interface AssignedEvent {
    id: number;
    code: string;
    name: string;
}

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    isActive: boolean;
    assignedEvents: AssignedEvent[];
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    token?: string;
    user?: User;
    error?: string;
    code?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventType = 'single_room' | 'multi_session';

export interface Event {
    id: number;
    eventCode: string;
    eventName: string;
    description?: string | null;
    eventType: EventType;
    location?: string | null;
    startDate: string;
    endDate: string;
    maxCapacity: number;
    status: EventStatus;
    imageUrl?: string | null;
    createdAt: string;
    updatedAt: string;
    // Additional optional fields used in edit page
    mapUrl?: string | null;
    venueAddress?: string | null;
    abstractStartDate?: string | null;
    abstractEndDate?: string | null;
    saleStartDate?: string | null;
    saleEndDate?: string | null;
    conferenceCode?: string | null;
    cpeCredits?: string | null;
}

export interface EventCreateInput {
    eventCode: string;
    eventName: string;
    description?: string;
    eventType: EventType;
    location?: string;
    startDate: string;
    endDate: string;
    maxCapacity: number;
    status?: EventStatus;
}

export interface EventUpdateInput extends Partial<EventCreateInput> {}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
    id: number;
    eventId: number;
    sessionCode: string;
    sessionName: string;
    description?: string | null;
    room?: string | null;
    startTime: string;
    endTime: string;
    maxCapacity?: number;
}

// ============================================================================
// Ticket Types
// ============================================================================

export type TicketCategory = 'primary' | 'addon';

export interface Ticket {
    id: number;
    eventId: number;
    name: string;
    category: TicketCategory;
    price: string;
    thaiPrice?: string;
    quota: number;
    soldCount: number;
    isActive: boolean;
}

// ============================================================================
// Registration Types
// ============================================================================

export type RegistrationStatus = 'confirmed' | 'cancelled';

export interface Registration {
    id: number;
    regCode: string;
    eventId: number;
    email: string;
    firstName: string;
    lastName: string;
    status: RegistrationStatus;
    createdAt: string;
    // Additional fields from expanded API responses
    ticketName?: string;
    eventName?: string;
}

// ============================================================================
// Verification Types
// ============================================================================

export type AccountStatus = 'pending_approval' | 'active' | 'rejected';

export interface VerificationRequest {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    institution?: string;
    status: AccountStatus;
    studentDocUrl?: string;
    createdAt: string;
}

// ============================================================================
// Abstract Types
// ============================================================================

export type AbstractCategory =
    | 'clinical_pharmacy'
    | 'social_administrative'
    | 'pharmaceutical_sciences'
    | 'pharmacology_toxicology'
    | 'pharmacy_education'
    | 'digital_pharmacy';

export type PresentationType = 'oral' | 'poster';
export type AbstractStatus = 'pending' | 'accepted' | 'rejected';

export interface Abstract {
    id: number;
    title: string;
    category: AbstractCategory;
    presentationType: PresentationType;
    status: AbstractStatus;
    submittedBy: string;
    createdAt: string;
}

// ============================================================================
// Speaker Types
// ============================================================================

export type SpeakerType = 'keynote' | 'panelist' | 'moderator' | 'guest';

export interface Speaker {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    organization?: string;
    position?: string;
    bio?: string;
    photoUrl?: string;
    speakerType: SpeakerType;
}

// ============================================================================
// Promo Code Types
// ============================================================================

export interface PromoCode {
    id: number;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: string;
    maxUses?: number;
    usedCount: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
}

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
    id: number;
    orderId: number;
    amount: string;
    status: PaymentStatus;
    paymentMethod?: string;
    paidAt?: string;
    createdAt: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: Pagination;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}

export interface EventsResponse {
    events: Event[];
    pagination: Pagination;
}

export interface UsersResponse {
    users: User[];
}

export interface VerificationsResponse {
    pendingUsers: VerificationRequest[];
}

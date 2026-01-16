const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function fetchAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {};

  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers["Content-Type"] = "application/json";
  }

  // Copy existing headers if any
  if (fetchOptions.headers) {
    const existingHeaders = fetchOptions.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// API Functions
export const api = {
  auth: {
    login: (credentials: any) => fetchAPI<{ success: boolean; token: string; user: any; error?: string }>('/backoffice/login', { method: 'POST', body: JSON.stringify(credentials) }),
    me: (token: string) => fetchAPI<{ user: any }>('/backoffice/me', { token }),
  },

  upload: {
    venueImage: (token: string, formData: FormData) => fetchAPI<{ success: boolean; url: string }>('/api/upload/venue-image', { method: 'POST', body: formData as any, token }),
  },


  // Public Events (ReadOnly or Public usage)
  events: {
    list: () => fetchAPI<{ events: any[] }>("/api/events"),
    get: (id: string) => fetchAPI<{ event: any }>(`/api/events/${id}`),
  },

  // Backoffice Resources
  users: {
    list: (token: string, query?: string) => fetchAPI<{ users: any[]; pagination: any }>(`/api/backoffice/users${query ? `?${query}` : ''}`, { token }),
    create: (token: string, data: any) => fetchAPI<{ user: any }>('/api/backoffice/users', { method: 'POST', body: JSON.stringify(data), token }),
    update: (token: string, id: number, data: any) => fetchAPI<{ user: any }>(`/api/backoffice/users/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    delete: (token: string, id: number) => fetchAPI<{ success: boolean }>(`/api/backoffice/users/${id}`, { method: 'DELETE', token }),
    assignEvents: (token: string, id: number, eventIds: number[]) => fetchAPI<{ success: boolean; count: number }>(`/api/backoffice/users/${id}/assignments`, { method: 'POST', body: JSON.stringify({ eventIds }), token }),
  },

  verifications: {
    list: (token: string, query?: string) => fetchAPI<{ verifications: any[] }>(`/api/backoffice/verifications${query ? `?${query}` : ''}`, { token }),
    verify: (token: string, id: number, status: string, reason?: string) => fetchAPI<{ success: boolean }>(`/api/backoffice/verifications/${id}/verify`, { method: 'POST', body: JSON.stringify({ status, reason }), token }),
    approve: (token: string, id: string) => fetchAPI<{ success: boolean; user: any }>(`/api/backoffice/verifications/${id}/approve`, { method: "POST", body: JSON.stringify({}), token }),
    reject: (token: string, id: string, reason: string) => fetchAPI<{ success: boolean; user: any }>(`/api/backoffice/verifications/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }), token }),
  },

  backofficeEvents: {
    list: (token: string, query?: string) => fetchAPI<{ events: any[]; pagination: any }>(`/api/backoffice/events${query ? `?${query}` : ''}`, { token }),
    get: (token: string, id: number) => fetchAPI<{ event: any; sessions: any[]; tickets: any[]; venueImages: any[] }>(`/api/backoffice/events/${id}`, { token }),
    create: (token: string, data: any) => fetchAPI<{ event: any }>('/api/backoffice/events', { method: 'POST', body: JSON.stringify(data), token }),
    update: (token: string, id: number, data: any) => fetchAPI<{ event: any }>(`/api/backoffice/events/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    delete: (token: string, id: number) => fetchAPI<void>(`/api/backoffice/events/${id}`, { method: 'DELETE', token }),

    // Sessions nested routes
    getSessions: (token: string, eventId: number) => fetchAPI<{ sessions: any[] }>(`/api/backoffice/events/${eventId}/sessions`, { token }),
    createSession: (token: string, eventId: number, data: any) => fetchAPI<{ session: any }>(`/api/backoffice/events/${eventId}/sessions`, { method: 'POST', body: JSON.stringify(data), token }),
    updateSession: (token: string, eventId: number, sessionId: number, data: any) => fetchAPI<{ session: any }>(`/api/backoffice/events/${eventId}/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    deleteSession: (token: string, eventId: number, sessionId: number) => fetchAPI<void>(`/api/backoffice/events/${eventId}/sessions/${sessionId}`, { method: 'DELETE', token }),

    // Tickets nested routes
    getTickets: (token: string, eventId: number) => fetchAPI<{ tickets: any[] }>(`/api/backoffice/events/${eventId}/tickets`, { token }),
    createTicket: (token: string, eventId: number, data: any) => fetchAPI<{ ticket: any }>(`/api/backoffice/events/${eventId}/tickets`, { method: 'POST', body: JSON.stringify(data), token }),
    updateTicket: (token: string, eventId: number, ticketId: number, data: any) => fetchAPI<{ ticket: any }>(`/api/backoffice/events/${eventId}/tickets/${ticketId}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    deleteTicket: (token: string, eventId: number, ticketId: number) => fetchAPI<void>(`/api/backoffice/events/${eventId}/tickets/${ticketId}`, { method: 'DELETE', token }),

    // Images nested routes
    addImage: (token: string, eventId: number, data: any) => fetchAPI<{ image: any }>(`/api/backoffice/events/${eventId}/images`, { method: 'POST', body: JSON.stringify(data), token }),
    deleteImage: (token: string, eventId: number, imageId: number) => fetchAPI<void>(`/api/backoffice/events/${eventId}/images/${imageId}`, { method: 'DELETE', token }),
  },

  speakers: {
    list: (token: string, query?: string) => fetchAPI<{ speakers: any[]; eventSpeakers?: any[] }>(`/api/backoffice/speakers${query ? `?${query}` : ''}`, { token }),
    create: (token: string, data: any) => fetchAPI<{ speaker: any }>('/api/backoffice/speakers', { method: 'POST', body: JSON.stringify(data), token }),
    update: (token: string, id: number, data: any) => fetchAPI<{ speaker: any }>(`/api/backoffice/speakers/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    delete: (token: string, id: number) => fetchAPI<void>(`/api/backoffice/speakers/${id}`, { method: 'DELETE', token }),
  },

  registrations: {
    list: (token: string, query?: string) => fetchAPI<{ registrations: any[]; pagination: any }>(`/api/backoffice/registrations${query ? `?${query}` : ''}`, { token }),
    update: (token: string, id: number, data: any) => fetchAPI<{ registration: any }>(`/api/backoffice/registrations/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  },

  abstracts: {
    list: (token: string, query?: string) => fetchAPI<{ abstracts: any[]; pagination: any }>(`/api/backoffice/abstracts${query ? `?${query}` : ''}`, { token }),
    updateStatus: (token: string, id: number, status: string, comment?: string) => fetchAPI<{ abstract: any }>(`/api/backoffice/abstracts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }), token }),
  },

  checkins: {
    list: (token: string, query?: string) => fetchAPI<{ checkins: any[]; pagination: any }>(`/api/backoffice/checkins${query ? `?${query}` : ''}`, { token }),
    create: (token: string, regCode: string) => fetchAPI<{ success: boolean; checkin: any; registration: any }>(`/api/backoffice/checkins`, { method: 'POST', body: JSON.stringify({ regCode }), token }),
  },

  tickets: {
    list: (token: string, query?: string) => fetchAPI<{ tickets: any[]; pagination: any }>(`/api/backoffice/tickets${query ? `?${query}` : ''}`, { token }),
  },

  sessions: {
    list: (token: string, query?: string) => fetchAPI<{ sessions: any[]; pagination: any }>(`/api/backoffice/sessions${query ? `?${query}` : ''}`, { token }),
  },

  payments: {
    list: (token: string) => fetchAPI<{ payments: any[] }>("/api/payments", { token }),
  },

  promoCodes: {
    list: (token: string, query?: string) => fetchAPI<{ promoCodes: any[]; pagination: any }>(`/api/backoffice/promo-codes${query ? `?${query}` : ''}`, { token }),
    get: (token: string, id: number) => fetchAPI<{ promoCode: any }>(`/api/backoffice/promo-codes/${id}`, { token }),
    create: (token: string, data: any) => fetchAPI<{ promoCode: any }>('/api/backoffice/promo-codes', { method: 'POST', body: JSON.stringify(data), token }),
    update: (token: string, id: number, data: any) => fetchAPI<{ promoCode: any }>(`/api/backoffice/promo-codes/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
    delete: (token: string, id: number) => fetchAPI<{ success: boolean }>(`/api/backoffice/promo-codes/${id}`, { method: 'DELETE', token }),
    toggle: (token: string, id: number) => fetchAPI<{ promoCode: any }>(`/api/backoffice/promo-codes/${id}/toggle`, { method: 'PATCH', token }),
  },

  // File Upload
  uploadFile: (token: string, file: File, folder: string = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL;
    return fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(async (res) => {
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    });
  }
};

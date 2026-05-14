/**
 * Frontend API client – replaces all direct Supabase calls.
 * All requests go to /api (proxied to Express server via Vite proxy in dev).
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';
const TOKEN_KEY = 'crm_token';

// ─── Token helpers ─────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// ─── Core fetch wrapper ────────────────────────────────────────────────────────
async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        removeToken();
        window.location.href = '/login';
        throw new Error('Session expirée');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body?.error || `HTTP ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) return undefined as unknown as T;
    return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (email: string, password: string) =>
        request<{ token: string; profile: any }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    me: () => request<{ profile: any }>('/api/auth/me'),
    register: (data: { email: string; password: string; name: string; role?: string }) =>
        request<{ profile: any }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    changePassword: (oldPassword: string, newPassword: string) =>
        request('/api/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ oldPassword, newPassword }),
        }),
};

// ─── Clients ───────────────────────────────────────────────────────────────────
export const clientsApi = {
    list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any[]>(`/api/clients${qs}`);
    },
    get: (id: string) => request<any>(`/api/clients/${id}`),
    create: (data: any) =>
        request<any>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
        request<any>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
        request(`/api/clients/${id}`, { method: 'DELETE' }),
};

// ─── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
    list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any[]>(`/api/payments${qs}`);
    },
    listByClient: (clientId: string) =>
        request<any[]>(`/api/payments/client/${clientId}`),
    employeeStats: () => request<any[]>('/api/payments/stats/employees'),
    create: (data: {
        client_id: string;
        amount: number;
        payment_date?: string;
        method?: string;
    }) =>
        request<any>('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    softDelete: (id: string) =>
        request(`/api/payments/${id}/delete`, { method: 'PATCH' }),
};

// ─── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
    list: () => request<any[]>('/api/documents'),
    listByClient: (clientId: string) =>
        request<any[]>(`/api/documents/client/${clientId}`),
    upload: (formData: FormData) =>
        request<any>('/api/documents/upload', {
            method: 'POST',
            body: formData,
        }),
    delete: (id: string) =>
        request(`/api/documents/${id}`, { method: 'DELETE' }),
};

// ─── Expenses ──────────────────────────────────────────────────────────────────
export const expensesApi = {
    list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any[]>(`/api/expenses${qs}`);
    },
    uploadProof: (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return request<{ file_url: string }>('/api/expenses/upload', {
            method: 'POST',
            body: fd,
        });
    },
    create: (data: {
        amount: number;
        description: string;
        proof_url?: string;
        client_id?: string;
    }) =>
        request<any>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
        request(`/api/expenses/${id}`, { method: 'DELETE' }),
};

// ─── Activities ────────────────────────────────────────────────────────────────
export const activitiesApi = {
    list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any[]>(`/api/activities${qs}`);
    },
    listByClient: (clientId: string) =>
        request<any[]>(`/api/activities/client/${clientId}`),
    create: (data: { client_id?: string; action_type?: string; description: string }) =>
        request<any>('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Profiles ──────────────────────────────────────────────────────────────────
export const profilesApi = {
    list: () => request<any[]>('/api/profiles'),
    get: (id: string) => request<any>(`/api/profiles/${id}`),
    update: (id: string, data: any) =>
        request<any>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
        request(`/api/profiles/${id}`, { method: 'DELETE' }),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
    stats: () => request<any>('/api/dashboard/stats'),
    recentClients: () => request<any[]>('/api/dashboard/recent-clients'),
    paymentsChart: () => request<any[]>('/api/dashboard/payments-chart'),
    servicesChart: () => request<any[]>('/api/dashboard/services-chart'),
    employeesChart: () => request<any[]>('/api/dashboard/employees-chart'),
    statistics: () => request<any>('/api/dashboard/statistics'),
};

// ─── Alerts ────────────────────────────────────────────────────────────────────
export const alertsApi = {
    list: () => request<any[]>('/api/alerts'),
    markDone: (clientId: string, type: 'passport' | 'b3' | 'travel', done = true) =>
        request(`/api/alerts/${clientId}`, {
            method: 'PATCH',
            body: JSON.stringify({ type, done }),
        }),
};

// ─── Convenience namespace ─────────────────────────────────────────────────────
export const api = {
    auth: authApi,
    clients: clientsApi,
    payments: paymentsApi,
    documents: documentsApi,
    expenses: expensesApi,
    activities: activitiesApi,
    profiles: profilesApi,
    dashboard: dashboardApi,
    alerts: alertsApi,
};

export default api;

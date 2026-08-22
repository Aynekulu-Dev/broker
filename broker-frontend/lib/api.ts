const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('broker_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem('broker_token', token);
  else window.localStorage.removeItem('broker_token');
}

export function getStoredUser<T = any>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('broker_user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: unknown) {
  if (typeof window === 'undefined') return;
  if (user) window.localStorage.setItem('broker_user', JSON.stringify(user));
  else window.localStorage.removeItem('broker_user');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body,
      (body as any)?.message || `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export const api = {
  // ---- Auth ----
  // Customer login: a single admin-issued access code, nothing else
  // (matches AuthController#customerLogin — there is no OTP/self-registration
  // flow on the backend; only an admin can onboard a new merchant).
  customerLogin: (accessCode: string) =>
    request<{ accessToken: string; user: any }>('/auth/customer-login', {
      method: 'POST',
      body: JSON.stringify({ accessCode }),
    }),
  adminLogin: (phoneNumber: string, password: string) =>
    request<{ accessToken: string; user: any }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    }),
  // Admin: change own password (must supply the current one).
  changeAdminPassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  // Admin: merchant lost their code, issue a fresh one.
  regenerateAccessCode: (customerId: string) =>
    request<{ accessCode: string; warning: string }>(
      `/auth/customers/${customerId}/regenerate-code`,
      { method: 'POST' },
    ),

  // ---- Users (merchants) ----
  // Admin: onboard a new merchant. Server generates + returns the
  // one-time access code — it is never retrievable again after this.
  createCustomer: (payload: {
    storeName: string;
    ownerName: string;
    phoneNumber: string;
    city?: string;
  }) =>
    request<{ user: any; accessCode: string; warning: string }>(
      '/users/customers',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  listCustomers: () => request<any[]>('/users/customers'),
  getUser: (id: string) => request<any>(`/users/${id}`),

  // ---- Products ----
  getProducts: () => request<any[]>('/products'),
  getProduct: (id: string) => request<any>(`/products/${id}`),
  createProduct: (payload: any) =>
    request<any>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: any) =>
    request<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  toggleStock: (id: string, isInStock: boolean) =>
    request<any>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ isInStock }),
    }),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),

  // ---- Uploads ----
  uploadReceipt: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/uploads/receipt', { method: 'POST', body: form });
  },
  uploadProductPhoto: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/uploads/product', { method: 'POST', body: form });
  },

  // ---- Orders ----
  // paymentReceiptUrl is optional: batch-capacity products (see
  // Product.batchCapacity) reserve a spot on the truck without paying up
  // front — the receipt is only required later via submitPayment, once
  // the truck is full and the admin has requested payment.
  createOrder: (payload: { items: { productId: string; quantity: number }[]; paymentReceiptUrl?: string }) =>
    request<any>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  myOrders: () => request<any[]>('/orders/mine'),
  allOrders: () => request<any[]>('/orders'),
  getOrder: (id: string) => request<any>(`/orders/${id}`),
  approveOrder: (id: string) => request<any>(`/orders/${id}/approve`, { method: 'PATCH' }),
  rejectOrder: (id: string, reason: string) =>
    request<any>(`/orders/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  // Admin: fix an order's items before it's approved
  updateOrder: (id: string, items: { productId: string; quantity: number }[]) =>
    request<any>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ items }) }),
  // Admin: remove a mistaken/duplicate order (blocked once DISPATCHED)
  deleteOrder: (id: string) => request<{ deleted: true }>(`/orders/${id}`, { method: 'DELETE' }),
  // Customer: upload the receipt once an order is AWAITING_PAYMENT
  // (the truck it's riding on is full and the admin has asked riders to pay).
  submitPayment: (orderId: string, paymentReceiptUrl: string) =>
    request<any>(`/orders/${orderId}/submit-payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentReceiptUrl }),
    }),

  // ---- Deliveries ----
  // One vehicle/driver can carry several orders — pass all their ids.
  createDelivery: (payload: {
    orderIds: string[];
    vehiclePlateNumber: string;
    driverName: string;
    driverPhone: string;
  }) => request<any>('/deliveries', { method: 'POST', body: JSON.stringify(payload) }),
  trackDelivery: (orderId: string) => request<any>(`/deliveries/order/${orderId}`),
  // Admin: batch (truck-load consolidation) management.
  listBatches: (status?: string) =>
    request<any[]>(`/deliveries${status ? `?status=${status}` : ''}`),
  // Pre-open a COLLECTING batch for a product ahead of orders coming in,
  // optionally overriding its default capacity for this particular truck.
  startBatch: (productId: string, capacity?: number) =>
    request<any>('/deliveries/batch', { method: 'POST', body: JSON.stringify({ productId, capacity }) }),
  // Truck reached capacity (FULL) — ask every rider to pay now.
  requestPayment: (deliveryId: string) =>
    request<any>(`/deliveries/${deliveryId}/request-payment`, { method: 'PATCH' }),
  // Every rider APPROVED/REJECTED — record driver/vehicle and dispatch.
  dispatchBatch: (
    deliveryId: string,
    payload: { vehiclePlateNumber: string; driverName: string; driverPhone: string },
  ) => request<any>(`/deliveries/${deliveryId}/dispatch`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // ---- Ledgers ----
  myLedger: () => request<{ entries: any[]; currentBalance: string }>('/ledgers/mine'),
  customerLedger: (customerId: string) =>
    request<{ entries: any[]; currentBalance: string }>(`/ledgers/customer/${customerId}`),
  allBalances: () => request<any[]>('/ledgers/balances'),
  // Admin: this merchant's orders that aren't fully paid off yet, so a
  // payment can be allocated to one specific order.
  outstandingOrders: (customerId: string) =>
    request<
      { orderId: string; totalAmount: string; paid: string; remaining: string; status: string; createdAt: string }[]
    >(`/ledgers/customer/${customerId}/outstanding-orders`),
  addCredit: (customerId: string, amount: string, note?: string, orderId?: string) =>
    request<any>('/ledgers/credit', {
      method: 'POST',
      body: JSON.stringify({ customerId, amount, note, orderId }),
    }),
  monthlySales: (year: number, month: number) =>
    request<any[]>(`/ledgers/reports/monthly?year=${year}&month=${month}`),
};

export function fileUrl(path: string) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

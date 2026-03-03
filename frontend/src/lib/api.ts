const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private getHeaders(isJson: boolean = true): HeadersInit {
    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (isJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(!isFormData),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            ...this.getHeaders(!isFormData),
            ...options.headers,
          },
        });
        if (!retryResponse.ok) {
          throw new Error(await retryResponse.text());
        }
        return retryResponse.json();
      }
      // Redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/auth/login";
      }
      throw new Error("Authentication failed");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Login failed");
    }
    const data = await response.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return data;
  }

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/auth/login";
  }

  // Users
  getMe() {
    return this.request("/api/v1/users/me");
  }

  getUsers(skip = 0, limit = 50) {
    return this.request(`/api/v1/users/?skip=${skip}&limit=${limit}`);
  }

  createUser(data: { email: string; password: string; full_name: string; role: string; agency_id?: string }) {
    return this.request("/api/v1/users/", { method: "POST", body: JSON.stringify(data) });
  }

  updateUser(id: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  // Agencies
  getAgencies(skip = 0, limit = 50) {
    return this.request(`/api/v1/agencies/?skip=${skip}&limit=${limit}`);
  }

  createAgency(data: { name: string; email: string; phone?: string; address?: string }) {
    return this.request("/api/v1/agencies/", { method: "POST", body: JSON.stringify(data) });
  }

  // Documents
  getDocuments(skip = 0, limit = 50) {
    return this.request(`/api/v1/documents/?skip=${skip}&limit=${limit}`);
  }

  getDocument(id: string) {
    return this.request(`/api/v1/documents/${id}`);
  }

  uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/api/v1/documents/upload", { method: "POST", body: formData });
  }

  deleteDocument(id: string) {
    return this.request(`/api/v1/documents/${id}`, { method: "DELETE" });
  }

  askQuestion(documentId: string, question: string) {
    return this.request("/api/v1/documents/ask", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId, question }),
    });
  }

  uploadAndAsk(file: File, question: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", question);
    return this.request("/api/v1/documents/upload-and-ask", { method: "POST", body: formData });
  }

  // Comparison
  compareDocuments(documentId1: string, documentId2: string) {
    return this.request("/api/v1/compare/", {
      method: "POST",
      body: JSON.stringify({ document_id_1: documentId1, document_id_2: documentId2 }),
    });
  }

  compareUploadedDocuments(file1: File, file2: File) {
    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    return this.request("/api/v1/compare/upload", { method: "POST", body: formData });
  }

  // Calculator
  calculatePensionGap(data: Record<string, unknown>) {
    return this.request("/api/v1/calculator/pension-gap", { method: "POST", body: JSON.stringify(data) });
  }

  calculateTCM(data: Record<string, unknown>) {
    return this.request("/api/v1/calculator/tcm", { method: "POST", body: JSON.stringify(data) });
  }

  calculateLifeCapital(data: Record<string, unknown>) {
    return this.request("/api/v1/calculator/life-capital", { method: "POST", body: JSON.stringify(data) });
  }

  // Reports
  generateReport(data: { source_type: string; source_data: Record<string, unknown>; client_name?: string; agency_name?: string }) {
    return this.request("/api/v1/reports/generate", { method: "POST", body: JSON.stringify(data) });
  }

  // Admin
  getAuditLogs(skip = 0, limit = 100, action?: string) {
    let url = `/api/v1/admin/logs?skip=${skip}&limit=${limit}`;
    if (action) url += `&action=${action}`;
    return this.request(url);
  }

  getDashboardStats() {
    return this.request("/api/v1/admin/stats");
  }
}

export const api = new ApiClient(API_URL);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: this.getHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_name");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Request failed");
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{
      access_token: string;
      token_type: string;
      user_name: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }),
    });
  }

  async getMe() {
    return this.request<{
      user_id: number;
      email: string;
      full_name: string;
      created_at: string;
    }>("/auth/me");
  }

  // Social Accounts
  async getAccounts() {
    return this.request<SocialAccount[]>("/accounts");
  }

  async connectAccount(platform: string, username: string) {
    return this.request<SocialAccount>("/accounts", {
      method: "POST",
      body: JSON.stringify({ platform, username }),
    });
  }

  async disconnectAccount(accountId: number) {
    return this.request(`/accounts/${accountId}`, {
      method: "DELETE",
    });
  }

  // Analytics
  async getDashboardAnalytics() {
    return this.request<DashboardAnalytics>("/analytics/dashboard");
  }

  async getAccountAnalytics(accountId: number, days: number = 30) {
    return this.request<AnalyticsData[]>(
      `/analytics/${accountId}?days=${days}`
    );
  }

  // Inbox
  async getInbox(filters?: { status?: string; platform?: string; priority_only?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.platform) params.append("platform", filters.platform);
    if (filters?.priority_only) params.append("priority_only", "true");
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<Message[]>(`/inbox${query}`);
  }

  async getInboxSummary() {
    return this.request<InboxSummary>("/inbox/summary");
  }

  async getMessage(messageId: number) {
    return this.request<Message>(`/inbox/${messageId}`);
  }

  async updateMessage(messageId: number, data: { status?: string; is_priority?: boolean }) {
    return this.request<Message>(`/inbox/${messageId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async markAllRead() {
    return this.request("/inbox/mark-all-read", {
      method: "POST",
    });
  }

  // Calendar/Schedule
  async getCalendar(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<CalendarView>(`/calendar${query}`);
  }

  async getScheduledContent(filters?: { status?: string; platform?: string; content_type?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.platform) params.append("platform", filters.platform);
    if (filters?.content_type) params.append("content_type", filters.content_type);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ScheduledContent[]>(`/schedule${query}`);
  }

  async createScheduledContent(data: CreateScheduledContent) {
    return this.request<ScheduledContent>("/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateScheduledContent(scheduleId: number, data: Partial<CreateScheduledContent>) {
    return this.request<ScheduledContent>(`/schedule/${scheduleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteScheduledContent(scheduleId: number) {
    return this.request(`/schedule/${scheduleId}`, {
      method: "DELETE",
    });
  }

  // Demo data
  async generateDemoData() {
    return this.request("/demo/generate-data", {
      method: "POST",
    });
  }
}

// Types
export interface SocialAccount {
  account_id: number;
  user_id: number;
  platform: string;
  username: string;
  profile_picture_url: string | null;
  is_connected: boolean;
  created_at: string;
}

export interface AnalyticsData {
  analytics_id: number;
  account_id: number;
  date: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_views: number;
  engagement_rate: number;
  reach: number;
  impressions: number;
}

export interface AnalyticsSummary {
  platform: string;
  account_username: string;
  total_followers: number;
  follower_growth: number;
  total_engagement: number;
  engagement_rate: number;
  total_reach: number;
  total_impressions: number;
  top_performing_metric: string;
}

export interface DashboardAnalytics {
  total_accounts: number;
  total_followers: number;
  total_engagement: number;
  average_engagement_rate: number;
  accounts: AnalyticsSummary[];
  recent_activity: Record<string, unknown>[];
}

export interface Message {
  message_id: number;
  user_id: number;
  account_id: number;
  platform: string;
  sender_username: string;
  sender_profile_pic: string | null;
  message_content: string;
  status: string;
  is_priority: boolean;
  received_at: string;
  read_at: string | null;
  replied_at: string | null;
}

export interface InboxSummary {
  total_messages: number;
  unread_count: number;
  priority_count: number;
  messages_by_platform: Record<string, number>;
}

export interface CalendarEvent {
  schedule_id: number;
  title: string;
  platform: string;
  content_type: string;
  scheduled_time: string;
  status: string;
  color: string;
}

export interface ScheduledContent {
  schedule_id: number;
  user_id: number;
  account_id: number | null;
  platform: string;
  content_type: string;
  title: string | null;
  caption: string | null;
  media_urls: string | null;
  hashtags: string | null;
  scheduled_time: string;
  status: string;
  published_at: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface CalendarView {
  events: CalendarEvent[];
  upcoming_reminders: ScheduledContent[];
}

export interface CreateScheduledContent {
  account_id?: number;
  platform: string;
  content_type: string;
  title?: string;
  caption?: string;
  media_urls?: string;
  hashtags?: string;
  scheduled_time: string;
}

export const api = new ApiService();
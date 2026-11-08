export interface ChatMessageDto {
  id: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  senderAvatarUrl?: string | null;
  senderRole: string;
  messageType: "TEXT" | "VOICE" | "IMAGE";
  text?: string | null;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  voiceDuration?: number;
  replyToId?: number | null;
  replyToSender?: string | null;
  replyToText?: string | null;
  likesCount: number;
  likedByMe: boolean;
  pinned: boolean;
  pinnedAt?: string | null;
  pinExpiresAt?: string | null;
  createdAt: string;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("notelagbe_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("notelagbe_token", token);
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("notelagbe_token");
    localStorage.removeItem("notelagbe_user");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    cache: "no-store",
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth API
  auth: {
    login: (data: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    googleLogin: (data: any) => request<any>("/auth/google", { method: "POST", body: JSON.stringify(data) }),
    getMe: () => request<any>("/auth/me"),
    updateProfile: (data: { name?: string; phone?: string; address?: string; avatarUrl?: string | null }) =>
      request<any>("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; avatarUrl: string; message: string }>("/auth/avatar/upload", {
        method: "POST",
        body: formData,
      });
    },
    removeAvatar: () => request<{ success: boolean; avatarUrl: string; message: string }>("/auth/avatar", { method: "DELETE" }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<any>("/auth/password", { method: "PUT", body: JSON.stringify(data) }),
    forgotPassword: (email: string) =>
      request<{ success: boolean; exists: boolean; email: string; name?: string; studentId?: string; resetToken?: string; message: string }>(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) }
      ),
    resetPassword: (data: { email: string; resetToken: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Courses API
  courses: {
    getAll: (params?: { query?: string; semester?: number; electiveGroup?: string; department?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.query) searchParams.set("query", params.query);
      if (params?.semester) searchParams.set("semester", params.semester.toString());
      if (params?.electiveGroup) searchParams.set("electiveGroup", params.electiveGroup);
      if (params?.department) searchParams.set("department", params.department);
      const queryString = searchParams.toString();
      return request<any[]>(`/courses${queryString ? `?${queryString}` : ""}`);
    },
    getByCode: (code: string) => request<any>(`/courses/${code}`),
    unlock: (code: string) => request<any>(`/courses/${code}/unlock`, { method: "POST" }),
    getCheatSheet: (code: string) => request<any>(`/courses/${code}/cheatsheet`),
    downloadZip: async (code: string) => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/courses/${code}/download-zip`, {
        headers,
      });
      if (!response.ok) {
        let errorMsg = "Failed to download offline study pack";
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code.toUpperCase()}_Offline_Study_Pack.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  },

  // Teachers API
  teachers: {
    getAll: (params?: { category?: string; query?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set("category", params.category);
      if (params?.query) searchParams.set("query", params.query);
      const queryString = searchParams.toString();
      return request<any[]>(`/teachers${queryString ? `?${queryString}` : ""}`);
    },
    getById: (id: number) => request<any>(`/teachers/${id}`),
    getCourses: (id: number) => request<any[]>(`/teachers/${id}/courses`),
    syncCse: () =>
      request<{
        status: string;
        sourceUrl: string;
        department: string;
        totalOfficialScraped: number;
        updated: number;
        added: number;
        unchanged: number;
        timestamp: string;
      }>("/teachers/sync-cse", { method: "POST" }),
  },

  // Resources API
  resources: {
    getByCourse: (code: string) => request<any[]>(`/resources/course/${code}`),
    getByTeacher: (teacherId: number) => request<any[]>(`/resources/teacher/${teacherId}`),
    getById: (id: number) => request<any>(`/resources/${id}`),
    trackDownload: (id: number) => request<any>(`/resources/${id}/download`, { method: "POST" }),
    checkAvailability: (courseCode: string, teacherId?: number) => {
      const sp = new URLSearchParams();
      sp.set("courseCode", courseCode);
      if (teacherId) sp.set("teacherId", teacherId.toString());
      return request<{
        available: boolean;
        courseId?: number;
        courseCode: string;
        courseTitle: string;
        teacherId?: number;
        teacherName: string;
        notesCount: number;
        questionsCount: number;
        totalCount: number;
        message: string;
      }>(`/resources/check-availability?${sp.toString()}`);
    },
  },

  // Payments API
  payments: {
    submit: (data: any) => request<any>("/payments/submit", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request<any[]>("/payments/my"),
  },

  // Contributions API
  contributions: {
    submit: (data: any) => request<any>("/contributions/submit", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request<any[]>("/contributions/my"),
    verifyLink: (url: string) => request<any>(`/contributions/verify-link?url=${encodeURIComponent(url)}`),
      getLeaderboard: () => request<any[]>('/contributions/leaderboard'),
    uploadFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; url: string; fileName: string; fileSize: string; fileType: string; message: string }>("/contributions/upload", {
        method: "POST",
        body: formData,
      });
    },
  },

  // Waivers API
  waivers: {
    submit: (data: any) => request<any>("/waivers/submit", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request<any[]>("/waivers/my"),
  },

  // Notices & Announcements API
  notices: {
    getActive: () => request<any[]>("/notices"),
  },

  // Reviews API
  reviews: {
    submit: (data: any) => request<any>("/reviews/submit", { method: "POST", body: JSON.stringify(data) }),
    check: (courseCode: string) => request<{ hasReviewed: boolean }>(`/reviews/check?courseCode=${courseCode}`),
    getByCourse: (code: string) => request<any[]>(`/reviews/course/${code}`),
    getByTeacher: (teacherId: number) => request<any[]>(`/reviews/teacher/${teacherId}`),
    getRecent: () => request<any[]>("/reviews/recent"),
  },

  // Plans API
  plans: {
    getAll: () => request<any[]>("/plans"),
  },

  // Admin API
  admin: {
    getStats: () => request<any>("/admin/stats"),
    getAnalytics: () => request<any>("/admin/analytics"),

    // Resource Management
    getResources: () => request<any[]>("/admin/resources"),
    uploadMaterialFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; url: string; fileName: string; fileSize: string; fileType: string; message: string }>("/admin/resources/upload", {
        method: "POST",
        body: formData,
      });
    },
    createResource: (data: any) => request<any>("/admin/resources", { method: "POST", body: JSON.stringify(data) }),
    updateResource: (id: number, data: any) => request<any>(`/admin/resources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteResource: (id: number) => request<any>(`/admin/resources/${id}`, { method: "DELETE" }),

    // Course Management & Assignments
    createCourse: (data: any) =>
      request<any>("/admin/courses", { method: "POST", body: JSON.stringify(data) }),
    updateCourse: (code: string, data: any) =>
      request<any>(`/admin/courses/${code}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCourse: (code: string) =>
      request<any>(`/admin/courses/${code}`, { method: "DELETE" }),
    assignTeacherToCourse: (code: string, teacherId: number) =>
      request<any>(`/admin/courses/${code}/teachers/${teacherId}`, { method: "POST" }),
    removeTeacherFromCourse: (code: string, teacherId: number) =>
      request<any>(`/admin/courses/${code}/teachers/${teacherId}`, { method: "DELETE" }),

    // Faculty Directory Management
    createTeacher: (data: any) =>
      request<any>("/admin/teachers", { method: "POST", body: JSON.stringify(data) }),
    updateTeacher: (id: number, data: any) =>
      request<any>(`/admin/teachers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteTeacher: (id: number) =>
      request<any>(`/admin/teachers/${id}`, { method: "DELETE" }),
    uploadTeacherPhoto: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; url: string; message: string }>("/admin/teachers/upload-photo", {
        method: "POST",
        body: formData,
      });
    },

    // Staff Management
    getStaff: () => request<any[]>("/admin/staff"),
    createStaff: (data: any) => request<any>("/admin/staff", { method: "POST", body: JSON.stringify(data) }),
    updateStaff: (id: number, data: any) => request<any>(`/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    toggleStaffStatus: (id: number) => request<any>(`/admin/staff/${id}/toggle-status`, { method: "PUT" }),
    deleteStaff: (id: number) => request<any>(`/admin/staff/${id}`, { method: "DELETE" }),

    // Payments
    getPayments: (status?: string) => request<any[]>(`/admin/payments${status ? `?status=${status}` : ""}`),
    approvePayment: (id: number, notes?: string) =>
      request<any>(`/admin/payments/${id}/approve`, { method: "POST", body: JSON.stringify({ notes }) }),
    rejectPayment: (id: number, notes?: string) =>
      request<any>(`/admin/payments/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),

    // Contributions
    getContributions: (status?: string) => request<any[]>(`/admin/contributions${status ? `?status=${status}` : ""}`),
    approveContribution: (id: number, data?: { feedback?: string; title?: string; teacherId?: number | null; resourceType?: string; semesterName?: string; courseCode?: string; department?: string } | string) => {
      const body = typeof data === "string" ? { feedback: data } : (data || {});
      return request<any>(`/admin/contributions/${id}/approve`, { method: "POST", body: JSON.stringify(body) });
    },
    rejectContribution: (id: number, feedback?: string) =>
      request<any>(`/admin/contributions/${id}/reject`, { method: "POST", body: JSON.stringify({ feedback }) }),
    deleteContribution: (id: number) =>
      request<any>(`/admin/contributions/${id}`, { method: "DELETE" }),

    // Waivers
    getWaivers: (status?: string) => request<any[]>(`/admin/waivers${status ? `?status=${status}` : ""}`),
    approveWaiver: (id: number, grantedCoursesCount: number, notes?: string) =>
      request<any>(`/admin/waivers/${id}/approve`, { method: "POST", body: JSON.stringify({ grantedCoursesCount, notes }) }),
    rejectWaiver: (id: number, notes?: string) =>
      request<any>(`/admin/waivers/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),

    // Campus Notices & Announcements
    getNotices: () => request<any[]>("/admin/notices"),
    createNotice: (data: any) => request<any>("/admin/notices", { method: "POST", body: JSON.stringify(data) }),
    updateNotice: (id: number, data: any) => request<any>(`/admin/notices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteNotice: (id: number) => request<any>(`/admin/notices/${id}`, { method: "DELETE" }),
    toggleNoticeStatus: (id: number) => request<any>(`/admin/notices/${id}/toggle-status`, { method: "PUT" }),

    // Security & Activity Logs (All Admins)
    getActivityLogs: (params?: { page?: number; size?: number; search?: string; actionType?: string }) => {
      const q = new URLSearchParams();
      if (params?.page !== undefined) q.set("page", params.page.toString());
      if (params?.size !== undefined) q.set("size", params.size.toString());
      if (params?.search) q.set("search", params.search);
      if (params?.actionType && params.actionType !== "ALL") q.set("actionType", params.actionType);
      return request<any>(`/admin/activity-logs?${q.toString()}`);
    },
    clearActivityLogs: () => request<any>("/admin/activity-logs", { method: "DELETE" }),

    // Reviews Moderation
    getReviews: (status?: string) => request<any[]>(status ? `/admin/reviews?status=${status}` : "/admin/reviews"),
    approveReview: (id: number) => request<any>(`/admin/reviews/${id}/approve`, { method: "POST" }),
    rejectReview: (id: number) => request<any>(`/admin/reviews/${id}/reject`, { method: "POST" }),
    deleteReview: (id: number) => request<any>(`/admin/reviews/${id}`, { method: "DELETE" }),

    // Settings & Profile
    getSettings: () => request<{ emailNotificationsEnabled: boolean }>("/admin/settings"),
    toggleEmail: (enabled: boolean) =>
      request<{ success: boolean; emailNotificationsEnabled: boolean }>("/admin/settings/email-toggle", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),
    getProfile: () => request<any>("/admin/profile"),
    updateProfile: (data: { name: string; phone?: string; address?: string; avatarUrl?: string | null }) =>
      request<any>("/admin/profile", { method: "PUT", body: JSON.stringify(data) }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; avatarUrl: string; message: string }>("/admin/avatar/upload", {
        method: "POST",
        body: formData,
      });
    },
    removeAvatar: () => request<{ success: boolean; avatarUrl: string; message: string }>("/admin/avatar", { method: "DELETE" }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<any>("/admin/password", { method: "PUT", body: JSON.stringify(data) }),
    // Live Chat Moderation
    deleteChatMessage: (id: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/messages/${id}`, { method: "DELETE" }),
    pinChatMessage: (id: number) =>
      request<ChatMessageDto>(`/admin/chat/messages/${id}/pin`, { method: "POST" }),
    unpinChatMessage: (id: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/messages/${id}/unpin`, { method: "POST" }),
    blockUserFromChat: (userId: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/users/${userId}/block`, { method: "POST" }),
    unblockUserFromChat: (userId: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/users/${userId}/unblock`, { method: "POST" }),
  },

  // Community Live Chat API
  chat: {
    getMessages: () => request<ChatMessageDto[]>("/chat/messages"),
    getPinned: () => request<ChatMessageDto | null>("/chat/pinned"),
    getActiveCount: () => request<{ activeCount: number; status: string }>("/chat/active-count"),
    sendMessage: (data: { text: string; replyToId?: number; replyToSender?: string; replyToText?: string }) =>
      request<ChatMessageDto>("/chat/messages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sendVoice: (formData: FormData) =>
      request<ChatMessageDto>("/chat/voice", {
        method: "POST",
        body: formData,
      }),
    sendImage: (formData: FormData) =>
      request<ChatMessageDto>("/chat/image", {
        method: "POST",
        body: formData,
      }),
    toggleLike: (id: number) =>
      request<ChatMessageDto>(`/chat/messages/${id}/like`, {
        method: "POST",
      }),
  },

  // Notifications API
  notifications: {
    getMy: () => request<any[]>("/notifications"),
    getUnreadCount: () => request<{ unreadCount: number }>("/notifications/unread-count"),
    markAsRead: (id: number) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: "POST" }),
    markAllAsRead: () => request<{ success: boolean }>("/notifications/read-all", { method: "POST" }),
    delete: (id: number) => request<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" }),
    clearAll: () => request<{ success: boolean }>("/notifications/clear-all", { method: "DELETE" }),
  },

  // Demo API
  demo: {
    getStatus: () => request<any>("/demo/status"),
  },

  // Platform Public Stats & Visitor Tracking
  stats: {
    getPublic: () => request<{ totalViews: number; activeNow: number; status: string }>("/stats/public"),
    recordVisit: () => request<{ totalViews: number; activeNow: number; status: string }>("/stats/visit", { method: "POST" }),
  },
};

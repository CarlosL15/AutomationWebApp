import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

export const platformsApi = {
  getConnections: () => api.get('/platforms/connections'),
  connect: (platform, code) => api.post(`/platforms/connect/${platform}`, { code }),
  disconnect: (platform) => api.delete(`/platforms/disconnect/${platform}`),
  verify: (platform) => api.get(`/platforms/verify/${platform}`)
}

export const publishingApi = {
  getPosts: (params) => api.get('/publishing/posts', { params }),
  createPost: (data) => api.post('/publishing/posts', data),
  updatePost: (id, data) => api.put(`/publishing/posts/${id}`, data),
  deletePost: (id) => api.delete(`/publishing/posts/${id}`),
  getCalendar: (startDate, endDate) => api.get('/publishing/calendar', { params: { start_date: startDate, end_date: endDate } }),
  getOptimalTimes: (platform) => api.get(`/publishing/optimal-times/${platform}`),
  suggestTime: (platform) => api.get(`/publishing/suggest-time/${platform}`),
  getHeatmap: (platform) => api.get(`/publishing/heatmap/${platform}`),
  getDrafts: () => api.get('/publishing/drafts'),
  getQueue: () => api.get('/publishing/queue')
}

export const inboxApi = {
  getMessages: (params) => api.get('/inbox/messages', { params }),
  markAsRead: (ids) => api.post('/inbox/mark-read', { message_ids: ids }),
  reply: (messageId, content) => api.post(`/inbox/reply/${messageId}`, { content }),
  sync: () => api.post('/inbox/sync'),
  getStats: () => api.get('/inbox/statistics')
}

export const analyticsApi = {
  getOverview: (startDate, endDate) => api.get('/analytics/overview', { params: { start_date: startDate, end_date: endDate } }),
  getPlatformAnalytics: (platform, startDate, endDate) => api.get(`/analytics/platform/${platform}`, { params: { start_date: startDate, end_date: endDate } }),
  getPostAnalytics: (postId) => api.get(`/analytics/post/${postId}`),
  getCampaignAnalytics: (campaignId) => api.get(`/analytics/campaign/${campaignId}`),
  getTopPosts: (params) => api.get('/analytics/top-posts', { params }),
  getReport: (params) => api.get('/analytics/report', { params })
}

export const listeningApi = {
  getTopics: () => api.get('/listening/topics'),
  createTopic: (data) => api.post('/listening/topics', data),
  deleteTopic: (id) => api.delete(`/listening/topics/${id}`),
  getResults: (topicId, params) => api.get(`/listening/results/${topicId}`, { params }),
  search: (topicId) => api.post(`/listening/search/${topicId}`),
  getTrends: (topicId) => api.get(`/listening/trends/${topicId}`),
  getSentiment: (topicId, days) => api.get(`/listening/sentiment/${topicId}`, { params: { days } })
}

export const campaignsApi = {
  getCampaigns: () => api.get('/campaigns'),
  getCampaign: (id) => api.get(`/campaigns/${id}`),
  createCampaign: (data) => api.post('/campaigns', data),
  updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/campaigns/${id}`),
  addPost: (campaignId, postId) => api.post(`/campaigns/${campaignId}/posts/${postId}`),
  removePost: (campaignId, postId) => api.delete(`/campaigns/${campaignId}/posts/${postId}`),
  getSummary: (id) => api.get(`/campaigns/${id}/summary`)
}

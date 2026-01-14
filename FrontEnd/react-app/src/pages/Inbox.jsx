import { useState, useEffect } from 'react'
import { inboxApi } from '../services/api'
import { Search, Filter, RefreshCw, Check, Send, MessageSquare, AtSign, Heart, Share2 } from 'lucide-react'
import { format } from 'date-fns'

const messageTypes = [
  { value: '', label: 'All Types' },
  { value: 'comment', label: 'Comments' },
  { value: 'dm', label: 'Direct Messages' },
  { value: 'mention', label: 'Mentions' },
  { value: 'reply', label: 'Replies' }
]

const platforms = [
  { value: '', label: 'All Platforms' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' }
]

const sentiments = [
  { value: '', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' }
]

export default function Inbox() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)
  const [filters, setFilters] = useState({
    platform: '',
    message_type: '',
    sentiment: '',
    is_read: '',
    search: ''
  })

  useEffect(() => {
    fetchMessages()
    fetchStats()
  }, [filters])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.platform) params.platform = filters.platform
      if (filters.message_type) params.message_type = filters.message_type
      if (filters.sentiment) params.sentiment = filters.sentiment
      if (filters.is_read !== '') params.is_read = filters.is_read === 'true'
      if (filters.search) params.search = filters.search

      const response = await inboxApi.getMessages(params)
      setMessages(response.data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await inboxApi.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await inboxApi.sync()
      await fetchMessages()
      await fetchStats()
    } catch (error) {
      console.error('Failed to sync:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleMarkAsRead = async (messageIds) => {
    try {
      await inboxApi.markAsRead(messageIds)
      setMessages(messages.map(m => 
        messageIds.includes(m.id) ? { ...m, is_read: true } : m
      ))
      await fetchStats()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return
    
    setReplying(true)
    try {
      await inboxApi.reply(selectedMessage.id, replyContent)
      setReplyContent('')
      await handleMarkAsRead([selectedMessage.id])
    } catch (error) {
      console.error('Failed to send reply:', error)
    } finally {
      setReplying(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'comment': return MessageSquare
      case 'mention': return AtSign
      case 'dm': return Send
      case 'reply': return Share2
      default: return MessageSquare
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
          <p className="text-gray-600 mt-1">Manage all your messages in one place</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Messages'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card py-4">
            <p className="text-sm text-gray-600">Total Messages</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_messages || 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-sm text-gray-600">Unread</p>
            <p className="text-2xl font-bold text-primary-600">{stats.unread_count || 0}</p>
          </div>
          <div className="card py-4">
            <p className="text-sm text-gray-600">Response Rate</p>
            <p className="text-2xl font-bold text-green-600">{stats.response_rate?.toFixed(0) || 0}%</p>
          </div>
          <div className="card py-4">
            <p className="text-sm text-gray-600">Positive Sentiment</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.sentiment_breakdown?.positive || 0}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search messages..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="input-field w-auto"
          >
            {platforms.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filters.message_type}
            onChange={(e) => setFilters({ ...filters, message_type: e.target.value })}
            className="input-field w-auto"
          >
            {messageTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filters.sentiment}
            onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
            className="input-field w-auto"
          >
            {sentiments.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filters.is_read}
            onChange={(e) => setFilters({ ...filters, is_read: e.target.value })}
            className="input-field w-auto"
          >
            <option value="">All Status</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : messages.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {messages.map(message => {
                const TypeIcon = getTypeIcon(message.message_type)
                return (
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message)
                      if (!message.is_read) {
                        handleMarkAsRead([message.id])
                      }
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id
                        ? 'border-primary-500 bg-primary-50'
                        : message.is_read
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-primary-200 bg-primary-50/50 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getSentimentColor(message.sentiment)}`}>
                        <TypeIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{message.author_name || 'Unknown'}</span>
                          <span className={`platform-badge ${message.platform}`}>{message.platform}</span>
                          {!message.is_read && (
                            <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{message.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(message.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedMessage && (
              <div className="card bg-gray-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${getSentimentColor(selectedMessage.sentiment)}`}>
                    {(() => {
                      const Icon = getTypeIcon(selectedMessage.message_type)
                      return <Icon size={20} />
                    })()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedMessage.author_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(selectedMessage.created_at), 'MMMM d, yyyy at h:mm a')}
                    </p>
                  </div>
                  <span className={`platform-badge ${selectedMessage.platform} ml-auto`}>
                    {selectedMessage.platform}
                  </span>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>

                {selectedMessage.sentiment && (
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getSentimentColor(selectedMessage.sentiment)}`}>
                      Sentiment: {selectedMessage.sentiment}
                    </span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Reply</p>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="input-field resize-none mb-3"
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim() || replying}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Send size={18} />
                    {replying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No messages found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or sync to get new messages</p>
          </div>
        )}
      </div>
    </div>
  )
}

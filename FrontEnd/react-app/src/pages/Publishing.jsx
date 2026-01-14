import { useState, useEffect } from 'react'
import { publishingApi, platformsApi } from '../services/api'
import { Calendar, Clock, Plus, Edit2, Trash2, Lightbulb, Send, Save, X } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'

const platforms = ['tiktok', 'instagram', 'youtube', 'facebook']

export default function Publishing() {
  const [posts, setPosts] = useState([])
  const [queue, setQueue] = useState([])
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [optimalTime, setOptimalTime] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [activeTab, setActiveTab] = useState('queue')
  const [formData, setFormData] = useState({
    platform: '',
    content: '',
    scheduled_time: '',
    media_urls: '',
    status: 'scheduled'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [queueRes, draftsRes, connectionsRes] = await Promise.all([
        publishingApi.getQueue().catch(() => ({ data: [] })),
        publishingApi.getDrafts().catch(() => ({ data: [] })),
        platformsApi.getConnections().catch(() => ({ data: [] }))
      ])
      setQueue(queueRes.data || [])
      setDrafts(draftsRes.data || [])
      setConnections(connectionsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOptimalTime = async (platform) => {
    if (!platform) return
    try {
      const [timeRes, heatmapRes] = await Promise.all([
        publishingApi.suggestTime(platform),
        publishingApi.getHeatmap(platform)
      ])
      setOptimalTime(timeRes.data)
      setHeatmap(heatmapRes.data)
    } catch (error) {
      console.error('Failed to fetch optimal time:', error)
    }
  }

  const handlePlatformChange = (platform) => {
    setFormData({ ...formData, platform })
    fetchOptimalTime(platform)
  }

  const handleUseOptimalTime = () => {
    if (optimalTime?.suggested_time) {
      const date = new Date(optimalTime.suggested_time)
      const localDateTime = format(date, "yyyy-MM-dd'T'HH:mm")
      setFormData({ ...formData, scheduled_time: localDateTime })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        media_urls: formData.media_urls ? formData.media_urls.split(',').map(u => u.trim()) : []
      }
      
      if (editingPost) {
        await publishingApi.updatePost(editingPost.id, data)
      } else {
        await publishingApi.createPost(data)
      }
      
      setShowModal(false)
      setEditingPost(null)
      setFormData({ platform: '', content: '', scheduled_time: '', media_urls: '', status: 'scheduled' })
      setOptimalTime(null)
      setHeatmap(null)
      await fetchData()
    } catch (error) {
      console.error('Failed to save post:', error)
    }
  }

  const handleEdit = (post) => {
    setEditingPost(post)
    setFormData({
      platform: post.platform,
      content: post.content,
      scheduled_time: format(new Date(post.scheduled_time), "yyyy-MM-dd'T'HH:mm"),
      media_urls: post.media_urls?.join(', ') || '',
      status: post.status
    })
    fetchOptimalTime(post.platform)
    setShowModal(true)
  }

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      await publishingApi.deletePost(postId)
      await fetchData()
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const connectedPlatforms = connections.filter(c => c.is_active).map(c => c.platform)

  const HeatmapGrid = () => {
    if (!heatmap) return null
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex">
            <div className="w-12"></div>
            {hours.filter((_, i) => i % 3 === 0).map(h => (
              <div key={h} className="flex-1 text-xs text-gray-500 text-center">
                {h}:00
              </div>
            ))}
          </div>
          {days.map((day, dayIndex) => (
            <div key={day} className="flex items-center">
              <div className="w-12 text-xs text-gray-500">{day}</div>
              <div className="flex-1 flex">
                {hours.map(hour => {
                  const score = heatmap[dayIndex]?.[hour] || 0
                  const intensity = Math.min(score / 100, 1)
                  return (
                    <div
                      key={hour}
                      className="flex-1 h-6 border border-white"
                      style={{
                        backgroundColor: `rgba(14, 165, 233, ${intensity})`
                      }}
                      title={`${day} ${hour}:00 - Score: ${score.toFixed(1)}`}
                    ></div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Darker = Higher engagement potential</p>
      </div>
    )
  }

  const PostCard = ({ post }) => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <span className={`platform-badge ${post.platform}`}>{post.platform}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(post)} className="text-gray-500 hover:text-gray-700">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(post.id)} className="text-gray-500 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-800 mb-2 line-clamp-2">{post.content}</p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock size={14} />
        <span>{format(new Date(post.scheduled_time), 'MMM d, yyyy h:mm a')}</span>
      </div>
      {post.optimal_time_suggested && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary-600">
          <Lightbulb size={14} />
          <span>AI-optimized time</span>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publishing</h1>
          <p className="text-gray-600 mt-1">Schedule and manage your posts</p>
        </div>
        <button
          onClick={() => {
            setEditingPost(null)
            setFormData({ platform: '', content: '', scheduled_time: '', media_urls: '', status: 'scheduled' })
            setOptimalTime(null)
            setHeatmap(null)
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create Post
        </button>
      </div>

      <div className="flex gap-4 border-b">
        {['queue', 'drafts'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'queue' ? `Scheduled (${queue.length})` : `Drafts (${drafts.length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'queue' ? queue : drafts).map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {(activeTab === 'queue' ? queue : drafts).length === 0 && (
          <div className="col-span-full text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              {activeTab === 'queue' ? 'No scheduled posts' : 'No drafts'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">Select platform</option>
                  {connectedPlatforms.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                {connectedPlatforms.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">No platforms connected. Please connect a platform first.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Write your post content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    required={formData.status === 'scheduled'}
                    className="input-field flex-1"
                  />
                  {optimalTime && (
                    <button
                      type="button"
                      onClick={handleUseOptimalTime}
                      className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                    >
                      <Lightbulb size={18} />
                      Use AI Time
                    </button>
                  )}
                </div>
                {optimalTime && (
                  <p className="text-sm text-primary-600 mt-1">
                    AI suggests: {format(new Date(optimalTime.suggested_time), 'MMM d, h:mm a')}
                    {optimalTime.reason && ` - ${optimalTime.reason}`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Media URLs (comma-separated)</label>
                <input
                  type="text"
                  value={formData.media_urls}
                  onChange={(e) => setFormData({ ...formData, media_urls: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {heatmap && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Heatmap</label>
                  <HeatmapGrid />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  {formData.status === 'draft' ? <Save size={18} /> : <Send size={18} />}
                  {editingPost ? 'Update' : formData.status === 'draft' ? 'Save Draft' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

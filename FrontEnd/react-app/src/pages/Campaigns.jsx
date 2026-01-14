import { useState, useEffect } from 'react'
import { campaignsApi, analyticsApi } from '../services/api'
import { FolderKanban, Plus, Edit2, Trash2, Calendar, BarChart3, X, Play, Pause, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

const statusColors = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700'
}

const statusIcons = {
  active: Play,
  paused: Pause,
  completed: CheckCircle
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [summary, setSummary] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active'
  })

  useEffect(() => {
    fetchCampaigns()
  }, [])

  useEffect(() => {
    if (selectedCampaign) {
      fetchSummary(selectedCampaign.id)
    }
  }, [selectedCampaign])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const response = await campaignsApi.getCampaigns()
      setCampaigns(response.data || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async (campaignId) => {
    try {
      const response = await campaignsApi.getSummary(campaignId)
      setSummary(response.data)
    } catch (error) {
      console.error('Failed to fetch summary:', error)
      setSummary(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCampaign) {
        await campaignsApi.updateCampaign(editingCampaign.id, formData)
      } else {
        await campaignsApi.createCampaign(formData)
      }
      setShowModal(false)
      setEditingCampaign(null)
      setFormData({ name: '', description: '', start_date: '', end_date: '', status: 'active' })
      await fetchCampaigns()
    } catch (error) {
      console.error('Failed to save campaign:', error)
    }
  }

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      start_date: campaign.start_date ? format(new Date(campaign.start_date), 'yyyy-MM-dd') : '',
      end_date: campaign.end_date ? format(new Date(campaign.end_date), 'yyyy-MM-dd') : '',
      status: campaign.status
    })
    setShowModal(true)
  }

  const handleDelete = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      await campaignsApi.deleteCampaign(campaignId)
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null)
        setSummary(null)
      }
      await fetchCampaigns()
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    }
  }

  const handleStatusChange = async (campaign, newStatus) => {
    try {
      await campaignsApi.updateCampaign(campaign.id, { ...campaign, status: newStatus })
      await fetchCampaigns()
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign({ ...selectedCampaign, status: newStatus })
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Organize and track your marketing campaigns</p>
        </div>
        <button
          onClick={() => {
            setEditingCampaign(null)
            setFormData({ name: '', description: '', start_date: '', end_date: '', status: 'active' })
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map(campaign => {
                const StatusIcon = statusIcons[campaign.status]
                return (
                  <div
                    key={campaign.id}
                    onClick={() => setSelectedCampaign(campaign)}
                    className={`card cursor-pointer transition-all ${
                      selectedCampaign?.id === campaign.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <FolderKanban size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                          {campaign.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{campaign.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                          <StatusIcon size={12} />
                          {campaign.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(campaign)
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(campaign.id)
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {campaign.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(new Date(campaign.start_date), 'MMM d')}
                          {campaign.end_date && ` - ${format(new Date(campaign.end_date), 'MMM d, yyyy')}`}
                        </span>
                      )}
                      {campaign.post_count !== undefined && (
                        <span>{campaign.post_count} posts</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {['active', 'paused', 'completed'].map(status => {
                        if (status === campaign.status) return null
                        const Icon = statusIcons[status]
                        return (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(campaign, status)
                            }}
                            className={`text-xs px-2 py-1 rounded ${statusColors[status]} hover:opacity-80`}
                          >
                            <Icon size={12} className="inline mr-1" />
                            Set {status}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FolderKanban size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No campaigns yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first campaign to organize your posts</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedCampaign ? (
            <div className="card sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Summary</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Campaign</p>
                  <p className="font-medium text-gray-900">{selectedCampaign.name}</p>
                </div>
                
                {summary ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Total Posts</p>
                        <p className="text-xl font-bold text-gray-900">{summary.total_posts || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Published</p>
                        <p className="text-xl font-bold text-green-600">{summary.published_posts || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Scheduled</p>
                        <p className="text-xl font-bold text-primary-600">{summary.scheduled_posts || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Drafts</p>
                        <p className="text-xl font-bold text-gray-600">{summary.draft_posts || 0}</p>
                      </div>
                    </div>

                    {summary.analytics && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Performance</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Total Impressions</span>
                            <span className="font-medium">{summary.analytics.impressions?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Total Engagement</span>
                            <span className="font-medium">{summary.analytics.engagement?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Engagement Rate</span>
                            <span className="font-medium">{summary.analytics.engagement_rate?.toFixed(2) || 0}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {summary.platforms && Object.keys(summary.platforms).length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">By Platform</h3>
                        <div className="space-y-2">
                          {Object.entries(summary.platforms).map(([platform, count]) => (
                            <div key={platform} className="flex items-center justify-between">
                              <span className={`platform-badge ${platform}`}>{platform}</span>
                              <span className="text-sm text-gray-600">{count} posts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Loading summary...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <BarChart3 size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Select a campaign to view details</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Campaign name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCampaign ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

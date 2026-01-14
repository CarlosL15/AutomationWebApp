import { useState, useEffect } from 'react'
import { listeningApi } from '../services/api'
import { Search, Plus, Trash2, RefreshCw, TrendingUp, MessageSquare, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function Listening() {
  const [topics, setTopics] = useState([])
  const [results, setResults] = useState([])
  const [trends, setTrends] = useState(null)
  const [sentimentData, setSentimentData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    keyword: '',
    platforms: ['tiktok', 'instagram', 'youtube', 'facebook']
  })

  useEffect(() => {
    fetchTopics()
  }, [])

  useEffect(() => {
    if (selectedTopic) {
      fetchTopicData(selectedTopic.id)
    }
  }, [selectedTopic])

  const fetchTopics = async () => {
    setLoading(true)
    try {
      const response = await listeningApi.getTopics()
      setTopics(response.data || [])
      if (response.data?.length > 0 && !selectedTopic) {
        setSelectedTopic(response.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTopicData = async (topicId) => {
    try {
      const [resultsRes, trendsRes, sentimentRes] = await Promise.all([
        listeningApi.getResults(topicId, { limit: 20 }),
        listeningApi.getTrends(topicId),
        listeningApi.getSentiment(topicId, 30)
      ])
      setResults(resultsRes.data || [])
      setTrends(trendsRes.data)
      setSentimentData(sentimentRes.data || [])
    } catch (error) {
      console.error('Failed to fetch topic data:', error)
    }
  }

  const handleCreateTopic = async (e) => {
    e.preventDefault()
    try {
      const response = await listeningApi.createTopic(formData)
      setTopics([...topics, response.data])
      setSelectedTopic(response.data)
      setShowModal(false)
      setFormData({ keyword: '', platforms: ['tiktok', 'instagram', 'youtube', 'facebook'] })
    } catch (error) {
      console.error('Failed to create topic:', error)
    }
  }

  const handleDeleteTopic = async (topicId) => {
    if (!confirm('Are you sure you want to delete this topic?')) return
    try {
      await listeningApi.deleteTopic(topicId)
      const updatedTopics = topics.filter(t => t.id !== topicId)
      setTopics(updatedTopics)
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(updatedTopics[0] || null)
      }
    } catch (error) {
      console.error('Failed to delete topic:', error)
    }
  }

  const handleSearch = async () => {
    if (!selectedTopic) return
    setSearching(true)
    try {
      await listeningApi.search(selectedTopic.id)
      await fetchTopicData(selectedTopic.id)
    } catch (error) {
      console.error('Failed to search:', error)
    } finally {
      setSearching(false)
    }
  }

  const togglePlatform = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
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
          <h1 className="text-2xl font-bold text-gray-900">Social Listening</h1>
          <p className="text-gray-600 mt-1">Track keywords and trends across platforms</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Topic
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Topics</h2>
          {topics.length > 0 ? (
            <div className="space-y-2">
              {topics.map(topic => (
                <div
                  key={topic.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTopic?.id === topic.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-gray-500" />
                    <span className="font-medium text-gray-900">{topic.keyword}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTopic(topic.id)
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No topics yet</p>
          )}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedTopic ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Results for "{selectedTopic.keyword}"
                </h2>
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw size={18} className={searching ? 'animate-spin' : ''} />
                  {searching ? 'Searching...' : 'Search Now'}
                </button>
              </div>

              {trends && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card py-4">
                    <p className="text-sm text-gray-600">Total Mentions</p>
                    <p className="text-2xl font-bold text-gray-900">{trends.total_mentions || 0}</p>
                  </div>
                  <div className="card py-4">
                    <p className="text-sm text-gray-600">Avg. Engagement</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {trends.avg_engagement?.toFixed(0) || 0}
                    </p>
                  </div>
                  <div className="card py-4">
                    <p className="text-sm text-gray-600">Top Platform</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {trends.top_platform || 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {sentimentData.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
                        <YAxis />
                        <Tooltip labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')} />
                        <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} />
                        <Line type="monotone" dataKey="neutral" stroke="#6b7280" strokeWidth={2} />
                        <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Mentions</h3>
                {results.length > 0 ? (
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={result.id || index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`platform-badge ${result.platform}`}>{result.platform}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getSentimentColor(result.sentiment)}`}>
                            {result.sentiment}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(result.found_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-gray-800 mb-2">{result.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>By: {result.author_name || 'Unknown'}</span>
                          {result.engagement_score && (
                            <span className="flex items-center gap-1">
                              <TrendingUp size={14} />
                              {result.engagement_score.toFixed(0)} engagement
                            </span>
                          )}
                        </div>
                        {result.source_url && (
                          <a
                            href={result.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
                          >
                            View original
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No mentions found</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Search Now" to find mentions</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Select a topic or create a new one to start tracking</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add Listening Topic</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Enter keyword to track"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {['tiktok', 'instagram', 'youtube', 'facebook'].map(platform => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.platforms.includes(platform)
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

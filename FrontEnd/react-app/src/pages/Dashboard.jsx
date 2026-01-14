import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi, inboxApi, publishingApi, platformsApi } from '../services/api'
import { Users, MessageSquare, Calendar, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [inboxStats, setInboxStats] = useState(null)
  const [upcomingPosts, setUpcomingPosts] = useState([])
  const [connections, setConnections] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [overviewRes, inboxRes, queueRes, connectionsRes] = await Promise.all([
        analyticsApi.getOverview(startDate, endDate).catch(() => ({ data: null })),
        inboxApi.getStats().catch(() => ({ data: null })),
        publishingApi.getQueue().catch(() => ({ data: [] })),
        platformsApi.getConnections().catch(() => ({ data: [] }))
      ])

      setOverview(overviewRes.data)
      setInboxStats(inboxRes.data)
      setUpcomingPosts(queueRes.data?.slice(0, 5) || [])
      setConnections(connectionsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value?.toLocaleString() || '0'}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your social media performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Followers"
          value={overview?.total_followers}
          change={overview?.follower_change}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Engagement"
          value={overview?.total_engagement}
          change={overview?.engagement_change}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Inbox Messages"
          value={inboxStats?.total_messages}
          icon={MessageSquare}
          color="bg-purple-500"
        />
        <StatCard
          title="Scheduled Posts"
          value={upcomingPosts.length}
          icon={Calendar}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Platforms</h2>
          {connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`platform-badge ${conn.platform}`}>{conn.platform}</span>
                    <span className="text-sm text-gray-600">{conn.platform_username || 'Connected'}</span>
                  </div>
                  <span className={`text-sm ${conn.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {conn.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No platforms connected yet</p>
              <Link to="/platforms" className="btn-primary">
                Connect Platform
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Posts</h2>
            <Link to="/publishing" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </Link>
          </div>
          {upcomingPosts.length > 0 ? (
            <div className="space-y-3">
              {upcomingPosts.map(post => (
                <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{post.content?.substring(0, 50)}...</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(post.scheduled_time).toLocaleString()}
                    </p>
                  </div>
                  <span className={`platform-badge ${post.platform} ml-2`}>{post.platform}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No posts scheduled</p>
              <Link to="/publishing" className="btn-primary">
                Create Post
              </Link>
            </div>
          )}
        </div>
      </div>

      {overview?.engagement_data && overview.engagement_data.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.engagement_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="engagement" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

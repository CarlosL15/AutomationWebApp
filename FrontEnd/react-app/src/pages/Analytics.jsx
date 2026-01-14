import { useState, useEffect } from 'react'
import { analyticsApi, platformsApi } from '../services/api'
import { BarChart3, TrendingUp, Users, Eye, MessageSquare, Heart, Share2 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, subDays } from 'date-fns'

const COLORS = ['#0ea5e9', '#8b5cf6', '#ef4444', '#22c55e']

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [platformData, setPlatformData] = useState({})
  const [topPosts, setTopPosts] = useState([])
  const [connections, setConnections] = useState([])
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  const [selectedPlatform, setSelectedPlatform] = useState('all')

  useEffect(() => {
    fetchConnections()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedPlatform])

  const fetchConnections = async () => {
    try {
      const response = await platformsApi.getConnections()
      setConnections(response.data || [])
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    }
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const [overviewRes, topPostsRes] = await Promise.all([
        analyticsApi.getOverview(dateRange.start, dateRange.end),
        analyticsApi.getTopPosts({ 
          start_date: dateRange.start, 
          end_date: dateRange.end,
          platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
          limit: 5 
        })
      ])
      
      setOverview(overviewRes.data)
      setTopPosts(topPostsRes.data || [])

      if (selectedPlatform !== 'all') {
        const platformRes = await analyticsApi.getPlatformAnalytics(
          selectedPlatform, 
          dateRange.start, 
          dateRange.end
        )
        setPlatformData({ [selectedPlatform]: platformRes.data })
      } else {
        const activePlatforms = connections.filter(c => c.is_active).map(c => c.platform)
        const platformResponses = await Promise.all(
          activePlatforms.map(p => 
            analyticsApi.getPlatformAnalytics(p, dateRange.start, dateRange.end)
              .catch(() => ({ data: null }))
          )
        )
        const data = {}
        activePlatforms.forEach((p, i) => {
          if (platformResponses[i].data) {
            data[p] = platformResponses[i].data
          }
        })
        setPlatformData(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, change, color = 'bg-primary-500' }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value || '0'}
          </p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  )

  const platformDistribution = overview?.platform_breakdown 
    ? Object.entries(overview.platform_breakdown).map(([name, value]) => ({ name, value }))
    : []

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
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your social media performance</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Platforms</option>
            {connections.filter(c => c.is_active).map(c => (
              <option key={c.platform} value={c.platform}>
                {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input-field w-auto"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input-field w-auto"
          />
        </div>
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
          title="Total Impressions"
          value={overview?.total_impressions}
          change={overview?.impression_change}
          icon={Eye}
          color="bg-purple-500"
        />
        <StatCard
          title="Total Engagement"
          value={overview?.total_engagement}
          change={overview?.engagement_change}
          icon={Heart}
          color="bg-pink-500"
        />
        <StatCard
          title="Engagement Rate"
          value={overview?.engagement_rate ? `${overview.engagement_rate.toFixed(2)}%` : '0%'}
          icon={TrendingUp}
          color="bg-green-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h2>
          <div className="h-64">
            {overview?.engagement_data && overview.engagement_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.engagement_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} />
                  <YAxis />
                  <Tooltip labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')} />
                  <Line type="monotone" dataKey="engagement" stroke="#0ea5e9" strokeWidth={2} />
                  <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h2>
          <div className="h-64">
            {platformDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {platformDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No platform data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Posts</h2>
        {topPosts.length > 0 ? (
          <div className="space-y-4">
            {topPosts.map((post, index) => (
              <div key={post.id || index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`platform-badge ${post.platform}`}>{post.platform}</span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(post.published_at || post.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Heart size={14} />
                      {post.likes?.toLocaleString() || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {post.comments?.toLocaleString() || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 size={14} />
                      {post.shares?.toLocaleString() || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {post.impressions?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No posts data available for this period
          </div>
        )}
      </div>
    </div>
  )
}

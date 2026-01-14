import { useState, useEffect } from 'react'
import { platformsApi } from '../services/api'
import { Link2, Check, X, RefreshCw, ExternalLink } from 'lucide-react'

const platformConfigs = {
  tiktok: {
    name: 'TikTok',
    color: 'bg-gray-900',
    description: 'Connect your TikTok account to publish videos and track analytics.',
    authUrl: 'https://www.tiktok.com/auth/authorize/'
  },
  instagram: {
    name: 'Instagram',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Connect your Instagram Business account to manage posts and messages.',
    authUrl: 'https://api.instagram.com/oauth/authorize'
  },
  youtube: {
    name: 'YouTube',
    color: 'bg-red-600',
    description: 'Connect your YouTube channel to upload videos and view analytics.',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
  },
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-600',
    description: 'Connect your Facebook Page to schedule posts and engage with followers.',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth'
  }
}

export default function Platforms() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState({})
  const [connectCode, setConnectCode] = useState('')
  const [connectPlatform, setConnectPlatform] = useState(null)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const response = await platformsApi.getConnections()
      setConnections(response.data || [])
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform) => {
    if (!connectCode.trim()) {
      alert('Please enter the authorization code')
      return
    }
    
    try {
      await platformsApi.connect(platform, connectCode)
      setConnectCode('')
      setConnectPlatform(null)
      await fetchConnections()
    } catch (error) {
      console.error('Failed to connect:', error)
      alert(error.response?.data?.detail || 'Failed to connect platform')
    }
  }

  const handleDisconnect = async (platform) => {
    if (!confirm(`Are you sure you want to disconnect ${platformConfigs[platform].name}?`)) return
    
    try {
      await platformsApi.disconnect(platform)
      await fetchConnections()
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert(error.response?.data?.detail || 'Failed to disconnect platform')
    }
  }

  const handleVerify = async (platform) => {
    setVerifying(prev => ({ ...prev, [platform]: true }))
    try {
      await platformsApi.verify(platform)
      await fetchConnections()
    } catch (error) {
      console.error('Failed to verify:', error)
      alert(error.response?.data?.detail || 'Token verification failed')
    } finally {
      setVerifying(prev => ({ ...prev, [platform]: false }))
    }
  }

  const getConnection = (platform) => connections.find(c => c.platform === platform)

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
        <h1 className="text-2xl font-bold text-gray-900">Connected Platforms</h1>
        <p className="text-gray-600 mt-1">Manage your social media account connections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(platformConfigs).map(([platform, config]) => {
          const connection = getConnection(platform)
          const isConnected = connection?.is_active
          
          return (
            <div key={platform} className="card">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${config.color}`}>
                  <Link2 size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <Check size={14} />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        <X size={14} />
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{config.description}</p>
                  
                  {isConnected ? (
                    <div className="space-y-3">
                      {connection.platform_username && (
                        <p className="text-sm text-gray-600">
                          Connected as: <span className="font-medium">{connection.platform_username}</span>
                        </p>
                      )}
                      {connection.platform_user_id && (
                        <p className="text-sm text-gray-500">
                          ID: {connection.platform_user_id}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerify(platform)}
                          disabled={verifying[platform]}
                          className="btn-secondary text-sm flex items-center gap-1"
                        >
                          <RefreshCw size={14} className={verifying[platform] ? 'animate-spin' : ''} />
                          {verifying[platform] ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          onClick={() => handleDisconnect(platform)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : connectPlatform === platform ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          1. Click the button below to authorize
                        </p>
                        <a
                          href={config.authUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-sm inline-flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          Open {config.name} Auth
                        </a>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          2. Enter the authorization code below
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={connectCode}
                            onChange={(e) => setConnectCode(e.target.value)}
                            placeholder="Paste authorization code"
                            className="input-field flex-1 text-sm"
                          />
                          <button
                            onClick={() => handleConnect(platform)}
                            className="btn-primary text-sm"
                          >
                            Connect
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setConnectPlatform(null)
                          setConnectCode('')
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConnectPlatform(platform)}
                      className="btn-primary text-sm"
                    >
                      Connect {config.name}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">API Keys Configuration</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your API keys are configured server-side for security. The following environment variables should be set:
        </p>
        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 space-y-1">
          <p>TIKTOK_API_KEY=your_tiktok_key</p>
          <p>INSTAGRAM_API_KEY=your_instagram_key</p>
          <p>YOUTUBE_API_KEY=your_youtube_key</p>
          <p>FACEBOOK_API_KEY=your_facebook_key</p>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          These keys are used by the backend to authenticate API requests. Contact your administrator if you need to update them.
        </p>
      </div>
    </div>
  )
}

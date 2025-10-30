'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Users, FileText, TrendingUp } from 'lucide-react'

interface Stats {
  totalRequests: number
  allowed: number
  denied: number
  reviewed: number
  activeUsers: number
  activePolicies: number
}

interface RecentDecision {
  id: string
  timestamp: string
  user: string
  service: string
  action: string
  decision: 'ALLOW' | 'DENY' | 'REVIEW'
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    allowed: 0,
    denied: 0,
    reviewed: 0,
    activeUsers: 0,
    activePolicies: 0,
  })
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([])
  const [apiHealth, setApiHealth] = useState<'healthy' | 'unhealthy' | 'loading'>('loading')

  useEffect(() => {
    // Check API health
    fetch('http://localhost:8002/health')
      .then(res => res.json())
      .then(() => setApiHealth('healthy'))
      .catch(() => setApiHealth('unhealthy'))

    // Fetch stats (mock data for now)
    setStats({
      totalRequests: 1247,
      allowed: 892,
      denied: 234,
      reviewed: 121,
      activeUsers: 47,
      activePolicies: 12,
    })

    // Mock recent decisions
    setRecentDecisions([
      { id: '1', timestamp: new Date().toISOString(), user: 'john.doe@company.com', service: 'ChatGPT', action: 'Access Request', decision: 'ALLOW' },
      { id: '2', timestamp: new Date(Date.now() - 60000).toISOString(), user: 'jane.smith@company.com', service: 'Character.ai', action: 'Access Request', decision: 'DENY' },
      { id: '3', timestamp: new Date(Date.now() - 120000).toISOString(), user: 'bob.wilson@company.com', service: 'Claude', action: 'Data Upload', decision: 'REVIEW' },
      { id: '4', timestamp: new Date(Date.now() - 180000).toISOString(), user: 'alice.brown@company.com', service: 'Copilot', action: 'Code Generation', decision: 'ALLOW' },
      { id: '5', timestamp: new Date(Date.now() - 240000).toISOString(), user: 'charlie.davis@company.com', service: 'Gemini', action: 'Access Request', decision: 'DENY' },
    ])
  }, [])

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'ALLOW': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'DENY': return <XCircle className="h-4 w-4 text-red-500" />
      case 'REVIEW': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return null
    }
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ALLOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'DENY': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'REVIEW': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Governance Platform</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Enterprise Policy Management & Enforcement</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                apiHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                apiHealth === 'unhealthy' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <Activity className="h-4 w-4" />
                {apiHealth === 'healthy' ? 'System Healthy' : apiHealth === 'unhealthy' ? 'System Down' : 'Checking...'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Requests */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Requests</h3>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalRequests.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Last 24 hours</p>
          </div>

          {/* Allowed */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Allowed</h3>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.allowed.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{Math.round((stats.allowed / stats.totalRequests) * 100)}% of requests</p>
          </div>

          {/* Denied */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Denied</h3>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.denied.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{Math.round((stats.denied / stats.totalRequests) * 100)}% of requests</p>
          </div>

          {/* Needs Review */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Needs Review</h3>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.reviewed.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{Math.round((stats.reviewed / stats.totalRequests) * 100)}% of requests</p>
          </div>

          {/* Active Users */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Users</h3>
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.activeUsers.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Currently online</p>
          </div>

          {/* Active Policies */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Policies</h3>
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.activePolicies.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Enforcing now</p>
          </div>
        </div>

        {/* Recent Decisions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Decisions</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentDecisions.map((decision) => (
                  <tr key={decision.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-300">
                      {new Date(decision.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {decision.user}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {decision.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {decision.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getDecisionColor(decision.decision)}`}>
                        {getDecisionIcon(decision.decision)}
                        {decision.decision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer"
             className="block p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Grafana Dashboards</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">View detailed metrics and analytics</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">localhost:3000 →</p>
          </a>

          <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer"
             className="block p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Prometheus Metrics</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Query system metrics directly</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">localhost:9090 →</p>
          </a>

          <a href="http://localhost:8002/docs" target="_blank" rel="noopener noreferrer"
             className="block p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">API Documentation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Explore API endpoints</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">localhost:8002/docs →</p>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-slate-900 mt-12">
        <div className="container mx-auto px-6 py-4">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            AI Governance Platform v1.0.0 | 100% Open Source | Zero Budget Implementation
          </p>
        </div>
      </footer>
    </div>
  )
}

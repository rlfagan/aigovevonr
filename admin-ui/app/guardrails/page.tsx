'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Globe,
  Zap,
  FileCheck,
  Target,
  Users,
  Brain,
  Lock,
  Eye
} from 'lucide-react'

interface DashboardSummary {
  timestamp: string
  threats: {
    last_24h: number
    blocked: number
    by_category: Record<string, number>
    by_level: Record<string, number>
  }
  models: {
    total: number
    healthy: number
    degraded: number
    unavailable: number
  }
  recommendations: string[]
}

export default function GuardrailsDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardSummary()
    const interval = setInterval(fetchDashboardSummary, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/guardrails/dashboard/summary')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const data = await response.json()
      setSummary(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]"></div>
          <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <Alert className="bg-red-950/50 border-red-500/50 text-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const getThreatLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return 'from-red-500 to-red-600'
      case 'HIGH': return 'from-orange-500 to-orange-600'
      case 'MEDIUM': return 'from-yellow-500 to-yellow-600'
      case 'LOW': return 'from-blue-500 to-blue-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getThreatGlow = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return 'shadow-[0_0_20px_rgba(239,68,68,0.6)]'
      case 'HIGH': return 'shadow-[0_0_20px_rgba(249,115,22,0.6)]'
      case 'MEDIUM': return 'shadow-[0_0_20px_rgba(234,179,8,0.6)]'
      case 'LOW': return 'shadow-[0_0_20px_rgba(59,130,246,0.6)]'
      default: return 'shadow-[0_0_20px_rgba(107,114,128,0.6)]'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-light text-white flex items-center gap-3 mb-2">
              <Shield className="h-10 w-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                AI GUARDRAILS
              </span>
            </h1>
            <p className="text-gray-400 text-sm tracking-wide uppercase">
              Neural Security Operations Center
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-gradient-to-r from-violet-600 to-cyan-600 border-0 text-white px-4 py-2 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Activity className="h-3 w-3 mr-2 animate-pulse" />
              LIVE
            </Badge>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Last Sync</div>
              <div className="text-sm text-cyan-400 font-mono">
                {summary ? new Date(summary.timestamp).toLocaleTimeString() : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Top Status Bar - Cyber Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Threats Counter */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">24H</div>
            </div>
            <div className="text-3xl font-light text-white mb-1 font-mono">
              {summary?.threats.last_24h || 0}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Threats Detected</div>
            <div className="mt-2 text-xs text-orange-400">
              {summary?.threats.blocked || 0} neutralized
            </div>
          </div>

          {/* Model Health */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <Brain className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Models</div>
            </div>
            <div className="text-3xl font-light text-white mb-1 font-mono">
              {summary?.models.healthy || 0}<span className="text-gray-600">/{summary?.models.total || 0}</span>
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Neural Nodes</div>
            <div className="mt-2 text-xs text-cyan-400">
              {summary?.models.degraded || 0} degraded · {summary?.models.unavailable || 0} offline
            </div>
          </div>

          {/* Block Rate */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-green-500/30 rounded-lg p-4 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Defense</div>
            </div>
            <div className="text-3xl font-light text-white mb-1 font-mono">
              {summary?.threats.last_24h
                ? Math.round((summary.threats.blocked / summary.threats.last_24h) * 100)
                : 100}<span className="text-lg">%</span>
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Block Efficiency</div>
            <div className="mt-2 text-xs text-green-400">
              Active protection enabled
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-violet-500/30 rounded-lg p-4 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/30">
                <Zap className="h-5 w-5 text-violet-400" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Status</div>
            </div>
            <div className="text-3xl font-light text-white mb-1 font-mono">
              <CheckCircle2 className="h-8 w-8 text-green-400 inline-block" />
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">All Systems</div>
            <div className="mt-2 text-xs text-violet-400">
              Operational · No anomalies
            </div>
          </div>
        </div>

        {/* Network Flow Visualization */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              Neural Network Flow
            </h2>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                <span className="text-gray-400">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                <span className="text-gray-400">Threat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                <span className="text-gray-400">Secure</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Users Column */}
            <div className="space-y-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider text-center mb-6">Users</h3>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 rounded-full border border-cyan-400/30 animate-ping"></div>
                  </div>
                  <span className="text-xs text-gray-400 mt-2 font-mono">USR-{1000 + i}</span>
                </div>
              ))}
            </div>

            {/* Applications Column */}
            <div className="space-y-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider text-center mb-6">Applications</h3>
              {['ChatGPT', 'Claude', 'Copilot'].map((app, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center border border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                  </div>
                  <span className="text-xs text-gray-400 mt-2">{app}</span>
                </div>
              ))}
            </div>

            {/* Models Column */}
            <div className="space-y-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider text-center mb-6">AI Models</h3>
              {['GPT-4', 'Claude-3', 'Gemini'].map((model, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center border border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full animate-pulse bg-green-400/10"></div>
                  </div>
                  <span className="text-xs text-gray-400 mt-2 font-mono">{model}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Lines Effect */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ top: 80 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 0 }} />
                <stop offset="50%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <line x1="16%" y1="25%" x2="50%" y2="25%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" />
            <line x1="16%" y1="50%" x2="50%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
            <line x1="16%" y1="75%" x2="50%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
            <line x1="50%" y1="25%" x2="84%" y2="25%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.1s' }} />
            <line x1="50%" y1="50%" x2="84%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
            <line x1="50%" y1="75%" x2="84%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          </svg>
        </div>

        {/* Threat Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threat Distribution */}
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-orange-500/20 rounded-lg p-6 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
            <h2 className="text-lg font-light text-white flex items-center gap-2 mb-6">
              <Target className="h-5 w-5 text-orange-400" />
              Threat Distribution
            </h2>
            {summary && Object.keys(summary.threats.by_category).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(summary.threats.by_category).map(([category, count]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 uppercase tracking-wide text-xs">{category.replace(/_/g, ' ')}</span>
                      <span className="text-cyan-400 font-mono">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-500"
                        style={{
                          width: `${Math.min((count / (summary.threats.last_24h || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-400/50 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No threats detected</p>
              </div>
            )}
          </div>

          {/* Severity Levels */}
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-violet-500/20 rounded-lg p-6 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <h2 className="text-lg font-light text-white flex items-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-violet-400" />
              Severity Analysis
            </h2>
            {summary && Object.keys(summary.threats.by_level).length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(summary.threats.by_level).map(([level, count]) => (
                  <div key={level} className="relative">
                    <div className={`bg-gradient-to-br ${getThreatLevelColor(level)} rounded-lg p-4 border border-white/10 ${getThreatGlow(level)}`}>
                      <div className="text-3xl font-light text-white mb-1 font-mono">{count}</div>
                      <div className="text-xs text-white/80 uppercase tracking-wider">{level}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-cyan-400/50 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No severity data</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-orange-500/30 rounded-lg p-6 cursor-pointer hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all duration-300"
            onClick={() => window.location.href = '/guardrails/threats'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 group-hover:bg-orange-500/20 transition-all">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <Activity className="h-4 w-4 text-gray-600 group-hover:text-orange-400 transition-all" />
            </div>
            <h3 className="text-white font-light text-lg mb-2">Threat Intelligence</h3>
            <p className="text-gray-500 text-sm">Monitor attack vectors and threat patterns in real-time</p>
          </div>

          <div
            className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 cursor-pointer hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-300"
            onClick={() => window.location.href = '/guardrails/models'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-all">
                <Brain className="h-6 w-6 text-cyan-400" />
              </div>
              <Activity className="h-4 w-4 text-gray-600 group-hover:text-cyan-400 transition-all" />
            </div>
            <h3 className="text-white font-light text-lg mb-2">Model Routing</h3>
            <p className="text-gray-500 text-sm">Configure failover and monitor neural node health</p>
          </div>

          <div
            className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-violet-500/30 rounded-lg p-6 cursor-pointer hover:border-violet-400 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300"
            onClick={() => window.location.href = '/guardrails/compliance'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-violet-500/10 rounded-lg border border-violet-500/30 group-hover:bg-violet-500/20 transition-all">
                <FileCheck className="h-6 w-6 text-violet-400" />
              </div>
              <Activity className="h-4 w-4 text-gray-600 group-hover:text-violet-400 transition-all" />
            </div>
            <h3 className="text-white font-light text-lg mb-2">Compliance</h3>
            <p className="text-gray-500 text-sm">Run audits for GDPR, HIPAA, EU AI Act, and more</p>
          </div>
        </div>

        {/* Security Recommendations */}
        {summary && summary.recommendations && summary.recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-lg p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
            <h2 className="text-lg font-light text-white flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-green-400" />
              Security Recommendations
            </h2>
            <div className="space-y-3">
              {summary.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

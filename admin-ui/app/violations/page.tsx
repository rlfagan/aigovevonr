'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Search, Filter, Download, Eye, XCircle, CheckCircle, Clock, User, Globe, FileText, Shield } from 'lucide-react'

interface Violation {
  id: string
  timestamp: string
  user: {
    email: string
    name: string
    department: string
  }
  service: string
  url: string
  decision: 'DENY' | 'ALLOW' | 'REVIEW'
  reason: string
  riskScore: number
  piiDetected?: string[]
  userAgent: string
}

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDecision, setFilterDecision] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [overrideConfirm, setOverrideConfirm] = useState(false)
  const [overrideLoading, setOverrideLoading] = useState(false)

  useEffect(() => {
    loadViolations()
  }, [dateRange])

  useEffect(() => {
    filterData()
  }, [violations, searchTerm, filterDecision, filterDepartment])

  const loadViolations = async () => {
    try {
      // In production, fetch from API
      // const response = await fetch(`http://localhost:8002/api/violations?range=${dateRange}`)
      // const data = await response.json()

      // Mock data for now
      const mockViolations: Violation[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: {
            email: 'john.doe@company.com',
            name: 'John Doe',
            department: 'engineering'
          },
          service: 'character.ai',
          url: 'https://character.ai/chat/xyz',
          decision: 'DENY',
          reason: 'Service is prohibited - companion/roleplay AI not allowed',
          riskScore: 90,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          user: {
            email: 'jane.smith@company.com',
            name: 'Jane Smith',
            department: 'marketing'
          },
          service: 'chatgpt.com',
          url: 'https://chatgpt.com/c/abc123',
          decision: 'ALLOW',
          reason: 'Approved for marketing department',
          riskScore: 20,
          piiDetected: ['email'],
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          user: {
            email: 'bob.wilson@company.com',
            name: 'Bob Wilson',
            department: 'finance'
          },
          service: 'midjourney.com',
          url: 'https://midjourney.com/app',
          decision: 'DENY',
          reason: 'Service requires manager approval',
          riskScore: 50,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          user: {
            email: 'alice.jones@company.com',
            name: 'Alice Jones',
            department: 'engineering'
          },
          service: 'copilot.github.com',
          url: 'https://github.com/features/copilot',
          decision: 'ALLOW',
          reason: 'Approved for engineering department',
          riskScore: 10,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 18000000).toISOString(),
          user: {
            email: 'charlie.brown@company.com',
            name: 'Charlie Brown',
            department: 'sales'
          },
          service: 'chatgpt.com',
          url: 'https://chatgpt.com/c/def456',
          decision: 'DENY',
          reason: 'PII detected - SSN found in input',
          riskScore: 95,
          piiDetected: ['ssn', 'credit_card'],
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
        }
      ]

      setViolations(mockViolations)
    } catch (error) {
      console.error('Failed to load violations:', error)
    }
  }

  const filterData = () => {
    let filtered = violations

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.reason.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Decision filter
    if (filterDecision !== 'all') {
      filtered = filtered.filter(v => v.decision === filterDecision)
    }

    // Department filter
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(v => v.user.department === filterDepartment)
    }

    setFilteredViolations(filtered)
  }

  const exportViolations = () => {
    const csv = [
      ['Timestamp', 'User', 'Email', 'Department', 'Service', 'Decision', 'Reason', 'Risk Score'],
      ...filteredViolations.map(v => [
        v.timestamp,
        v.user.name,
        v.user.email,
        v.user.department,
        v.service,
        v.decision,
        v.reason,
        v.riskScore.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `violations_${dateRange}_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'DENY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            Blocked
          </span>
        )
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" />
            Allowed
          </span>
        )
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Clock className="w-3 h-3" />
            Review
          </span>
        )
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-400 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'
    if (score >= 50) return 'text-orange-400 font-semibold drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]'
    if (score >= 30) return 'text-yellow-400'
    return 'text-green-400'
  }

  const createAdminOverride = async (violation: Violation) => {
    setOverrideLoading(true)
    try {
      // Extract domain from URL
      const url = new URL(violation.url)
      const domain = url.hostname

      // In production, call API to add override to OPA data
      const response = await fetch('http://localhost:8002/api/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain,
          service: violation.service,
          reason: `Admin override for ${violation.user.email}`,
          created_by: 'admin@company.com', // Get from auth context
          active: true
        })
      })

      if (response.ok) {
        alert(`✅ Override created! ${domain} is now allowed for all users.\n\nThe policy has been updated automatically.`)
        setSelectedViolation(null)
        setOverrideConfirm(false)
        // Reload violations to show updated status
        loadViolations()
      } else {
        throw new Error('Failed to create override')
      }
    } catch (error) {
      console.error('Failed to create override:', error)
      alert('❌ Failed to create override. Check console for details.')
    } finally {
      setOverrideLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-2">Violations & Activity Log</h1>
          <p className="text-gray-400">Detailed view of all AI service access attempts</p>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-violet-500/20 p-6 mb-6 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-cyan-500/20 text-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Decision Filter */}
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="px-4 py-2 bg-slate-950/50 border border-violet-500/20 text-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            >
              <option value="all">All Decisions</option>
              <option value="DENY">Blocked</option>
              <option value="ALLOW">Allowed</option>
              <option value="REVIEW">Review</option>
            </select>

            {/* Department Filter */}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 bg-slate-950/50 border border-violet-500/20 text-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            >
              <option value="all">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
              <option value="hr">HR</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 bg-slate-950/50 border border-violet-500/20 text-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-400 font-mono">
              Showing {filteredViolations.length} of {violations.length} records
            </div>
            <button
              onClick={exportViolations}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Violations Table */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.1)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/80 border-b border-cyan-500/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Decision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                      {new Date(violation.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-light text-white">{violation.user.name}</div>
                          <div className="text-sm text-gray-400">{violation.user.email}</div>
                          <div className="text-xs text-gray-500">{violation.user.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-light text-white">{violation.service}</span>
                      </div>
                      {violation.piiDetected && violation.piiDetected.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {violation.piiDetected.map((pii) => (
                            <span key={pii} className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded">
                              PII: {pii}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDecisionBadge(violation.decision)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-mono ${getRiskColor(violation.riskScore)}`}>
                        {violation.riskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedViolation(violation)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedViolation && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_40px_rgba(34,211,238,0.3)]">
              <div className="p-6 border-b border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-light text-white">Violation Details</h2>
                  <button
                    onClick={() => setSelectedViolation(null)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">User Information</label>
                  <div className="bg-slate-950/50 border border-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-300"><strong className="text-cyan-400">Name:</strong> {selectedViolation.user.name}</p>
                    <p className="text-gray-300"><strong className="text-cyan-400">Email:</strong> {selectedViolation.user.email}</p>
                    <p className="text-gray-300"><strong className="text-cyan-400">Department:</strong> {selectedViolation.user.department}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Service</label>
                  <div className="bg-slate-950/50 border border-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-300"><strong className="text-violet-400">Service:</strong> {selectedViolation.service}</p>
                    <p className="break-all text-gray-300"><strong className="text-violet-400">URL:</strong> {selectedViolation.url}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Decision</label>
                  <div className="bg-slate-950/50 border border-slate-700/50 p-4 rounded-lg">
                    <div className="mb-2">{getDecisionBadge(selectedViolation.decision)}</div>
                    <p className="text-gray-300"><strong className="text-orange-400">Reason:</strong> {selectedViolation.reason}</p>
                    <p className="text-gray-300"><strong className="text-orange-400">Risk Score:</strong> <span className={getRiskColor(selectedViolation.riskScore)}>{selectedViolation.riskScore}</span></p>
                  </div>
                </div>
                {selectedViolation.piiDetected && selectedViolation.piiDetected.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">PII Detected</label>
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {selectedViolation.piiDetected.map((pii) => (
                          <span key={pii} className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-sm font-medium">
                            {pii.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Technical Details</label>
                  <div className="bg-slate-950/50 border border-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-300 font-mono text-sm"><strong className="text-gray-500">Timestamp:</strong> {new Date(selectedViolation.timestamp).toLocaleString()}</p>
                    <p className="break-all text-gray-300 text-sm mt-2"><strong className="text-gray-500">User Agent:</strong> {selectedViolation.userAgent}</p>
                  </div>
                </div>

                {/* Admin Override Section */}
                {selectedViolation.decision === 'DENY' && (
                  <div className="border-t border-slate-700/50 pt-4 mt-4">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Admin Override</label>
                    {!overrideConfirm ? (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                        <p className="text-sm text-orange-400 mb-3">
                          You can create an admin override to allow this service for <strong>all users</strong>.
                          This will add an exception to the policy.
                        </p>
                        <button
                          onClick={() => setOverrideConfirm(true)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Create Admin Override
                        </button>
                      </div>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-sm text-red-400 mb-2 font-semibold">Warning: Confirm Override</p>
                        <p className="text-sm text-red-400/80 mb-4">
                          This will allow <strong>{selectedViolation.service}</strong> for ALL users in your organization.
                          This action is logged and auditable.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => createAdminOverride(selectedViolation)}
                            disabled={overrideLoading}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 rounded-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50"
                          >
                            {overrideLoading ? 'Creating...' : 'Yes, Allow Service'}
                          </button>
                          <button
                            onClick={() => setOverrideConfirm(false)}
                            disabled={overrideLoading}
                            className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-gray-300 rounded-lg hover:bg-slate-600/50 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

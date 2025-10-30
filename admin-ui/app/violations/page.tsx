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
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Blocked
          </span>
        )
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Allowed
          </span>
        )
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Review
          </span>
        )
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold'
    if (score >= 50) return 'text-orange-600 font-semibold'
    if (score >= 30) return 'text-yellow-600'
    return 'text-green-600'
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Violations & Activity Log</h1>
          <p className="text-gray-600">Detailed view of all AI service access attempts</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Decision Filter */}
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredViolations.length} of {violations.length} records
            </div>
            <button
              onClick={exportViolations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Violations Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
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
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(violation.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{violation.user.name}</div>
                          <div className="text-sm text-gray-500">{violation.user.email}</div>
                          <div className="text-xs text-gray-400">{violation.user.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{violation.service}</span>
                      </div>
                      {violation.piiDetected && violation.piiDetected.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {violation.piiDetected.map((pii) => (
                            <span key={pii} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
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
                      <span className={`text-sm font-medium ${getRiskColor(violation.riskScore)}`}>
                        {violation.riskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedViolation(violation)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Violation Details</h2>
                  <button
                    onClick={() => setSelectedViolation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Information</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Name:</strong> {selectedViolation.user.name}</p>
                    <p><strong>Email:</strong> {selectedViolation.user.email}</p>
                    <p><strong>Department:</strong> {selectedViolation.user.department}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Service:</strong> {selectedViolation.service}</p>
                    <p className="break-all"><strong>URL:</strong> {selectedViolation.url}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-2">{getDecisionBadge(selectedViolation.decision)}</div>
                    <p><strong>Reason:</strong> {selectedViolation.reason}</p>
                    <p><strong>Risk Score:</strong> <span className={getRiskColor(selectedViolation.riskScore)}>{selectedViolation.riskScore}</span></p>
                  </div>
                </div>
                {selectedViolation.piiDetected && selectedViolation.piiDetected.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PII Detected</label>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {selectedViolation.piiDetected.map((pii) => (
                          <span key={pii} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {pii.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technical Details</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Timestamp:</strong> {new Date(selectedViolation.timestamp).toLocaleString()}</p>
                    <p className="break-all"><strong>User Agent:</strong> {selectedViolation.userAgent}</p>
                  </div>
                </div>

                {/* Admin Override Section */}
                {selectedViolation.decision === 'DENY' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Override</label>
                    {!overrideConfirm ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 mb-3">
                          You can create an admin override to allow this service for <strong>all users</strong>.
                          This will add an exception to the policy.
                        </p>
                        <button
                          onClick={() => setOverrideConfirm(true)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Create Admin Override
                        </button>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 mb-2 font-semibold">⚠️ Confirm Override</p>
                        <p className="text-sm text-red-700 mb-4">
                          This will allow <strong>{selectedViolation.service}</strong> for ALL users in your organization.
                          This action is logged and auditable.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => createAdminOverride(selectedViolation)}
                            disabled={overrideLoading}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            {overrideLoading ? 'Creating...' : 'Yes, Allow Service'}
                          </button>
                          <button
                            onClick={() => setOverrideConfirm(false)}
                            disabled={overrideLoading}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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

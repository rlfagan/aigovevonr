'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Globe, User, Clock } from 'lucide-react'

interface UnknownService {
  id: string
  domain: string
  url: string
  detectedAt: string
  detectedBy: {
    email: string
    name: string
    department: string
  }
  occurrences: number
  status: 'pending' | 'approved' | 'blocked'
  reason?: string
}

export default function UnknownServicesPage() {
  const [services, setServices] = useState<UnknownService[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('pending')

  useEffect(() => {
    loadUnknownServices()
  }, [])

  const loadUnknownServices = async () => {
    try {
      // In production, fetch from API
      // const response = await fetch('http://localhost:8002/api/unknown-services')
      // const data = await response.json()

      // Mock data
      const mockServices: UnknownService[] = [
        {
          id: '1',
          domain: 'new-ai-tool.com',
          url: 'https://new-ai-tool.com/chat',
          detectedAt: new Date(Date.now() - 3600000).toISOString(),
          detectedBy: {
            email: 'john.doe@company.com',
            name: 'John Doe',
            department: 'engineering'
          },
          occurrences: 5,
          status: 'pending'
        },
        {
          id: '2',
          domain: 'ai-assistant.io',
          url: 'https://ai-assistant.io',
          detectedAt: new Date(Date.now() - 7200000).toISOString(),
          detectedBy: {
            email: 'jane.smith@company.com',
            name: 'Jane Smith',
            department: 'marketing'
          },
          occurrences: 12,
          status: 'pending'
        }
      ]

      setServices(mockServices)
    } catch (error) {
      console.error('Failed to load unknown services:', error)
    }
  }

  const approveService = async (service: UnknownService) => {
    try {
      // Call API to approve and add to policy
      const response = await fetch(`http://localhost:8002/api/unknown-services/${service.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: service.domain,
          approved_by: 'admin@company.com'
        })
      })

      if (response.ok) {
        alert(`✅ ${service.domain} has been approved!\n\nThis service will now be added to your policy.`)
        loadUnknownServices()
      }
    } catch (error) {
      console.error('Failed to approve service:', error)
      alert('❌ Failed to approve service')
    }
  }

  const blockService = async (service: UnknownService) => {
    try {
      const response = await fetch(`http://localhost:8002/api/unknown-services/${service.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: service.domain,
          blocked_by: 'admin@company.com'
        })
      })

      if (response.ok) {
        alert(`🚫 ${service.domain} has been blocked!\n\nUsers will no longer be able to access this service.`)
        loadUnknownServices()
      }
    } catch (error) {
      console.error('Failed to block service:', error)
      alert('❌ Failed to block service')
    }
  }

  const filteredServices = services.filter(s => filter === 'all' || s.status === filter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Clock className="w-3 h-3 animate-pulse" />
            Pending Review
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            Blocked
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-2">Unknown AI Services</h1>
          <p className="text-gray-400">Review and approve/block new AI services detected by the system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-orange-500/20 p-6 hover:border-orange-500/40 transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pending Review</p>
                <p className="text-3xl font-mono font-light text-orange-400">
                  {services.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-full">
                <Clock className="w-6 h-6 text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-green-500/20 p-6 hover:border-green-500/40 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Approved</p>
                <p className="text-3xl font-mono font-light text-green-400">
                  {services.filter(s => s.status === 'approved').length}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-red-500/20 p-6 hover:border-red-500/40 transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Blocked</p>
                <p className="text-3xl font-mono font-light text-red-400">
                  {services.filter(s => s.status === 'blocked').length}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full">
                <XCircle className="w-6 h-6 text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-violet-500/20 p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 uppercase tracking-wide font-medium">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800/50 text-gray-400 border border-slate-700/50 hover:border-cyan-500/30'
              }`}
            >
              All ({services.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-slate-800/50 text-gray-400 border border-slate-700/50 hover:border-orange-500/30'
              }`}
            >
              Pending ({services.filter(s => s.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-800/50 text-gray-400 border border-slate-700/50 hover:border-green-500/30'
              }`}
            >
              Approved ({services.filter(s => s.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('blocked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'blocked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800/50 text-gray-400 border border-slate-700/50 hover:border-red-500/30'
              }`}
            >
              Blocked ({services.filter(s => s.status === 'blocked').length})
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.1)]">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center">
              <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-lg text-gray-400">No {filter !== 'all' && filter} services found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {filteredServices.map((service) => (
                <div key={service.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                        <h3 className="text-lg font-light text-white">{service.domain}</h3>
                        {getStatusBadge(service.status)}
                      </div>
                      <p className="text-sm text-gray-400 mb-3 font-mono">{service.url}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">Detected by:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/20 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-violet-400" />
                            </div>
                            <div>
                              <div className="font-light text-white">{service.detectedBy.name}</div>
                              <div className="text-xs text-gray-500">{service.detectedBy.email}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">Detection details:</span>
                          <div className="mt-1">
                            <div className="text-gray-400 font-mono text-xs">
                              First seen: {new Date(service.detectedAt).toLocaleString()}
                            </div>
                            <div className="text-gray-300 mt-1">
                              Total attempts: <span className="font-mono font-semibold text-orange-400">{service.occurrences}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {service.status === 'pending' && (
                      <div className="ml-6 flex flex-col gap-2">
                        <button
                          onClick={() => approveService(service)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30 text-green-400 rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => blockService(service)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 rounded-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Block
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

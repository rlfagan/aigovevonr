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
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Blocked
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Unknown AI Services</h1>
          <p className="text-gray-600">Review and approve/block new AI services detected by the system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {services.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-green-600">
                  {services.filter(s => s.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Blocked</p>
                <p className="text-3xl font-bold text-red-600">
                  {services.filter(s => s.status === 'blocked').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({services.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({services.filter(s => s.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved ({services.filter(s => s.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('blocked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Blocked ({services.filter(s => s.status === 'blocked').length})
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg">No {filter !== 'all' && filter} services found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredServices.map((service) => (
                <div key={service.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{service.domain}</h3>
                        {getStatusBadge(service.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{service.url}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Detected by:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{service.detectedBy.name}</div>
                              <div className="text-xs text-gray-500">{service.detectedBy.email}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-600">Detection details:</span>
                          <div className="mt-1">
                            <div className="text-gray-900">
                              First seen: {new Date(service.detectedAt).toLocaleString()}
                            </div>
                            <div className="text-gray-900">
                              Total attempts: <span className="font-semibold">{service.occurrences}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {service.status === 'pending' && (
                      <div className="ml-6 flex flex-col gap-2">
                        <button
                          onClick={() => approveService(service)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => blockService(service)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
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

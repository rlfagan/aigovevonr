'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Activity, Zap, DollarSign, RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface ModelStatus {
  model_id: string
  provider: string
  status: string
  total_requests: number
  success_rate: number
  avg_latency_ms: number
  last_check: string | null
  capabilities: string[]
  cost_per_1k_tokens: number
}

export default function ModelRoutingPage() {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchModelHealth()
  }, [])

  const fetchModelHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/guardrails/route/health')
      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
      }
    } catch (err) {
      console.error('Error fetching model health:', err)
    } finally {
      setLoading(false)
    }
  }

  const triggerHealthCheck = async () => {
    setRefreshing(true)
    try {
      await fetch('http://localhost:8000/api/guardrails/route/health/check', { method: 'POST' })
      await fetchModelHealth()
    } catch (err) {
      console.error('Error triggering health check:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'HEALTHY':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'DEGRADED':
        return <Badge className="bg-yellow-600 text-white"><AlertCircle className="h-3 w-3 mr-1" />Degraded</Badge>
      case 'UNAVAILABLE':
        return <Badge className="bg-red-600 text-white"><XCircle className="h-3 w-3 mr-1" />Unavailable</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-emerald-100 text-emerald-800',
      anthropic: 'bg-orange-100 text-orange-800',
      google: 'bg-blue-100 text-blue-800',
      azure: 'bg-cyan-100 text-cyan-800',
      aws_bedrock: 'bg-amber-100 text-amber-800',
      cohere: 'bg-purple-100 text-purple-800',
      local: 'bg-gray-100 text-gray-800'
    }
    return colors[provider] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const healthyCount = models.filter(m => m.status === 'HEALTHY').length
  const totalCount = models.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-blue-600" />
            Model Routing & Health
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor AI model health and configure intelligent routing
          </p>
        </div>
        <Button onClick={triggerHealthCheck} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Health Checks
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.length > 0
                ? Math.round((models.reduce((sum, m) => sum + m.success_rate, 0) / models.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Status Cards */}
      <div className="grid grid-cols-1 gap-4">
        {models.map((model) => (
          <Card key={model.model_id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {model.model_id}
                    <Badge className={getProviderColor(model.provider)}>
                      {model.provider}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {model.capabilities.join(', ')}
                  </CardDescription>
                </div>
                {getStatusBadge(model.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <Activity className="h-3 w-3" />
                    Requests
                  </div>
                  <p className="font-bold">{model.total_requests.toLocaleString()}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <CheckCircle className="h-3 w-3" />
                    Success Rate
                  </div>
                  <p className="font-bold">{Math.round(model.success_rate * 100)}%</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <Zap className="h-3 w-3" />
                    Latency
                  </div>
                  <p className="font-bold">{model.avg_latency_ms}ms</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <DollarSign className="h-3 w-3" />
                    Cost/1K
                  </div>
                  <p className="font-bold">${model.cost_per_1k_tokens.toFixed(4)}</p>
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">Last Check</div>
                  <p className="font-bold text-xs">
                    {model.last_check ? new Date(model.last_check).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {models.length === 0 && (
        <Alert>
          <AlertDescription>
            No models registered. Models will appear here once the routing system is configured.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

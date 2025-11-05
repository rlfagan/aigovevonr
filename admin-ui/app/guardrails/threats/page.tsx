'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  AlertTriangle,
  Bug,
  Activity,
  FileText,
  Clock,
  User,
  Target
} from 'lucide-react'

interface ThreatReport {
  report_id: string
  timestamp: string
  total_threats_detected: number
  threats_by_category: Record<string, number>
  threats_by_level: Record<string, number>
  top_attack_vectors: string[]
  blocked_attacks: number
  successful_attacks: number
  recommendations: string[]
  trending_threats: string[]
}

interface AttackVector {
  vector_id: string
  name: string
  category: string
  severity: string
  prevalence: number
  total_incidents: number
  last_seen: string | null
}

interface SecurityIncident {
  incident_id: string
  timestamp: string
  user_email: string
  threat_category: string
  threat_level: string
  attack_vector: string
  blocked: boolean
  investigation_status: string
}

export default function ThreatIntelligencePage() {
  const [report, setReport] = useState<ThreatReport | null>(null)
  const [attackVectors, setAttackVectors] = useState<AttackVector[]>([])
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetchAllData()
  }, [days])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [reportRes, vectorsRes, incidentsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/guardrails/threats/report?days=${days}`),
        fetch('http://localhost:8000/api/guardrails/threats/vectors'),
        fetch('http://localhost:8000/api/guardrails/threats/incidents?limit=50')
      ])

      if (reportRes.ok) setReport(await reportRes.json())
      if (vectorsRes.ok) {
        const data = await vectorsRes.json()
        setAttackVectors(data.attack_vectors || [])
      }
      if (incidentsRes.ok) {
        const data = await incidentsRes.json()
        setIncidents(data.incidents || [])
      }
    } catch (err) {
      console.error('Error fetching threat data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getThreatLevelBadge = (level: string) => {
    const colors = {
      CRITICAL: 'bg-red-600',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-blue-500',
      INFO: 'bg-gray-500'
    }
    return <Badge className={`${colors[level as keyof typeof colors] || colors.INFO} text-white`}>{level}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8 text-red-600" />
            AI Red Team Threat Intelligence
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and respond to AI-specific threats and attacks
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border rounded-md"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Threats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.total_threats_detected || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{report?.blocked_attacks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{report?.successful_attacks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Block Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {report?.total_threats_detected
                ? Math.round((report.blocked_attacks / report.total_threats_detected) * 100)
                : 100}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="report" className="w-full">
        <TabsList>
          <TabsTrigger value="report">Threat Report</TabsTrigger>
          <TabsTrigger value="vectors">Attack Vectors</TabsTrigger>
          <TabsTrigger value="incidents">Recent Incidents</TabsTrigger>
        </TabsList>

        {/* Threat Report Tab */}
        <TabsContent value="report" className="space-y-4">
          {/* Top Attack Vectors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Attack Vectors
              </CardTitle>
              <CardDescription>Most common attack patterns detected</CardDescription>
            </CardHeader>
            <CardContent>
              {report && report.top_attack_vectors.length > 0 ? (
                <div className="space-y-2">
                  {report.top_attack_vectors.map((vector, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{vector}</span>
                      <Badge variant="outline">#{idx + 1}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No attack vectors detected</p>
              )}
            </CardContent>
          </Card>

          {/* Threats by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Threats by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {report && Object.keys(report.threats_by_category).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(report.threats_by_category)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="font-medium">{category.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-red-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min((count / (report.total_threats_detected || 1)) * 100, 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No category data available</p>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          {report && report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Security Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attack Vectors Tab */}
        <TabsContent value="vectors">
          <Card>
            <CardHeader>
              <CardTitle>Known Attack Vectors</CardTitle>
              <CardDescription>Database of AI-specific attack patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attackVectors.map((vector) => (
                  <div key={vector.vector_id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{vector.name}</h3>
                        <p className="text-sm text-gray-600">{vector.vector_id}</p>
                      </div>
                      {getThreatLevelBadge(vector.severity)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-600">Category</p>
                        <p className="font-medium">{vector.category.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Prevalence</p>
                        <p className="font-medium">{Math.round(vector.prevalence * 100)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Incidents</p>
                        <p className="font-medium">{vector.total_incidents}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Last Seen</p>
                        <p className="font-medium">
                          {vector.last_seen ? new Date(vector.last_seen).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Incidents</CardTitle>
              <CardDescription>Last 50 detected incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incidents.length > 0 ? (
                  incidents.map((incident) => (
                    <div key={incident.incident_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{incident.user_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getThreatLevelBadge(incident.threat_level)}
                          {incident.blocked ? (
                            <Badge className="bg-green-600 text-white">BLOCKED</Badge>
                          ) : (
                            <Badge className="bg-red-600 text-white">NOT BLOCKED</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-600">Attack Vector</p>
                          <p className="font-medium">{incident.attack_vector}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Category</p>
                          <p className="font-medium">{incident.threat_category.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Status</p>
                          <p className="font-medium">{incident.investigation_status}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Time</p>
                          <p className="font-medium">
                            {new Date(incident.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-center py-8">No incidents recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

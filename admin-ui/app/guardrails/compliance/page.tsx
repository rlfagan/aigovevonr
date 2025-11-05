'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileCheck, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const FRAMEWORKS = [
  { id: 'GDPR', name: 'GDPR', description: 'General Data Protection Regulation (EU)' },
  { id: 'HIPAA', name: 'HIPAA', description: 'Health Insurance Portability and Accountability Act (US)' },
  { id: 'EUAIA', name: 'EU AI Act', description: 'EU Regulation for Artificial Intelligence' },
  { id: 'CCPA', name: 'CCPA', description: 'California Consumer Privacy Act' },
  { id: 'SOC2', name: 'SOC 2', description: 'Service Organization Control 2' },
  { id: 'ISO27001', name: 'ISO 27001', description: 'Information Security Management' },
  { id: 'PCI_DSS', name: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
  { id: 'COPPA', name: 'COPPA', description: "Children's Online Privacy Protection Act" }
]

interface AuditResult {
  framework: string
  overall_status: string
  compliance_score: number
  total_requirements: number
  compliant_requirements: number
  non_compliant_requirements: number
  check_results: any[]
  audit_timestamp: string
}

export default function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState<string>('')
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runAudit = async (frameworkId: string) => {
    setLoading(true)
    setSelectedFramework(frameworkId)

    try {
      const response = await fetch('http://localhost:8000/api/guardrails/compliance/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework: frameworkId,
          system_config: {
            encryption: { enabled: true, at_rest: true, in_transit: true },
            access_control: { enabled: true },
            monitoring: { enabled: true },
            audit_logging: { enabled: true, retention_days: 365, automatic: true },
            privacy: { consent_mechanism: true, transparency: true, data_minimization: true, by_design: true },
            ai_governance: { risk_assessment: true, bias_detection: true, human_oversight: true, accuracy_metrics: true }
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAuditResult(data)
      }
    } catch (err) {
      console.error('Error running audit:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Compliant</Badge>
      case 'PARTIAL':
        return <Badge className="bg-yellow-600 text-white"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>
      case 'NON_COMPLIANT':
        return <Badge className="bg-red-600 text-white"><XCircle className="h-3 w-3 mr-1" />Non-Compliant</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCheck className="h-8 w-8 text-blue-600" />
          Compliance Auditing
        </h1>
        <p className="text-gray-600 mt-1">
          Automated compliance audits for GDPR, HIPAA, EU AI Act, and more
        </p>
      </div>

      {/* Framework Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FRAMEWORKS.map((framework) => (
          <Card
            key={framework.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedFramework === framework.id ? 'ring-2 ring-blue-600' : ''
            }`}
            onClick={() => runAudit(framework.id)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{framework.name}</CardTitle>
              <CardDescription className="text-xs">{framework.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={loading && selectedFramework === framework.id}
              >
                {loading && selectedFramework === framework.id ? 'Running...' : 'Run Audit'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{auditResult.framework} Audit Results</CardTitle>
                {getStatusBadge(auditResult.overall_status)}
              </div>
              <CardDescription>
                Conducted at {new Date(auditResult.audit_timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">
                    {Math.round(auditResult.compliance_score * 100)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Compliance Score</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">
                    {auditResult.compliant_requirements}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Compliant</p>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">
                    {auditResult.non_compliant_requirements}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Non-Compliant</p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-600">
                    {auditResult.total_requirements}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total Requirements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Requirement Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditResult.check_results.map((result: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold">{result.requirement_id}</h4>
                        <p className="text-sm text-gray-600">{result.details}</p>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>

                    {result.evidence && result.evidence.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Evidence:</p>
                        <ul className="text-xs space-y-1">
                          {result.evidence.map((ev: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-gray-400">•</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.recommendations && result.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Recommendations:</p>
                        <ul className="text-xs space-y-1">
                          {result.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="flex items-start gap-1 text-orange-700">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!auditResult && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Select a compliance framework above to run an audit
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

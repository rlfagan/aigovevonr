'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Shield, Building, Zap } from 'lucide-react'

interface Preset {
  preset_id: string
  name: string
  model_family: string
  provider: string
  security_level: string
  industry: string | null
  description: string
  recommended_for: string[]
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)

  useEffect(() => {
    fetchPresets()
  }, [])

  const fetchPresets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/guardrails/presets')
      if (response.ok) {
        const data = await response.json()
        setPresets(data)
      }
    } catch (err) {
      console.error('Error fetching presets:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPresetDetails = async (presetId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/guardrails/presets/${presetId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedPreset(data)
      }
    } catch (err) {
      console.error('Error fetching preset details:', err)
    }
  }

  const getSecurityLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      MAXIMUM: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      BALANCED: 'bg-blue-100 text-blue-800',
      PERMISSIVE: 'bg-green-100 text-green-800',
      DEVELOPMENT: 'bg-gray-100 text-gray-800'
    }
    return colors[level] || 'bg-gray-100 text-gray-800'
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-emerald-100 text-emerald-800',
      anthropic: 'bg-orange-100 text-orange-800',
      google: 'bg-blue-100 text-blue-800',
      azure: 'bg-cyan-100 text-cyan-800',
      local: 'bg-gray-100 text-gray-800',
      any: 'bg-purple-100 text-purple-800'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-blue-600" />
          Configuration Presets
        </h1>
        <p className="text-gray-600 mt-1">
          Model-agnostic presets for popular AI models and industries
        </p>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {presets.map((preset) => (
          <Card
            key={preset.preset_id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => fetchPresetDetails(preset.preset_id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{preset.name}</CardTitle>
                  <CardDescription className="mt-2">{preset.description}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={getSecurityLevelColor(preset.security_level)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {preset.security_level}
                </Badge>
                <Badge className={getProviderColor(preset.provider)}>
                  {preset.provider}
                </Badge>
                {preset.industry && (
                  <Badge variant="outline">
                    <Building className="h-3 w-3 mr-1" />
                    {preset.industry}
                  </Badge>
                )}
                <Badge variant="outline">
                  {preset.model_family}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Recommended for:</p>
                <ul className="text-xs space-y-1">
                  {preset.recommended_for.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preset Details Modal/Panel */}
      {selectedPreset && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedPreset.name}</CardTitle>
              <button
                onClick={() => setSelectedPreset(null)}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold mb-2">Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Risk Assessment</p>
                  <p className="font-medium">{selectedPreset.config.enable_risk_assessment ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Content Moderation</p>
                  <p className="font-medium">{selectedPreset.config.enable_content_moderation ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-gray-600">PII Detection</p>
                  <p className="font-medium">{selectedPreset.config.enable_pii_detection ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Jailbreak Protection</p>
                  <p className="font-medium">{selectedPreset.config.enable_jailbreak_detection ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Risk Threshold</p>
                  <p className="font-medium">{selectedPreset.config.risk_threshold}</p>
                </div>
                <div>
                  <p className="text-gray-600">Toxicity Threshold</p>
                  <p className="font-medium">{selectedPreset.config.toxicity_threshold}</p>
                </div>
              </div>
            </div>

            {selectedPreset.config.required_frameworks.length > 0 && (
              <div>
                <h3 className="font-bold mb-2">Compliance Frameworks</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPreset.config.required_frameworks.map((framework: string) => (
                    <Badge key={framework} variant="outline">{framework}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-bold mb-2">Recommended For</h3>
              <ul className="text-sm space-y-1">
                {selectedPreset.recommended_for.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-gray-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {presets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No presets available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

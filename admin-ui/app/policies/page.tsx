'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Upload, Save, AlertCircle, CheckCircle, Settings } from 'lucide-react'

interface PolicyTemplate {
  id: string
  name: string
  description: string
  useCase: string
  filename: string
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'blocklist',
    name: 'Complete Blocklist Policy',
    description: 'Comprehensive blocklist blocking ALL major AI services and models',
    useCase: 'Maximum security - blocks OpenAI, Anthropic, Google, Microsoft, Meta, and 100+ AI services',
    filename: 'ai_policy_blocklist.rego'
  },
  {
    id: 'strict',
    name: 'Strict Policy',
    description: 'Blocks most AI services except approved enterprise solutions',
    useCase: 'High-security organizations, financial services, healthcare',
    filename: '01_strict_policy.rego'
  },
  {
    id: 'balanced',
    name: 'Balanced Policy',
    description: 'Allows approved services with monitoring and PII protection',
    useCase: 'Most enterprises, balanced security and productivity',
    filename: '02_balanced_policy.rego'
  },
  {
    id: 'permissive',
    name: 'Permissive Policy',
    description: 'Allows most AI services with monitoring, blocks only high-risk',
    useCase: 'Startups, creative agencies, research organizations',
    filename: '03_permissive_policy.rego'
  },
  {
    id: 'department',
    name: 'Department-Based Policy',
    description: 'Different rules per department',
    useCase: 'Large organizations with different department needs',
    filename: '04_department_based_policy.rego'
  }
]

export default function PoliciesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [policyContent, setPolicyContent] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [currentPolicy, setCurrentPolicy] = useState<any>(null)
  const [activateLoading, setActivateLoading] = useState(false)

  useEffect(() => {
    loadCurrentPolicy()
  }, [])

  const loadCurrentPolicy = async () => {
    try {
      // Fetch active policy from API
      const response = await fetch('http://localhost:8002/api/policy/active')
      if (response.ok) {
        const data = await response.json()
        setCurrentPolicy({
          name: data.config.policy_name + ' (Active)',
          filename: data.config.policy_file,
          lastModified: data.config.activated_at,
          modifiedBy: data.config.activated_by
        })
        // Set selected template to match active policy
        const template = POLICY_TEMPLATES.find(t => t.filename === data.config.policy_file)
        if (template) {
          setSelectedTemplate(template.id)
        }
        setPolicyContent(data.content)
      } else {
        // Fallback to mock
        setCurrentPolicy({
          name: 'Balanced Policy (Active)',
          filename: '02_balanced_policy.rego',
          lastModified: new Date().toISOString(),
          modifiedBy: 'admin@company.com'
        })
        setSelectedTemplate('balanced')
      }
    } catch (error) {
      console.error('Failed to load policy:', error)
      // Fallback to mock
      setCurrentPolicy({
        name: 'Balanced Policy (Active)',
        filename: '02_balanced_policy.rego',
        lastModified: new Date().toISOString(),
        modifiedBy: 'admin@company.com'
      })
      setSelectedTemplate('balanced')
    }
  }

  const loadTemplate = async (templateId: string) => {
    const template = POLICY_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    try {
      // Load from API
      const response = await fetch(`http://localhost:8002/api/policy/template/${template.filename}`)
      if (response.ok) {
        const data = await response.json()
        setPolicyContent(data.content)
        setSelectedTemplate(templateId)
        setIsEditing(true)
        return
      }

      // Fallback
      const mockContent = `# ${template.name}
# Use Case: ${template.useCase}
# Description: ${template.description}

package ai_governance

import future.keywords.if

default allow := false
default decision := "DENY"

# Unable to load policy file from API
# Please ensure the backend is running

allow if {
    input.resource_url
    # Define your conditions
}

decision := "ALLOW" if allow
decision := "DENY" if not allow`

      setPolicyContent(mockContent)
      setSelectedTemplate(templateId)
      setIsEditing(true)
    } catch (error) {
      console.error('Failed to load template:', error)
      alert('Failed to load policy template. Make sure the backend API is running.')
    }
  }

  const savePolicy = async () => {
    setSaveStatus('saving')
    try {
      // In production, save to API
      // await fetch('http://localhost:8002/api/policies', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ content: policyContent })
      // })

      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate save
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save policy:', error)
      setSaveStatus('error')
    }
  }

  const activatePolicy = async () => {
    const template = POLICY_TEMPLATES.find(t => t.id === selectedTemplate)
    if (!template) return

    setActivateLoading(true)
    try {
      const response = await fetch('http://localhost:8002/api/policy/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_name: template.name,
          policy_file: template.filename,
          activated_by: 'admin@company.com' // Get from auth context
        })
      })

      if (response.ok) {
        alert(`✅ Policy "${template.name}" is now active!\n\nAll users will now use this policy.`)
        loadCurrentPolicy() // Reload to show new active policy
      } else {
        throw new Error('Failed to activate policy')
      }
    } catch (error) {
      console.error('Failed to activate policy:', error)
      alert('❌ Failed to activate policy. Check console for details.')
    } finally {
      setActivateLoading(false)
    }
  }

  const downloadPolicy = () => {
    const blob = new Blob([policyContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai_governance_policy.rego'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy Management</h1>
          <p className="text-gray-600">Configure AI governance policies for your organization</p>
        </div>

        {/* Current Policy Status */}
        {currentPolicy && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{currentPolicy.name}</h3>
                  <p className="text-sm text-gray-500">
                    Last modified: {new Date(currentPolicy.lastModified).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">By: {currentPolicy.modifiedBy}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Policy
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy Templates */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Policy Templates
              </h2>
              <div className="space-y-3">
                {POLICY_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => loadTemplate(template.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                    <div className="text-xs text-gray-500 italic">{template.useCase}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4" />
                    Upload Custom Policy
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    Export Current Policy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Editor */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Policy Editor</h2>
                  <div className="flex items-center gap-2">
                    {saveStatus === 'success' && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Saved successfully
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Save failed
                      </span>
                    )}
                    <button
                      onClick={downloadPolicy}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={savePolicy}
                      disabled={saveStatus === 'saving'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Policy'}
                    </button>
                    <button
                      onClick={activatePolicy}
                      disabled={activateLoading || !selectedTemplate}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {activateLoading ? 'Activating...' : 'Activate Policy'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={policyContent}
                  onChange={(e) => setPolicyContent(e.target.value)}
                  className="w-full h-[600px] font-mono text-sm border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Select a template or write your custom policy..."
                />
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Policy Syntax Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use OPA Rego syntax</li>
                    <li>• Test your policy before deploying</li>
                    <li>• Add comments to explain complex rules</li>
                    <li>• Define clear reasons for deny decisions</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Policy Selected</h3>
                <p className="text-gray-600 mb-6">
                  Select a policy template from the left sidebar or edit the current policy
                </p>
                <button
                  onClick={() => loadTemplate('balanced')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Load Balanced Policy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

# Strict AI Governance Policy
# Use Case: High-security organizations, financial services, healthcare
# Description: Blocks most AI services except approved enterprise solutions

package ai_governance

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false
default decision := "DENY"

# Approved services only
approved_services := {
    "claude.ai",
    "chatgpt.com",
    "copilot.microsoft.com"
}

# Prohibited services - always block
prohibited_services := {
    "character.ai",
    "replika.com",
    "chai-research.com",
    "beta.character.ai"
}

# Restricted departments
restricted_departments := {
    "finance",
    "legal",
    "hr",
    "compliance"
}

# Allow if service is approved and user has training
allow if {
    input.resource_url
    some service in approved_services
    contains(input.resource_url, service)
    input.user_attributes.ai_training_completed == true
    not input.user_attributes.department in restricted_departments
}

# Decision logic
decision := "ALLOW" if allow
decision := "DENY" if not allow

# Reason for denial
reason := "Service not in approved list" if {
    not allow
    input.resource_url
    not any_approved_service
}

reason := "User training not completed" if {
    not allow
    any_approved_service
    input.user_attributes.ai_training_completed != true
}

reason := "Department not authorized" if {
    not allow
    input.user_attributes.department in restricted_departments
}

reason := "Service is prohibited" if {
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
}

any_approved_service if {
    some service in approved_services
    contains(input.resource_url, service)
}

# Risk score
risk_score := 90 if {
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
}

risk_score := 30 if allow
risk_score := 60 if not allow

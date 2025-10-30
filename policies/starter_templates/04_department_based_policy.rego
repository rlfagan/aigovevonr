# Department-Based AI Governance Policy
# Use Case: Large organizations with different department needs
# Description: Different rules per department

package ai_governance

import future.keywords.if
import future.keywords.in

default allow := false
default decision := "DENY"

# Engineering department - full access to code tools
engineering_services := {
    "chatgpt.com",
    "claude.ai",
    "copilot.github.com",
    "tabnine.com",
    "codeium.com",
    "cursor.sh",
    "perplexity.ai",
    "stackoverflow.com"
}

# Marketing department - content and design tools
marketing_services := {
    "chatgpt.com",
    "claude.ai",
    "jasper.ai",
    "copy.ai",
    "writesonic.com",
    "canva.com",
    "midjourney.com",
    "grammarly.com"
}

# Sales department - limited AI for productivity
sales_services := {
    "chatgpt.com",
    "claude.ai",
    "grammarly.com",
    "otter.ai",
    "fireflies.ai"
}

# Finance/Legal/HR - restricted access
restricted_services := {
    "chatgpt.com",
    "claude.ai",
    "grammarly.com"
}

# Always prohibited
prohibited_services := {
    "character.ai",
    "replika.com"
}

# Engineering rules
allow if {
    input.user_attributes.department == "engineering"
    input.resource_url
    some service in engineering_services
    contains(input.resource_url, service)
}

# Marketing rules
allow if {
    input.user_attributes.department == "marketing"
    input.resource_url
    some service in marketing_services
    contains(input.resource_url, service)
}

# Sales rules
allow if {
    input.user_attributes.department == "sales"
    input.resource_url
    some service in sales_services
    contains(input.resource_url, service)
}

# Finance/Legal/HR rules
allow if {
    input.user_attributes.department in {"finance", "legal", "hr"}
    input.resource_url
    some service in restricted_services
    contains(input.resource_url, service)
    input.user_attributes.ai_training_completed == true
}

# Block prohibited for everyone
allow := false if {
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
}

# Decision
decision := "ALLOW" if allow
decision := "DENY" if not allow

# Reason
reason := sprintf("Approved for %s department", [input.user_attributes.department]) if allow

reason := "Service not approved for your department - contact IT" if {
    not allow
    not any_prohibited
}

reason := "Service is prohibited company-wide" if {
    not allow
    any_prohibited
}

reason := "Training required for your department" if {
    not allow
    input.user_attributes.department in {"finance", "legal", "hr"}
    input.user_attributes.ai_training_completed != true
}

any_prohibited if {
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
}

# Risk score
risk_score := 90 if any_prohibited
risk_score := 20 if allow
risk_score := 50 if not allow

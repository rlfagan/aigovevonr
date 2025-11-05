# Permissive AI Governance Policy
# Use Case: Startups, creative agencies, research organizations
# Description: Allows most AI services with monitoring, blocks only high-risk

package ai_governance

import future.keywords.if
import future.keywords.in

# Default allow - monitor everything
default allow := true
default decision := "ALLOW"

# Only block these high-risk services
prohibited_services := {
    "character.ai",
    "replika.com",
    "chai-research.com"
}

# Services to monitor closely (but allow)
monitor_closely := {
    "midjourney.com",
    "stability.ai",
    "runway.ml",
    "synthesia.io"
}

# Deny only prohibited services
allow := false if {
    input.resource.url
    some service in prohibited_services
    contains(input.resource.url, service)
}

# Decision
decision := "ALLOW" if allow
decision := "DENY" if not allow

# Reason
reason := "Approved with monitoring" if {
    allow
    input.resource.url
    some service in monitor_closely
    contains(input.resource.url, service)
}

reason := "Service approved for use" if {
    allow
    not any_monitor_closely
}

reason := "Service prohibited - companion/roleplay AI not allowed" if {
    not allow
    input.resource.url
    some service in prohibited_services
    contains(input.resource.url, service)
}

any_monitor_closely if {
    input.resource.url
    some service in monitor_closely
    contains(input.resource.url, service)
}

# Risk score
risk_score := 90 if not allow
risk_score := 40 if any_monitor_closely
risk_score := 10 if allow

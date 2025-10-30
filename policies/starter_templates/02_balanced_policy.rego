# Balanced AI Governance Policy
# Use Case: Most enterprises, balanced security and productivity
# Description: Allows approved services with monitoring and PII protection
# Features: Admin override support

package ai_governance

import future.keywords.if
import future.keywords.in

# Default allow with monitoring
default allow := true
default decision := "ALLOW"

# Approved services for all users (expanded list)
general_approved_services := {
    # Chat & Conversational AI
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "perplexity.ai",
    "you.com",
    "poe.com",

    # Code Assistance
    "copilot.github.com",
    "github.com/features/copilot",
    "tabnine.com",
    "codeium.com",

    # Productivity & Business
    "notion.ai",
    "notion.so",
    "otter.ai",
    "fireflies.ai",
    "grammarly.com",
    "quillbot.com",
    "wordtune.com",

    # Design Tools
    "canva.com",
    "remove.bg",
    "cleanup.pictures"
}

# Prohibited services - always block (unless admin override)
prohibited_services := {
    # Companion/Roleplay AI
    "character.ai",
    "replika.com",
    "chai-research.com",

    # Unrestricted Chat
    "forefront.ai",
    "quora.com/poe",

    # High-risk services
    "blackbox.ai",
    "aider.chat"
}

# Services requiring approval
approval_required_services := {
    # Image Generation
    "midjourney.com",
    "stability.ai",
    "stablediffusionweb.com",
    "dall-e.com",
    "craiyon.com",
    "leonardo.ai",
    "ideogram.ai",

    # Content/Writing
    "jasper.ai",
    "copy.ai",
    "writesonic.com",
    "rytr.me",
    "contentbot.ai",

    # Video/Animation
    "runway.ml",
    "runwayml.com",
    "synthesia.io",
    "pictory.ai",
    "heygen.com",

    # Voice/Audio
    "elevenlabs.io",
    "murf.ai",
    "play.ht",
    "descript.com",

    # Research/Analysis
    "consensus.app",
    "elicit.org",
    "scite.ai",
    "chatpdf.com"
}

# Admin override rules (dynamically loaded)
admin_overrides := data.overrides.allowed_services

# Check if service has admin override
has_admin_override(url) if {
    some override in admin_overrides
    contains(url, override.domain)
    override.active == true
}

# Allow general approved services
allow if {
    input.resource_url
    some service in general_approved_services
    contains(input.resource_url, service)
}

# Allow if admin has created an override for this service
allow if {
    input.resource_url
    has_admin_override(input.resource_url)
}

# Deny prohibited services (unless admin override)
allow := false if {
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
    not has_admin_override(input.resource_url)
}

# Allow services requiring approval if user has it or admin override
allow if {
    input.resource_url
    some service in approval_required_services
    contains(input.resource_url, service)
    input.user_attributes.approved_services[service] == true
}

allow if {
    input.resource_url
    some service in approval_required_services
    contains(input.resource_url, service)
    has_admin_override(input.resource_url)
}

# Decision
decision := "ALLOW" if allow
decision := "DENY" if not allow

# Reason
reason := "Service approved for your role" if {
    allow
    input.resource_url
    some service in general_approved_services
    contains(input.resource_url, service)
}

reason := "Approved by administrator override" if {
    allow
    input.resource_url
    has_admin_override(input.resource_url)
}

reason := "Service is prohibited by policy" if {
    not allow
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
}

reason := "Service requires manager approval" if {
    not allow
    input.resource_url
    some service in approval_required_services
    contains(input.resource_url, service)
}

reason := "Service not in approved list - contact IT" if {
    not allow
    not any_prohibited
    not any_approval_required
}

any_prohibited if {
    input.resource_url
    some service in prohibited_services
    contains(input.resource_url, service)
}

any_approval_required if {
    input.resource_url
    some service in approval_required_services
    contains(input.resource_url, service)
}

# Risk score
risk_score := 90 if any_prohibited
risk_score := 50 if any_approval_required
risk_score := 20 if allow
risk_score := 10 if has_admin_override(input.resource_url)
risk_score := 40 if not allow

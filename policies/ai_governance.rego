# AI Governance Policy - Open Source MVP
# This policy enforces basic AI service governance rules

package aigovernance

import future.keywords.if
import future.keywords.in

# Default deny - fail secure
default allow := false
default deny := false
default review := false

# Blocked AI services (add unapproved services here)
blocked_services := [
    "character.ai",
    "replika.com",
    "janitor.ai",
    "crushon.ai"
]

# Approved AI services (add your approved list here)
approved_services := {
    "chatgpt.com": {
        "name": "ChatGPT",
        "vendor": "OpenAI",
        "requires_training": true,
        "approved_departments": ["engineering", "marketing", "product"]
    },
    "claude.ai": {
        "name": "Claude",
        "vendor": "Anthropic",
        "requires_training": true,
        "approved_departments": ["engineering", "research"]
    },
    "gemini.google.com": {
        "name": "Gemini",
        "vendor": "Google",
        "requires_training": true,
        "approved_departments": ["engineering", "research"]
    }
}

# PII patterns to detect (simple regex patterns)
pii_patterns := [
    "\\d{3}-\\d{2}-\\d{4}",  # SSN
    "\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}",  # Credit card
    "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"  # Email
]

# DENY RULES - Highest priority

# Rule 1: Block explicitly prohibited services
deny if {
    is_blocked_service
}

is_blocked_service if {
    some blocked_domain in blocked_services
    contains(lower(input.resource.url), blocked_domain)
}

# Rule 2: Block if PII detected in content
deny if {
    has_pii_content
}

has_pii_content if {
    input.content
    count(input.content) > 0
    contains_pii(input.content)
}

# Rule 3: Block if proprietary code markers detected
deny if {
    has_proprietary_markers
}

has_proprietary_markers if {
    input.content
    regex.match("@proprietary|CONFIDENTIAL|INTERNAL ONLY", input.content)
}

# Rule 4: Block if from unapproved source
deny if {
    input.context.source == "unknown"
}

# REVIEW RULES - Medium priority

# Rule 5: Require review for high-risk actions
review if {
    input.action == "upload_file"
    not input.resource.approved_file_type
}

# Rule 6: Require review for new AI services
review if {
    is_new_service
}

is_new_service if {
    not is_approved_service
    not is_blocked_service
}

# ALLOW RULES - Lowest priority

# Rule 7: Allow approved services with proper authorization
allow if {
    not deny  # No deny rules triggered
    not review  # No review required
    is_approved_service
    user_authorized
    user_trained
}

is_approved_service if {
    service_domain := extract_domain(input.resource.url)
    approved_services[service_domain]
}

user_authorized if {
    service_domain := extract_domain(input.resource.url)
    service_config := approved_services[service_domain]

    # Check if user's department is approved for this service
    input.user.department in service_config.approved_departments
}

user_trained if {
    service_domain := extract_domain(input.resource.url)
    service_config := approved_services[service_domain]

    # If training not required, pass
    not service_config.requires_training
}

user_trained if {
    # If training completed, pass
    input.user.training_completed == true
}

# HELPER FUNCTIONS

# Extract domain from URL
extract_domain(url) := domain if {
    # Simple domain extraction (works for most cases)
    parts := split(url, "/")
    count(parts) > 2
    domain := parts[2]
}

extract_domain(url) := url if {
    # Fallback if URL doesn't have protocol
    not contains(url, "/")
}

# Check if content contains PII (simplified)
contains_pii(content) if {
    # Check for SSN pattern
    regex.match("\\d{3}-\\d{2}-\\d{4}", content)
}

contains_pii(content) if {
    # Check for credit card pattern
    regex.match("\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}", content)
}

# DECISION OUTPUT

decision := "ALLOW" if allow
decision := "DENY" if deny
decision := "REVIEW" if review

reason := "Access granted - approved service and user authorized" if allow

reason := "Access denied - service is prohibited" if {
    deny
    is_blocked_service
}

reason := "Access denied - PII detected in content" if {
    deny
    has_pii_content
}

reason := "Access denied - proprietary content markers detected" if {
    deny
    has_proprietary_markers
}

reason := "Manual review required - new AI service detected" if {
    review
    is_new_service
}

reason := "Access denied - default deny" if {
    not allow
    not deny
    not review
}

# Risk score (0-100, higher = riskier)
risk_score := score if {
    factors := [
        pii_risk,
        service_risk,
        user_risk
    ]
    score := sum(factors)
}

pii_risk := 40 if has_pii_content else := 0
service_risk := 30 if is_blocked_service else := 10 if not is_approved_service else := 0
user_risk := 20 if not user_trained else := 0

# Matched policies list
matched_policies := policies if {
    policies := [
        {"id": "blocked-services", "matched": is_blocked_service, "priority": 1000},
        {"id": "pii-protection", "matched": has_pii_content, "priority": 950},
        {"id": "proprietary-protection", "matched": has_proprietary_markers, "priority": 900},
        {"id": "approved-services", "matched": is_approved_service, "priority": 500},
        {"id": "user-training", "matched": user_trained, "priority": 400}
    ]
}

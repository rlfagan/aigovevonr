package ai_governance

# -----------------------------------------------------------------------------
# COMPLETE BLOCKLIST POLICY - MAXIMUM SECURITY
# -----------------------------------------------------------------------------
# This policy blocks ALL major AI services and models
# Use Case: Maximum security - financial services, healthcare, high-security orgs
# -----------------------------------------------------------------------------
# Blocks outbound calls, plugin usage, or authentication attempts
# to any AI/ML service listed in the denylist arrays.
# -----------------------------------------------------------------------------

import future.keywords.if
import future.keywords.in

# Default DENY - block everything not explicitly allowed
default allow := false
default decision := "DENY"

# Check if URL contains any blocked domain
url_contains_blocked_domain if {
    some svc in denylist
    contains(lower(input.resource_url), svc)
}

# Check if model ID is blocked (if provided)
model_is_blocked if {
    input.model
    input.model.id
    some model in model_denylist
    contains(lower(input.model.id), model)
}

# DENY if URL matches any blocked service
allow := false if url_contains_blocked_domain

# DENY if model is blocked
allow := false if model_is_blocked

# Decision logic
decision := "ALLOW" if allow
decision := "DENY" if not allow

# Reason for blocking
reason := sprintf("Blocked AI service - domain matches denylist: %v", [input.resource_url]) if {
    not allow
    url_contains_blocked_domain
    not model_is_blocked
}

reason := sprintf("Blocked AI model: %v", [input.model.id]) if {
    not allow
    model_is_blocked
}

reason := "Service blocked by comprehensive AI blocklist policy" if {
    not allow
    not url_contains_blocked_domain
    not model_is_blocked
}

# Very high risk score for all blocked items
risk_score := 95

# -----------------------------------------------------------------------------
# DOMAIN-BASED DENYLIST (AI SaaS, APIs, Browsers, IDEs)
# -----------------------------------------------------------------------------
denylist := [
  # OpenAI ecosystem
  "openai.com",
  "api.openai.com",
  "chat.openai.com",
  "cdn.openai.com",
  "platform.openai.com",
  "labs.openai.com",

  # Anthropic (Claude)
  "anthropic.com",
  "api.anthropic.com",
  "claude.ai",

  # Google AI (Gemini / Bard / Vertex)
  "gemini.google.com",
  "bard.google.com",
  "makersuite.google.com",
  "vertexai.googleapis.com",
  "ai.google.dev",

  # Microsoft (Copilot / Azure OpenAI)
  "copilot.microsoft.com",
  "copilot.office.com",
  "bing.com",
  "openai.azure.com",
  "azure.openai.azure.com",
  "githubcopilot.com",
  "copilot.github.com",

  # Amazon (Bedrock / CodeWhisperer)
  "bedrock.aws.amazon.com",
  "codewhisperer.aws.amazon.com",
  "a2i.aws.amazon.com",

  # Meta
  "meta.ai",
  "llama.meta.com",
  "api.meta.ai",
  "facebook.ai",

  # Perplexity
  "perplexity.ai",
  "api.perplexity.ai",

  # Hugging Face
  "huggingface.co",
  "api-inference.huggingface.co",
  "hf.space",

  # Stability.ai
  "stability.ai",
  "api.stability.ai",

  # Midjourney / DALL-E / Image Gen
  "midjourney.com",
  "dalle.ai",
  "dalle.openai.com",
  "craiyon.com",
  "runwayml.com",
  "firefly.adobe.com",
  "ideogram.ai",

  # Replit / Code tools
  "replit.com",
  "codesnippets.ai",
  "blackbox.ai",
  "cursor.sh",
  "aider.chat",

  # AI productivity tools
  "notion.ai",
  "slack.ai",
  "chatgptwrapper.slack.com",
  "jasper.ai",
  "copy.ai",
  "writesonic.com",
  "copygenius.io",
  "grammarly.com",
  "quillbot.com",

  # AI search / browsing
  "you.com",
  "phind.com",
  "microsoftbing.ai",
  "arc.net",
  "brave.com/ai",
  "neeva.com",
  "andisearch.com",
  "chatpdf.com",
  "askyourpdf.com",
  "humata.ai",

  # Voice / Audio / Transcription AI
  "openai-whisper.com",
  "assemblyai.com",
  "deepgram.com",
  "rev.ai",
  "descript.com",

  # Video / Animation / Generation
  "pika.art",
  "runwayml.com",
  "synthesia.io",
  "heygen.com",
  "sora.openai.com",

  # Image & Vision AI APIs
  "replicate.com",
  "api.replicate.com",
  "clarifai.com",
  "leapml.dev",
  "imagine.art",

  # Unknown / generic GenAI catch-all
  "genai.io",
  "ai.com",
  "chatgpt.com",
  "promptperfect.ai",
  "promptify.ai",
  "promptbase.com",
  "flowgpt.com",
  "superprompt.ai",
  "poe.com",
  "forefront.ai",
  "quora.com/poe"
]

# -----------------------------------------------------------------------------
# MODEL-BASED DENYLIST (identifiers, SDKs, vendor tags)
# -----------------------------------------------------------------------------
model_denylist := [
  # OpenAI
  "gpt-3",
  "gpt-3.5",
  "gpt-4",
  "gpt-4o",
  "text-davinci-003",
  "whisper-1",
  "dall-e-3",

  # Anthropic
  "claude-1",
  "claude-2",
  "claude-3",
  "claude-instant",

  # Google
  "gemini-1",
  "gemini-1.5-pro",
  "palm-2",
  "text-bison",
  "chat-bison",

  # Meta
  "llama-2",
  "llama-3",
  "code-llama",

  # Stability / SDXL
  "stable-diffusion",
  "stable-diffusion-xl",
  "sdxl",
  "sd-turbo",

  # Amazon
  "titan-text",
  "titan-embed",
  "titan-image",

  # Mistral / Mixtral
  "mistral-7b",
  "mixtral-8x7b",
  "codestral",

  # Miscellaneous
  "command-r",
  "command-r-plus",
  "reka-core",
  "cohere-command",
  "ai21-j2",
  "jurassic-2",
  "perplexity-large",
  "sonnet",
  "opus",
  "haiku"
]

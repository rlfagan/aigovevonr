"""
Policy Management API
Handles active policy selection and persistence
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json
from datetime import datetime

router = APIRouter()

# Path to store active policy configuration
ACTIVE_POLICY_FILE = Path("/app/data/active_policy.json")
POLICIES_DIR = Path("/policies")

class PolicyConfig(BaseModel):
    policy_name: str
    policy_file: str
    activated_by: str
    activated_at: str = None

class PolicyOverride(BaseModel):
    domain: str
    service: str
    reason: str
    created_by: str
    active: bool = True

# Ensure data directory exists
ACTIVE_POLICY_FILE.parent.mkdir(parents=True, exist_ok=True)

def get_active_policy() -> PolicyConfig:
    """Load the currently active policy configuration"""
    if ACTIVE_POLICY_FILE.exists():
        with open(ACTIVE_POLICY_FILE, 'r') as f:
            data = json.load(f)
            return PolicyConfig(**data)
    else:
        # Default to balanced policy
        return PolicyConfig(
            policy_name="Balanced Policy",
            policy_file="02_balanced_policy.rego",
            activated_by="system",
            activated_at=datetime.now().isoformat()
        )

def save_active_policy(config: PolicyConfig):
    """Save the active policy configuration"""
    with open(ACTIVE_POLICY_FILE, 'w') as f:
        json.dump(config.dict(), f, indent=2)

@router.get("/api/policy/active")
async def get_current_policy():
    """Get the currently active policy"""
    config = get_active_policy()

    # Read the policy file content
    policy_path = POLICIES_DIR / "starter_templates" / config.policy_file

    # Try main policies directory first
    if not policy_path.exists():
        policy_path = POLICIES_DIR / config.policy_file

    policy_content = ""
    if policy_path.exists():
        with open(policy_path, 'r') as f:
            policy_content = f.read()

    return {
        "config": config,
        "content": policy_content,
        "status": "active"
    }

@router.post("/api/policy/activate")
async def activate_policy(config: PolicyConfig):
    """Set a policy as the active policy"""

    # Validate policy file exists
    policy_path = POLICIES_DIR / "starter_templates" / config.policy_file

    if not policy_path.exists():
        policy_path = POLICIES_DIR / config.policy_file

    if not policy_path.exists():
        raise HTTPException(status_code=404, detail=f"Policy file not found: {config.policy_file}")

    # Set activation time
    config.activated_at = datetime.now().isoformat()

    # Save configuration
    save_active_policy(config)

    # TODO: Reload OPA with new policy
    # This would trigger OPA to reload the policy bundle

    return {
        "message": f"Policy '{config.policy_name}' activated successfully",
        "config": config
    }

@router.get("/api/policy/templates")
async def list_policy_templates():
    """List all available policy templates"""
    templates = []

    templates_dir = POLICIES_DIR / "starter_templates"
    if templates_dir.exists():
        for policy_file in templates_dir.glob("*.rego"):
            # Read first few lines to get metadata
            with open(policy_file, 'r') as f:
                lines = f.readlines()[:10]
                full_content = policy_file.read_text()
                name = "Unknown Policy"
                use_case = ""
                description = ""

                for line in lines:
                    if line.startswith("# ") and "Policy" in line and name == "Unknown Policy":
                        name = line.replace("#", "").strip()
                    elif "Use Case:" in line:
                        use_case = line.split("Use Case:")[1].strip()
                    elif "Description:" in line:
                        description = line.split("Description:")[1].strip()

            templates.append({
                "filename": policy_file.name,
                "name": name,
                "use_case": use_case,
                "description": description,
                "content": full_content
            })

    # Also check main policies directory
    if POLICIES_DIR.exists():
        for policy_file in POLICIES_DIR.glob("*.rego"):
            full_content = policy_file.read_text()
            templates.append({
                "filename": policy_file.name,
                "name": policy_file.stem.replace("_", " ").title(),
                "use_case": "Custom Policy",
                "description": "User-defined policy",
                "content": full_content
            })

    return {"templates": templates}

@router.get("/api/policy/template/{filename}")
async def get_policy_template(filename: str):
    """Get a specific policy template content"""
    # Check starter templates first
    policy_path = POLICIES_DIR / "starter_templates" / filename

    if not policy_path.exists():
        # Check main policies directory
        policy_path = POLICIES_DIR / filename

    if not policy_path.exists():
        raise HTTPException(status_code=404, detail=f"Policy template not found: {filename}")

    content = policy_path.read_text()
    return {
        "filename": filename,
        "content": content
    }

@router.post("/api/overrides")
async def create_override(override: PolicyOverride):
    """Create an admin override to allow a blocked service"""

    # Path to store overrides
    overrides_file = Path("/app/data/overrides.json")

    # Load existing overrides
    if overrides_file.exists():
        with open(overrides_file, 'r') as f:
            overrides = json.load(f)
    else:
        overrides = {"allowed_services": []}

    # Add new override
    overrides["allowed_services"].append({
        "domain": override.domain,
        "service": override.service,
        "reason": override.reason,
        "created_by": override.created_by,
        "created_at": datetime.now().isoformat(),
        "active": override.active
    })

    # Save overrides
    with open(overrides_file, 'w') as f:
        json.dump(overrides, f, indent=2)

    # TODO: Push to OPA as data
    # curl -X PUT http://opa:8181/v1/data/overrides -d @overrides.json

    return {
        "message": f"Override created for {override.domain}",
        "override": override
    }

@router.get("/api/overrides")
async def list_overrides():
    """List all active admin overrides"""

    overrides_file = Path("/app/data/overrides.json")

    if overrides_file.exists():
        with open(overrides_file, 'r') as f:
            overrides = json.load(f)
        return overrides
    else:
        return {"allowed_services": []}

@router.delete("/api/overrides/{domain}")
async def remove_override(domain: str):
    """Remove an admin override"""

    overrides_file = Path("/app/data/overrides.json")

    if not overrides_file.exists():
        raise HTTPException(status_code=404, detail="No overrides found")

    with open(overrides_file, 'r') as f:
        overrides = json.load(f)

    # Filter out the override
    overrides["allowed_services"] = [
        o for o in overrides["allowed_services"]
        if o["domain"] != domain
    ]

    # Save
    with open(overrides_file, 'w') as f:
        json.dump(overrides, f, indent=2)

    return {"message": f"Override removed for {domain}"}

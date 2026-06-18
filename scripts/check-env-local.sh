#!/usr/bin/env bash
# Read and validate Supabase (and related) vars from .env.local.
# Usage: ./scripts/check-env-local.sh [.env.local] [--container]
set -euo pipefail

ENV_FILE=".env.local"
CHECK_CONTAINER=false

for arg in "$@"; do
  case "$arg" in
    --container) CHECK_CONTAINER=true ;;
    *) ENV_FILE="$arg" ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  echo "Copy env.local.example → .env.local and fill in Supabase keys." >&2
  exit 1
fi

# Read KEY=value (first match only; strip optional quotes)
read_env() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | head -1 || true)
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  local val="${line#*=}"
  val="${val#\"}"
  val="${val%\"}"
  val="${val#\'}"
  val="${val%\'}"
  printf '%s' "$val"
}

mask() {
  local v="$1"
  if [[ -z "$v" ]]; then
    echo "(empty)"
  elif [[ ${#v} -le 12 ]]; then
    echo "(set, ${#v} chars)"
  else
    echo "${v:0:8}…${v: -6} (${#v} chars)"
  fi
}

errors=0

check_var() {
  local name="$1"
  local val="$2"
  local kind="${3:-string}"

  if [[ -z "$val" ]]; then
    echo "✗ $name — missing or empty in $ENV_FILE"
    errors=$((errors + 1))
    return
  fi

  case "$kind" in
    supabase_url)
      if [[ ! "$val" =~ ^https://[a-z0-9-]+\.supabase\.co/?$ ]]; then
        echo "✗ $name — invalid format: $(mask "$val")"
        echo "  Expected: https://YOUR_PROJECT_REF.supabase.co"
        errors=$((errors + 1))
        return
      fi
      ;;
    jwt)
      if [[ ! "$val" =~ ^eyJ[A-Za-z0-9_-]+ ]]; then
        echo "✗ $name — should start with eyJ (JWT). Got: $(mask "$val")"
        echo "  Key may be truncated or pasted without the first characters."
        errors=$((errors + 1))
        return
      fi
      ;;
  esac

  echo "✓ $name — $(mask "$val")"
}

echo "=== Reading $ENV_FILE ==="
echo ""

SUPABASE_URL=$(read_env NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_ANON=$(read_env NEXT_PUBLIC_SUPABASE_ANON_KEY)
SUPABASE_SERVICE=$(read_env SUPABASE_SERVICE_ROLE_KEY)
APP_URL=$(read_env NEXT_PUBLIC_APP_URL)
NEXTAUTH_URL=$(read_env NEXTAUTH_URL)
NEXTAUTH_SECRET=$(read_env NEXTAUTH_SECRET)

CLICKIN360_ORG_USER_ID=$(read_env CLICKIN360_ORG_USER_ID)
WEBSITE_LEADS_USER_ID=$(read_env WEBSITE_LEADS_USER_ID)
ORG_USER_ID="${CLICKIN360_ORG_USER_ID:-$WEBSITE_LEADS_USER_ID}"
WEBCHAT_POLL_SECRET=$(read_env WEBCHAT_POLL_SECRET)
WEBSITE_LEADS_API_SECRET=$(read_env WEBSITE_LEADS_API_SECRET)
N8N_CRM_WEBHOOK_SECRET=$(read_env N8N_CRM_WEBHOOK_SECRET)
LEAD_API_SECRET="${WEBSITE_LEADS_API_SECRET:-$N8N_CRM_WEBHOOK_SECRET}"

IS_PROD=false
if [[ -n "$APP_URL" ]] && [[ "$APP_URL" != *localhost* ]]; then
  IS_PROD=true
fi

check_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL" supabase_url
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON" jwt
check_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE" jwt

if [[ -n "$APP_URL" ]]; then
  echo "✓ NEXT_PUBLIC_APP_URL — $(mask "$APP_URL")"
else
  echo "⚠ NEXT_PUBLIC_APP_URL — not set (Docker build defaults to http://localhost:3000)"
fi

if [[ -n "$ORG_USER_ID" ]]; then
  echo "✓ CLICKIN360_ORG_USER_ID — $(mask "$ORG_USER_ID")"
elif [[ "$IS_PROD" == true ]]; then
  echo "✗ CLICKIN360_ORG_USER_ID — missing (required since internal-tool hardening)"
  errors=$((errors + 1))
else
  echo "⚠ CLICKIN360_ORG_USER_ID — not set (CRM workspace resolution will fail)"
fi

if [[ -n "$LEAD_API_SECRET" ]]; then
  echo "✓ WEBSITE_LEADS_API_SECRET — $(mask "$LEAD_API_SECRET")"
elif [[ "$IS_PROD" == true ]]; then
  echo "✗ WEBSITE_LEADS_API_SECRET — missing (N8N + form lead ingress)"
  errors=$((errors + 1))
else
  echo "⚠ WEBSITE_LEADS_API_SECRET — not set"
fi

if [[ -n "$WEBCHAT_POLL_SECRET" ]]; then
  echo "✓ WEBCHAT_POLL_SECRET — $(mask "$WEBCHAT_POLL_SECRET")"
elif [[ "$IS_PROD" == true ]]; then
  echo "✗ WEBCHAT_POLL_SECRET — missing (webchat poll auth)"
  errors=$((errors + 1))
else
  echo "⚠ WEBCHAT_POLL_SECRET — not set"
fi

if [[ -n "$NEXTAUTH_SECRET" ]]; then
  echo "✓ NEXTAUTH_SECRET — $(mask "$NEXTAUTH_SECRET")"
else
  echo "✗ NEXTAUTH_SECRET — missing (CRM login will fail)"
  errors=$((errors + 1))
fi

MAILGUN_KEY=$(read_env MAILGUN_API_KEY)
MAILGUN_DOMAIN=$(read_env MAILGUN_DOMAIN)
MAILGUN_FROM=$(read_env MAILGUN_FROM)

if [[ -n "$MAILGUN_KEY" && -n "$MAILGUN_DOMAIN" && -n "$MAILGUN_FROM" ]]; then
  echo "✓ Mailgun — configured ($(mask "$MAILGUN_DOMAIN"))"
elif [[ "$IS_PROD" == true ]]; then
  echo "✗ Mailgun — required in production for password reset and invite emails"
  errors=$((errors + 1))
else
  echo "⚠ Mailgun — not set (local dev: copy invite/reset links manually)"
fi

echo ""
echo "=== Docker compose build args (from same file) ==="
echo "Run builds with:  docker compose --env-file $ENV_FILE build app"
echo ""

if [[ "$CHECK_CONTAINER" == true ]]; then
  CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^crm-app$' | head -1 || true)
  if [[ -z "$CONTAINER" ]]; then
    CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'crm-app' | head -1 || true)
  fi
  if [[ -z "$CONTAINER" ]]; then
    echo "=== Container ==="
    echo "⚠ No running crm-app container found (skip container check or start the stack)."
  else
    echo "=== Container: $CONTAINER ==="
    RUN_URL=$(docker exec "$CONTAINER" printenv NEXT_PUBLIC_SUPABASE_URL 2>/dev/null || true)
    RUN_ANON=$(docker exec "$CONTAINER" printenv NEXT_PUBLIC_SUPABASE_ANON_KEY 2>/dev/null || true)
    RUN_SERVICE=$(docker exec "$CONTAINER" printenv SUPABASE_SERVICE_ROLE_KEY 2>/dev/null || true)
    RUN_ORG=$(docker exec "$CONTAINER" printenv CLICKIN360_ORG_USER_ID 2>/dev/null || true)
    if [[ -z "$RUN_ORG" ]]; then
      RUN_ORG=$(docker exec "$CONTAINER" printenv WEBSITE_LEADS_USER_ID 2>/dev/null || true)
    fi

    if [[ -z "$RUN_URL" ]]; then
      echo "✗ NEXT_PUBLIC_SUPABASE_URL — empty inside container (rebuild + up with --env-file)"
      errors=$((errors + 1))
    elif [[ "$RUN_URL" == "$SUPABASE_URL" ]]; then
      echo "✓ NEXT_PUBLIC_SUPABASE_URL — matches file"
    else
      echo "⚠ NEXT_PUBLIC_SUPABASE_URL — container differs from file"
      echo "  file:      $(mask "$SUPABASE_URL")"
      echo "  container: $(mask "$RUN_URL")"
    fi

    if [[ -z "$RUN_ANON" ]]; then
      echo "✗ NEXT_PUBLIC_SUPABASE_ANON_KEY — empty inside container"
      errors=$((errors + 1))
    elif [[ "$RUN_ANON" == "$SUPABASE_ANON" ]]; then
      echo "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY — matches file"
    else
      echo "⚠ NEXT_PUBLIC_SUPABASE_ANON_KEY — container differs from file"
    fi

    if [[ -z "$RUN_SERVICE" ]]; then
      echo "✗ SUPABASE_SERVICE_ROLE_KEY — empty inside container"
      errors=$((errors + 1))
    elif [[ "$RUN_SERVICE" == "$SUPABASE_SERVICE" ]]; then
      echo "✓ SUPABASE_SERVICE_ROLE_KEY — matches file"
    else
      echo "⚠ SUPABASE_SERVICE_ROLE_KEY — container differs from file"
    fi

    if [[ -z "$RUN_ORG" ]]; then
      echo "✗ CLICKIN360_ORG_USER_ID — empty inside container"
      errors=$((errors + 1))
    elif [[ "$RUN_ORG" == "$ORG_USER_ID" ]]; then
      echo "✓ CLICKIN360_ORG_USER_ID — matches file"
    else
      echo "⚠ CLICKIN360_ORG_USER_ID — container differs from file"
    fi
  fi
  echo ""
fi

if [[ "$errors" -gt 0 ]]; then
  echo "Found $errors problem(s). Fix $ENV_FILE, then:"
  echo "  docker compose --env-file $ENV_FILE build app"
  echo "  docker compose --env-file $ENV_FILE up -d app"
  echo "  ./scripts/check-env-local.sh $ENV_FILE --container"
  exit 1
fi

echo "All required Supabase vars look good in $ENV_FILE."

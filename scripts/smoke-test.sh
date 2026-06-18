#!/bin/bash
# Smoke test pos-deploy.
# - Valida que o app responde em rotas criticas
# - Falha com exit code != 0 se algo essencial cair

set -e

BASE_URL="${BASE_URL:-https://avgestao.com.br}"
HEALTH_URL="${BASE_URL}/api/health"
LOGIN_URL="${BASE_URL}/login"
HOME_URL="${BASE_URL}/"

PASS=0
FAIL=0

check() {
  local label="$1"
  local url="$2"
  local expected_code="$3"

  local code
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 15 "$url" || echo "000")

  if [ "$code" = "$expected_code" ]; then
    echo "  OK   $label  ($code)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $label  (esperado $expected_code, recebido $code)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke test em ${BASE_URL}"
echo "----------------------------------------------------"

check "Health check"      "$HEALTH_URL" 200
check "Pagina de login"   "$LOGIN_URL"  200
check "Home (redirect)"   "$HOME_URL"   200

echo "----------------------------------------------------"
echo "Resultado: ${PASS} passou, ${FAIL} falhou"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

exit 0

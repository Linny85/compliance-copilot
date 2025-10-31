#!/bin/bash
# ============================================
# NORRLY Final Verification Script
# ============================================
# Führt alle 6 Abnahmetests durch und gibt
# eine strukturierte OK/FAIL-Übersicht aus.
# ============================================

set -e

# Farben für Ausgabe
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Supabase Konfiguration
SUPABASE_URL="${SUPABASE_URL:-https://eadjoqlyjxwqjfvukvqx.supabase.co}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set${NC}"
  echo ""
  echo "Usage:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
  echo "  ./scripts/norrly-verify.sh"
  exit 1
fi

# Zähler
PASSED=0
FAILED=0
TOTAL=6

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}     NORRLY SYSTEM VERIFICATION TEST SUITE${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Helper: API Call
call_helpbot() {
  local question="$1"
  local module="$2"
  local session_id="$3"
  local lang="${4:-de}"
  
  curl -s -X POST "${SUPABASE_URL}/functions/v1/helpbot-chat" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"question\":\"${question}\",\"lang\":\"${lang}\",\"module\":\"${module}\",\"session_id\":\"${session_id}\"}" \
    | jq -r '.answer // .message // .error // "ERROR: No response"'
}

# Helper: Keyword Check
check_keywords() {
  local answer="$1"
  shift
  local keywords=("$@")
  local missing=()
  
  for keyword in "${keywords[@]}"; do
    if ! echo "$answer" | grep -qi "$keyword"; then
      missing+=("$keyword")
    fi
  done
  
  if [ ${#missing[@]} -eq 0 ]; then
    return 0
  else
    echo "  ${RED}Missing keywords: ${missing[*]}${NC}"
    return 1
  fi
}

# Test Result Helper
test_result() {
  local test_name="$1"
  local result="$2"
  
  if [ "$result" == "PASS" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASSED++))
  else
    echo -e "  ${RED}❌ FAIL${NC}"
    ((FAILED++))
  fi
  echo ""
}

# ============================================
# TEST 1 – Plattform-Identität
# ============================================
echo -e "${BOLD}Test 1: Plattform-Identität${NC}"
echo "  Frage: Was ist der NIS2 AI Guard?"
echo ""

ANSWER=$(call_helpbot "Was ist der NIS2 AI Guard?" "global" "verify-001" "de")
echo "  Antwort: ${ANSWER:0:150}..."
echo ""

if check_keywords "$ANSWER" "SaaS-Plattform" "Norrland Innovate" "NORRLY" "Compliance"; then
  test_result "Test 1" "PASS"
else
  test_result "Test 1" "FAIL"
fi

# ============================================
# TEST 2 – Modul-Hinweis
# ============================================
echo -e "${BOLD}Test 2: Modul-Hinweis (Controls)${NC}"
echo "  Frage: Was mache ich im Modul Kontrollen?"
echo ""

ANSWER=$(call_helpbot "Was mache ich im Modul Kontrollen?" "controls" "verify-002" "de")
echo "  Antwort: ${ANSWER:0:150}..."
echo ""

# Check: Keine juristischen Begriffe, praktische Hinweise
if echo "$ANSWER" | grep -Eqi "(Artikel|Absatz|Gesetz|Richtlinie)" && ! echo "$ANSWER" | grep -qi "NIS2"; then
  echo "  ${YELLOW}⚠️  Juristische Begriffe gefunden (nicht erlaubt)${NC}"
  test_result "Test 2" "FAIL"
elif echo "$ANSWER" | grep -Eqi "(anlegen|dokumentier|status|prüf|nachweis)"; then
  test_result "Test 2" "PASS"
else
  echo "  ${YELLOW}⚠️  Keine praktischen App-Hinweise gefunden${NC}"
  test_result "Test 2" "FAIL"
fi

# ============================================
# TEST 3 – Memory (Teil 1)
# ============================================
echo -e "${BOLD}Test 3: Memory-Funktion (Teil 1)${NC}"
echo "  Frage: Wie dokumentiere ich eine Kontrolle?"
echo ""

ANSWER1=$(call_helpbot "Wie dokumentiere ich eine Kontrolle?" "controls" "verify-mem-01" "de")
echo "  Antwort: ${ANSWER1:0:150}..."
echo ""

if echo "$ANSWER1" | grep -Eqi "(dokument|nachweis|upload|hinzufüg)"; then
  echo -e "  ${GREEN}✅ Praktische Antwort erhalten${NC}"
else
  echo -e "  ${YELLOW}⚠️  Keine klare Dokumentationsanleitung${NC}"
fi
echo ""

# ============================================
# TEST 4 – Memory (Teil 2)
# ============================================
echo -e "${BOLD}Test 4: Memory-Funktion (Teil 2 – Kontextbezug)${NC}"
echo "  Frage: Und wie sehe ich später, ob sie noch gültig ist?"
echo ""

ANSWER2=$(call_helpbot "Und wie sehe ich später, ob sie noch gültig ist?" "controls" "verify-mem-01" "de")
echo "  Antwort: ${ANSWER2:0:150}..."
echo ""

# Check: Bezieht sich auf vorherige Antwort?
if echo "$ANSWER2" | grep -Eqi "(status|gültig|prüf|übersicht|dashboard|audit)"; then
  test_result "Test 3+4 (Memory)" "PASS"
else
  echo "  ${YELLOW}⚠️  Kein Kontextbezug zur vorherigen Frage${NC}"
  test_result "Test 3+4 (Memory)" "FAIL"
fi

# ============================================
# TEST 5 – Legal-Guard
# ============================================
echo -e "${BOLD}Test 5: Legal-Guard (Juristische Details nur auf Nachfrage)${NC}"
echo "  Frage: Welche Rechtsgrundlage gilt für Patch-Management in NIS2? Bitte mit Artikel."
echo ""

ANSWER=$(call_helpbot "Welche Rechtsgrundlage gilt für Patch-Management in NIS2? Bitte mit Artikel." "controls" "verify-003" "de")
echo "  Antwort: ${ANSWER:0:200}..."
echo ""

# Erlaubt: Artikel-Referenz + App-Hinweis
if echo "$ANSWER" | grep -Eqi "(Artikel|Art\.|21)" && echo "$ANSWER" | grep -Eqi "(dashboard|modul|system|plattform)"; then
  test_result "Test 5" "PASS"
elif echo "$ANSWER" | wc -w | awk '{if ($1 > 100) exit 1}'; then
  echo "  ${YELLOW}⚠️  Antwort zu ausführlich (>100 Wörter)${NC}"
  test_result "Test 5" "FAIL"
else
  test_result "Test 5" "PASS"
fi

# ============================================
# TEST 6 – Health-Check Function
# ============================================
echo -e "${BOLD}Test 6: Automatischer Health-Check${NC}"
echo "  Ruft helpbot-healthcheck auf..."
echo ""

HEALTH_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/helpbot-healthcheck" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.report // empty')

if [ -n "$HEALTH_RESULT" ]; then
  HEALTH_PASSED=$(echo "$HEALTH_RESULT" | jq -r '.passed // 0')
  HEALTH_TOTAL=$(echo "$HEALTH_RESULT" | jq -r '.total // 0')
  
  echo "  Health-Check Ergebnis: ${HEALTH_PASSED}/${HEALTH_TOTAL} Tests bestanden"
  echo ""
  
  if [ "$HEALTH_PASSED" -eq "$HEALTH_TOTAL" ] && [ "$HEALTH_TOTAL" -gt 0 ]; then
    test_result "Test 6" "PASS"
  else
    echo "  ${YELLOW}⚠️  Health-Check: Nicht alle Tests bestanden${NC}"
    test_result "Test 6" "FAIL"
  fi
else
  echo "  ${RED}⚠️  Health-Check konnte nicht ausgeführt werden${NC}"
  test_result "Test 6" "FAIL"
fi

# ============================================
# ZUSAMMENFASSUNG
# ============================================
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}     TESTERGEBNISSE${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ Alle Tests bestanden! ($PASSED/$TOTAL)${NC}"
  echo ""
  echo -e "${GREEN}NORRLY ist vollständig systembewusst und funktionssicher.${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}❌ ${FAILED} von ${TOTAL} Tests fehlgeschlagen${NC}"
  echo -e "${GREEN}${BOLD}✅ ${PASSED} Tests bestanden${NC}"
  echo ""
  echo -e "${YELLOW}Bitte überprüfen Sie die fehlgeschlagenen Tests und führen Sie${NC}"
  echo -e "${YELLOW}die Troubleshooting-Schritte aus der Dokumentation durch.${NC}"
  echo ""
  exit 1
fi

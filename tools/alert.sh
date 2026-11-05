#!/usr/bin/env bash
# Ouvre (ou complète) une issue GitHub « alerte » : GitHub l'envoie par e-mail au propriétaire du dépôt.
# Usage : tools/alert.sh "Titre" "Message"   (GH_TOKEN et GITHUB_REPOSITORY fournis par le workflow)
set -u
TITLE="$1"; BODY="$2"
gh label create alerte --color B60205 --description "Problème de publication de Diurna" --force >/dev/null 2>&1 || true
EXISTING=$(gh issue list --label alerte --state open --search "\"$TITLE\" in:title" --json number --jq '.[0].number' 2>/dev/null || true)
if [ -n "${EXISTING:-}" ]; then
  gh issue comment "$EXISTING" --body "$BODY"
else
  gh issue create --title "$TITLE" --body "$BODY" --label alerte
fi

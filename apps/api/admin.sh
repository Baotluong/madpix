#!/usr/bin/env bash
# Act on MadPix reports. The admin token lives in your macOS Keychain (see README, "Moderation").
#
#   ./admin.sh reports                 # newest reports, with each drawing's artists
#   ./admin.sh show <drawing-id>       # open the whole drawing as a picture
#   ./admin.sh delete <drawing-id>     # delete a drawing
#   ./admin.sh remove <player-id>      # remove a player: blank their strips, wipe their name and login
set -euo pipefail

API="${MADPIX_API:-https://madpix-api.fly.dev}"
TOKEN="$(security find-generic-password -s madpix-admin -w)"
auth=(-H "Authorization: Bearer $TOKEN")

case "${1:-}" in
  reports)
    curl -fsS "${auth[@]}" "$API/admin/reports" | python3 -m json.tool
    ;;
  show)
    out="$(mktemp -t madpix).svg"
    curl -fsS "${auth[@]}" "$API/admin/drawings/$2/svg" -o "$out"
    open "$out"
    ;;
  delete)
    read -r -p "Delete drawing $2 for everyone? [y/N] " yes
    [[ "$yes" == "y" ]] && curl -fsS -X DELETE "${auth[@]}" "$API/admin/drawings/$2" && echo "Deleted."
    ;;
  remove)
    read -r -p "Remove player $2 and blank everything they drew? [y/N] " yes
    [[ "$yes" == "y" ]] && curl -fsS -X POST "${auth[@]}" "$API/admin/players/$2/remove" && echo "Removed."
    ;;
  *)
    sed -n '2,9p' "$0"
    exit 1
    ;;
esac

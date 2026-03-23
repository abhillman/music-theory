#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_DIR="$SCRIPT_DIR/services"
UI_DIR="$SCRIPT_DIR/music-theory-ui"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${RESET}"

    if [[ -n "${UI_PID:-}" ]] && kill -0 "$UI_PID" 2>/dev/null; then
        echo -e "${CYAN}Stopping front-end (PID $UI_PID)...${RESET}"
        kill "$UI_PID" 2>/dev/null || true
        wait "$UI_PID" 2>/dev/null || true
    fi

    if [[ -n "${PREVIEW_PID:-}" ]] && kill -0 "$PREVIEW_PID" 2>/dev/null; then
        echo -e "${CYAN}Stopping preview server (PID $PREVIEW_PID)...${RESET}"
        kill "$PREVIEW_PID" 2>/dev/null || true
        wait "$PREVIEW_PID" 2>/dev/null || true
    fi

    echo -e "${CYAN}Stopping back-end services...${RESET}"
    docker compose -f "$SERVICES_DIR/docker-compose.yml" down

    echo -e "${GREEN}All services stopped.${RESET}"
}

trap cleanup EXIT INT TERM

usage() {
    cat <<EOF
${BOLD}Usage:${RESET} $(basename "$0") [OPTIONS]

Start the full Music Theory application (back-end services + front-end).

${BOLD}Options:${RESET}
  ${GREEN}--dev${RESET}        Start the front-end in development mode (Vite dev server with HMR)
  ${GREEN}--prod${RESET}       Build and serve the front-end in production/preview mode (default)
  ${GREEN}--skip-build${RESET} In prod mode, skip Docker and npm rebuilds (use existing artifacts)
  ${GREEN}-h, --help${RESET}   Show this help message

${BOLD}Examples:${RESET}
  $(basename "$0")              # Start everything in production mode
  $(basename "$0") --dev        # Start back-end + Vite dev server
  $(basename "$0") --prod       # Explicitly choose production mode
EOF
}

MODE="prod"
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dev)
            MODE="dev"
            shift
            ;;
        --prod)
            MODE="prod"
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${RESET}" >&2
            usage
            exit 1
            ;;
    esac
done

echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       ${CYAN}Music Theory Application${RESET}${BOLD}       ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Front-end mode: ${GREEN}${MODE}${RESET}"
echo ""

# --- Back-end services ---
echo -e "${BOLD}[1/3] Starting back-end services...${RESET}"

if [[ "$SKIP_BUILD" == true ]]; then
    echo -e "${YELLOW}  Skipping Docker rebuild (--skip-build)${RESET}"
    docker compose -f "$SERVICES_DIR/docker-compose.yml" up -d
else
    docker compose -f "$SERVICES_DIR/docker-compose.yml" up --build -d
fi

echo -e "${GREEN}  ✓ Back-end services are starting on localhost:8080${RESET}"
echo ""

# --- Front-end dependencies ---
echo -e "${BOLD}[2/3] Installing front-end dependencies...${RESET}"

if [[ "$SKIP_BUILD" == true ]] && [[ -d "$UI_DIR/node_modules" ]]; then
    echo -e "${YELLOW}  Skipping npm install (--skip-build)${RESET}"
else
    (cd "$UI_DIR" && npm install)
fi

echo -e "${GREEN}  ✓ Dependencies ready${RESET}"
echo ""

# --- Front-end start ---
echo -e "${BOLD}[3/3] Starting front-end (${MODE} mode)...${RESET}"

if [[ "$MODE" == "dev" ]]; then
    echo -e "${CYAN}  Launching Vite dev server with HMR...${RESET}"
    (cd "$UI_DIR" && npm run dev) &
    UI_PID=$!
    echo -e "${GREEN}  ✓ Dev server starting on http://localhost:3000${RESET}"
else
    if [[ "$SKIP_BUILD" == true ]] && [[ -d "$UI_DIR/build" ]]; then
        echo -e "${YELLOW}  Skipping production build (--skip-build)${RESET}"
    else
        echo -e "${CYAN}  Building production bundle...${RESET}"
        (cd "$UI_DIR" && npm run build)
        echo -e "${GREEN}  ✓ Build complete${RESET}"
    fi

    echo -e "${CYAN}  Launching preview server...${RESET}"
    (cd "$UI_DIR" && npm run preview) &
    PREVIEW_PID=$!
    echo -e "${GREEN}  ✓ Preview server starting on http://localhost:4173${RESET}"
fi

echo ""
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Application is running!${RESET}"
echo ""
echo -e "  Back-end (Envoy):  ${CYAN}http://localhost:8080${RESET}"
if [[ "$MODE" == "dev" ]]; then
    echo -e "  Front-end (dev):   ${CYAN}http://localhost:3000${RESET}"
else
    echo -e "  Front-end (prod):  ${CYAN}http://localhost:4173${RESET}"
fi
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${RESET} to stop all services."
echo -e "${BOLD}════════════════════════════════════════${RESET}"

wait

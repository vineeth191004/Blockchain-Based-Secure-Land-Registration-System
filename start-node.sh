#!/bin/bash

# start-node.sh
# Per-machine startup script. Run on each machine with the correct machine ID.
# Usage: ./start-node.sh A|B|C
#
# Prerequisites:
#   1. Set IP_MACHINE_A, IP_MACHINE_B, IP_MACHINE_C in environment or .env.network
#   2. Crypto materials must be present in fabric-samples/test-network/organizations/
#      (copy from Machine A using distribute-crypto.sh)

set -e

MACHINE=${1:?Error: Specify machine: ./start-node.sh A, B, or C}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="${SCRIPT_DIR}/fabric-samples/test-network"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[NODE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

# ─── Load IPs ────────────────────────────────────────────────────────────────
ENV_FILE="${SCRIPT_DIR}/.env.network"
if [[ -f "$ENV_FILE" ]]; then
  log "Loading IPs from .env.network..."
  source "$ENV_FILE"
fi

[[ -z "$IP_MACHINE_A" ]] && err "IP_MACHINE_A not set. Add it to .env.network or export it."
[[ -z "$IP_MACHINE_B" ]] && err "IP_MACHINE_B not set. Add it to .env.network or export it."
[[ -z "$IP_MACHINE_C" ]] && err "IP_MACHINE_C not set. Add it to .env.network or export it."

export IP_MACHINE_A IP_MACHINE_B IP_MACHINE_C

# ─── Select compose file ─────────────────────────────────────────────────────
case "${MACHINE^^}" in
  A)
    COMPOSE_FILE="${NETWORK_DIR}/docker/docker-compose-machine-a.yaml"
    log "Starting Machine A: orderer.example.com + peer0.org1.example.com"
    ;;
  B)
    COMPOSE_FILE="${NETWORK_DIR}/docker/docker-compose-machine-b.yaml"
    log "Starting Machine B: orderer2.example.com + peer0.org2.example.com"
    ;;
  C)
    COMPOSE_FILE="${NETWORK_DIR}/docker/docker-compose-machine-c.yaml"
    log "Starting Machine C: orderer3.example.com + peer0.org3.example.com"
    ;;
  *)
    err "Unknown machine: ${MACHINE}. Use A, B, or C."
    ;;
esac

[[ -f "$COMPOSE_FILE" ]] || err "Compose file not found: $COMPOSE_FILE"

log "Starting containers via: $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" up -d

log "Waiting 10s for containers to settle..."
sleep 10

log "Running containers:"
docker ps --filter "name=orderer\|name=peer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

log "✅ Node ${MACHINE} started successfully."
log ""
log "Next: Run setup-network.sh on Machine A to join all orderers and peers to the channel."

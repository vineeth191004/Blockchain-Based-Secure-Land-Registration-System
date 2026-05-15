#!/bin/bash

# distribute-crypto.sh
# Run this ONCE from Machine A after generating crypto materials.
# It copies the organizations/ folder and channel artifacts to Machine B and C.
# Usage: ./distribute-crypto.sh <IP_MACHINE_B> <IP_MACHINE_C> [ssh_user]

set -e

IP_B=${1:?Usage: ./distribute-crypto.sh <IP_B> <IP_C> [user]}
IP_C=${2:?Usage: ./distribute-crypto.sh <IP_B> <IP_C> [user]}
SSH_USER=${3:-$(whoami)}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="${SCRIPT_DIR}/fabric-samples/test-network"

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[DIST]${NC} $1"; }

log "Distributing crypto materials to Machine B (${IP_B}) and Machine C (${IP_C})..."

# ─── Machine B ──────────────────────────────────────────────────────────────
log "→ Copying to Machine B (${SSH_USER}@${IP_B})..."

ssh "${SSH_USER}@${IP_B}" "mkdir -p ~/end_blockchain/fabric-samples/test-network"

# Copy organizations (crypto material), channel artifacts, and peer config
rsync -avz --progress \
  "${NETWORK_DIR}/organizations/" \
  "${SSH_USER}@${IP_B}:~/end_blockchain/fabric-samples/test-network/organizations/"

rsync -avz --progress \
  "${NETWORK_DIR}/channel-artifacts/" \
  "${SSH_USER}@${IP_B}:~/end_blockchain/fabric-samples/test-network/channel-artifacts/"

rsync -avz --progress \
  "${NETWORK_DIR}/docker/peercfg/" \
  "${SSH_USER}@${IP_B}:~/end_blockchain/fabric-samples/test-network/docker/peercfg/"

# ─── Machine C ──────────────────────────────────────────────────────────────
log "→ Copying to Machine C (${SSH_USER}@${IP_C})..."

ssh "${SSH_USER}@${IP_C}" "mkdir -p ~/end_blockchain/fabric-samples/test-network"

rsync -avz --progress \
  "${NETWORK_DIR}/organizations/" \
  "${SSH_USER}@${IP_C}:~/end_blockchain/fabric-samples/test-network/organizations/"

rsync -avz --progress \
  "${NETWORK_DIR}/channel-artifacts/" \
  "${SSH_USER}@${IP_C}:~/end_blockchain/fabric-samples/test-network/channel-artifacts/"

rsync -avz --progress \
  "${NETWORK_DIR}/docker/peercfg/" \
  "${SSH_USER}@${IP_C}:~/end_blockchain/fabric-samples/test-network/docker/peercfg/"

log "✅ Distribution complete. Now run ./start-node.sh on each machine."

#!/bin/bash

# Complete Land Registration Network Setup Script
# Single-Machine with 3 Specialized Orderers (Raft)
# This sets up the entire Hyperledger Fabric network

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PATH="${SCRIPT_DIR}/fabric-samples/bin:$PATH"

print_status()  { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
print_header()  { echo -e "${BLUE}$1${NC}"; }

# Check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed."
        exit 1
    fi
    DOCKER_COMPOSE_CMD="docker-compose"
    if ! command -v $DOCKER_COMPOSE_CMD &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        if ! $DOCKER_COMPOSE_CMD version &> /dev/null; then
            print_error "Docker Compose is not installed."
            exit 1
        fi
    fi
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running."
        exit 1
    fi
    print_status "Prerequisites check passed."
}

# Generate crypto materials and channel artifacts
generate_artifacts() {
    print_header "Generating crypto materials and channel artifacts..."
    cd fabric-samples/test-network
    export FABRIC_CFG_PATH=$PWD

    print_status "Generating crypto materials for 3 orderers + 3 org peers..."
    rm -rf organizations
    cryptogen generate --config=./crypto-config.yaml --output="organizations"

    print_status "Generating genesis block..."
    mkdir -p system-genesis-block
    configtxgen -profile ThreeOrgsOrdererGenesis -channelID system-channel \
        -outputBlock ./system-genesis-block/genesis.block -configPath .

    print_status "Generating channel artifacts..."
    mkdir -p channel-artifacts
    configtxgen -profile ThreeOrgsChannel -outputBlock ./channel-artifacts/mychannel.block \
        -channelID mychannel -configPath .
    configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx \
        -channelID mychannel -asOrg Org1MSP -configPath .
    configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx \
        -channelID mychannel -asOrg Org2MSP -configPath .
    configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org3MSPanchors.tx \
        -channelID mychannel -asOrg Org3MSP -configPath .

    cd ../..
    print_status "Artifacts generated successfully."
}

# Start the network
start_network() {
    print_header "Starting the Fabric network (3 orderers + 3 peers)..."
    cd fabric-samples/test-network
    $DOCKER_COMPOSE_CMD -f docker/docker-compose-full.yaml up -d
    print_status "Waiting for all containers to start..."
    sleep 15
    print_status "Network started."
    cd ../..
}

# Create and join channel — joins ALL 3 orderers
setup_channel() {
    export FABRIC_CFG_PATH=${PWD}/fabric-samples/config
    print_header "Setting up channel — joining all 3 orderers to mychannel..."

    CHANNEL_BLOCK=${PWD}/fabric-samples/test-network/channel-artifacts/mychannel.block
    ORDERER_CA=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

    # ── Orderer 1 (Primary Admin) — port 7053 ──────────────────────────────
    print_status "Joining orderer.example.com (Primary Admin) to mychannel..."
    OSN_TLS_CERT=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
    OSN_TLS_KEY=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key
    osnadmin channel join --channelID mychannel --config-block "$CHANNEL_BLOCK" \
        -o localhost:7053 \
        --ca-file "$ORDERER_CA" --client-cert "$OSN_TLS_CERT" --client-key "$OSN_TLS_KEY"
    sleep 5

    # ── Orderer 2 (High-Throughput) — port 8053 ────────────────────────────
    print_status "Joining orderer2.example.com (High-Throughput) to mychannel..."
    OSN_TLS_CERT2=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt
    OSN_TLS_KEY2=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.key
    osnadmin channel join --channelID mychannel --config-block "$CHANNEL_BLOCK" \
        -o localhost:8053 \
        --ca-file "$ORDERER_CA" --client-cert "$OSN_TLS_CERT2" --client-key "$OSN_TLS_KEY2"
    sleep 5

    # ── Orderer 3 (Audit & Compliance) — port 9053 ─────────────────────────
    print_status "Joining orderer3.example.com (Audit & Compliance) to mychannel..."
    OSN_TLS_CERT3=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.crt
    OSN_TLS_KEY3=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.key
    osnadmin channel join --channelID mychannel --config-block "$CHANNEL_BLOCK" \
        -o localhost:9053 \
        --ca-file "$ORDERER_CA" --client-cert "$OSN_TLS_CERT3" --client-key "$OSN_TLS_KEY3"
    sleep 10

    print_status "All 3 orderers joined mychannel. Raft leader election in progress..."
    sleep 5

    # ── PEERS JOIN CHANNEL ──────────────────────────────────────────────────
    print_status "Org1 peer joining channel..."
    source setOrg1.sh
    joinChannel

    print_status "Org2 peer joining channel..."
    source setOrg2.sh
    joinChannel

    print_status "Org3 peer joining channel..."
    source setOrg3.sh
    joinChannel

    print_status "Channel setup completed."
}

# Setup chaincode
setup_chaincode() {
    export FABRIC_CFG_PATH=${PWD}/fabric-samples/config
    print_header "Setting up chaincode..."

    print_status "Using provided land-registration package"
    cp land-registration.tar.gz chaincode/land-registration.tar.gz

    print_status "Installing chaincode on Org1..."
    source setOrg1.sh
    installChaincode

    print_status "Installing chaincode on Org2..."
    source setOrg2.sh
    installChaincode

    print_status "Installing chaincode on Org3..."
    source setOrg3.sh
    installChaincode

    print_status "Approving chaincode for Org1..."
    source setOrg1.sh
    approveChaincode

    print_status "Approving chaincode for Org2..."
    source setOrg2.sh
    approveChaincode

    print_status "Approving chaincode for Org3..."
    source setOrg3.sh
    approveChaincode

    print_status "Committing chaincode to channel..."
    source setOrg3.sh
    commitChaincode

    print_status "Chaincode setup completed."
}

# Register users
register_users() {
    print_header "Registering users..."
    cd fabric-samples/test-network
    ./enroll-admins.sh
    cd ../..
    print_status "User registration completed."
}

# Main
main() {
    print_header "═══════════════════════════════════════════════════"
    print_header "  Land Registration Network Setup"
    print_header "  3-Orderer Raft: Primary | Throughput | Audit"
    print_header "═══════════════════════════════════════════════════"

    check_prerequisites
    generate_artifacts
    start_network
    setup_channel
    setup_chaincode
    register_users

    print_header "═══════════════════════════════════════════════════"
    print_status "✅ Network setup completed successfully!"
    print_header "═══════════════════════════════════════════════════"
    echo ""
    echo "  3 Orderers Running:"
    echo "    orderer.example.com   — PRIMARY ADMIN        (ports 7050/7053/9443)"
    echo "    orderer2.example.com  — HIGH-THROUGHPUT       (ports 8050/8053/8443)"
    echo "    orderer3.example.com  — AUDIT & COMPLIANCE    (ports 9050/9053/9447)"
    echo ""
    echo "  3 Peers Running:"
    echo "    peer0.org1  — Land Registry   (port 7051)"
    echo "    peer0.org2  — Bank            (port 9051)"
    echo "    peer0.org3  — Collectorate    (port 11051)"
    echo ""
    echo "  Next steps:"
    echo "    1. Start API:    cd fabric-api && npm start"
    echo "    2. Start Client: cd client && npm run dev"
    echo "    3. Test:         http://localhost:3000"
    echo ""
    print_status "Happy coding! 🚀"
}

main "$@"
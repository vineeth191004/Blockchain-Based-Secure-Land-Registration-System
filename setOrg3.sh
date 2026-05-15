#!/bin/bash

# Set Environment variables for Org3 (Collectorate Department)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export PATH=${SCRIPT_DIR}/fabric-samples/bin:$PATH

export CORE_PEER_TLS_ENABLED=true
export FABRIC_CFG_PATH=${SCRIPT_DIR}/fabric-samples/config/

# Paths for channel artifacts and crypto
export ORDERER_ADDRESS=localhost:7050
ORDERER_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
PEER0_ORG1_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
PEER0_ORG2_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
PEER0_ORG3_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
CHANNEL_NAME="mychannel"

# Set Org3 specific environment
export CORE_PEER_LOCALMSPID="Org3MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG3_CA
export CORE_PEER_MSPCONFIGPATH=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051
export CORE_PEER_TLS_SERVERHOSTOVERRIDE=peer0.org3.example.com
export ORDERER_ADDRESS=localhost:7050

echo "Environment set for Org3 (Collectorate Department)"
echo "CORE_PEER_ADDRESS: $CORE_PEER_ADDRESS"
echo "CORE_PEER_LOCALMSPID: $CORE_PEER_LOCALMSPID"

# Channel operations for Org3
joinChannel() {
    echo "Org3 joining channel 'mychannel'..."
    peer channel join -b "${SCRIPT_DIR}/fabric-samples/test-network/channel-artifacts/mychannel.block"
}

updateAnchorPeer() {
    echo "Updating anchor peer for Org3..."
    peer channel update -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        -c mychannel -f "${SCRIPT_DIR}/fabric-samples/test-network/channel-artifacts/Org3MSPanchors.tx" \
        --tls --cafile "$ORDERER_CA"
}

installChaincode() {
    echo "Installing chaincode on Org3 peer..."
    peer lifecycle chaincode install "${SCRIPT_DIR}/chaincode/land-registration.tar.gz"
}

approveChaincode() {
    echo "Approving chaincode for Org3..."
    CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "land-registration" | awk '{print $3}' | sed 's/.$//')
    echo "Detected Package ID: '$CC_PACKAGE_ID'"

    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls \
        --cafile $ORDERER_CA \
        --channelID mychannel \
        --name land-registration \
        --version 7.0 \
        --package-id $CC_PACKAGE_ID \
        --sequence 1
}

commitChaincode() {
    echo "Committing chaincode to channel..."
    unset CORE_PEER_TLS_SERVERHOSTOVERRIDE
    peer lifecycle chaincode commit \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls \
        --cafile $ORDERER_CA \
        --channelID mychannel \
        --name land-registration \
        --version 7.0 \
        --sequence 1 \
        --peerAddresses localhost:7051 \
        --tlsRootCertFiles $PEER0_ORG1_CA \
        --peerAddresses localhost:9051 \
        --tlsRootCertFiles $PEER0_ORG2_CA \
        --peerAddresses localhost:11051 \
        --tlsRootCertFiles $PEER0_ORG3_CA
}

# Display available commands
echo ""
echo "Available commands:"
echo "  joinChannel       - Join Org3 to the channel"
echo "  updateAnchorPeer  - Update anchor peer"
echo "  installChaincode  - Install chaincode"
echo "  approveChaincode  - Approve chaincode for Org3"
echo "  commitChaincode   - Commit chaincode to channel (run from Org3)"
echo ""
echo "Usage: source setOrg3.sh && joinChannel"
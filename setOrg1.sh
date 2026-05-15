#!/bin/bash

# Set environment for Org1 (Registration Department)
# This script sets up the environment variables for Org1 operations
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export PATH=${SCRIPT_DIR}/fabric-samples/bin:$PATH

export CORE_PEER_TLS_ENABLED=true
export FABRIC_CFG_PATH=${SCRIPT_DIR}/fabric-samples/config
export PEER0_ORG1_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export PEER0_ORG3_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

# Set Org1 specific environment
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
export CORE_PEER_MSPCONFIGPATH=${SCRIPT_DIR}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_SERVERHOSTOVERRIDE=peer0.org1.example.com
export ORDERER_ADDRESS=localhost:7050
export ORDERER_CA=${SCRIPT_DIR}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Environment set for Org1 (Registration Department)"
echo "CORE_PEER_ADDRESS: $CORE_PEER_ADDRESS"
echo "CORE_PEER_LOCALMSPID: $CORE_PEER_LOCALMSPID"

# Channel operations for Org1
createChannel() {
    echo "Creating channel 'mychannel'..."
    peer channel create -o localhost:7050 -c mychannel \
        --ordererTLSHostnameOverride orderer.example.com \
        -f ${SCRIPT_DIR}/fabric-samples/test-network/channel-artifacts/mychannel.tx \
        --outputBlock ${SCRIPT_DIR}/fabric-samples/test-network/channel-artifacts/mychannel.block \
        --tls --cafile $ORDERER_CA
}

joinChannel() {
    echo "Org1 joining channel 'mychannel'..."
    peer channel join -b ${SCRIPT_DIR}/fabric-samples/test-network/channel-artifacts/mychannel.block
}

updateAnchorPeer() {
    echo "Updating anchor peer for Org1..."
    peer channel update -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        -c mychannel -f ${SCRIPT_DIR}/fabric-samples/test-network/channel-artifacts/Org1MSPanchors.tx \
        --tls --cafile $ORDERER_CA
}

installChaincode() {
    echo "Installing chaincode on Org1 peer..."
    peer lifecycle chaincode install ${SCRIPT_DIR}/chaincode/land-registration.tar.gz
}

approveChaincode() {
    echo "Approving chaincode for Org1..."
    CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "land-registration" | awk '{print $3}' | sed 's/.$//')

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

# Display available commands
echo ""
echo "Available commands:"
echo "  createChannel     - Create the channel"
echo "  joinChannel       - Join Org1 to the channel"
echo "  updateAnchorPeer  - Update anchor peer"
echo "  installChaincode  - Install chaincode"
echo "  approveChaincode  - Approve chaincode for Org1"
echo ""
echo "Usage: source setOrg1.sh && createChannel"
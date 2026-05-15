#!/bin/bash
set -x
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org3MSP"
# Use the chain we just captured from the actual server
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/orderer_chain.pem
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

echo "Approving chaincode 'land-registration' for Org3 using captured chain..."

peer lifecycle chaincode approveformyorg \
  -o orderer1.example.com:7050 \
  --ordererTLSHostnameOverride orderer1.example.com \
  --tls \
  --cafile "$ORDERER_CA" \
  --channelID mychannel \
  --name land-registration \
  --version 1.0 \
  --package-id land-registration_1.0:1267666d84c8b8cea83f883987906e0a7a5288a67c9ab669956447146cbf906c \
  --sequence 1

#!/bin/bash
set -x
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org3MSP"
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051

export PEER0_ORG1_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export PEER0_ORG3_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

echo "Committing chaincode 'land-registration' to 'mychannel'..."

peer lifecycle chaincode commit \
  -o orderer1.example.com:7050 \
  --ordererTLSHostnameOverride orderer1.example.com \
  --tls \
  --cafile "$ORDERER_CA" \
  --channelID mychannel \
  --name land-registration \
  --version 1.0 \
  --sequence 1 \
  --peerAddresses peer0.org1.example.com:7051 \
  --tlsRootCertFiles "$PEER0_ORG1_CA" \
  --peerAddresses peer0.org2.example.com:9051 \
  --tlsRootCertFiles "$PEER0_ORG2_CA" \
  --peerAddresses localhost:11051 \
  --tlsRootCertFiles "$PEER0_ORG3_CA"

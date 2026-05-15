#!/bin/bash

echo "========================================="
echo " Hyperledger Fabric Auto Network Startup "
echo "========================================="

set -e

# Move to test-network
cd "$(dirname "$0")"

# 1. Bring down any old network
echo "Stopping old network (if any)..."
./network.sh down || true

# 2. Start network and create channel
echo "Starting network and creating channel..."
./network.sh up createChannel -ca

# 3. Add Org3
echo "Adding Org3..."
cd addOrg3
./addOrg3.sh up -ca -c mychannel
cd ..

# 4. Deploy chaincode
echo "Deploying landregistration chaincode..."
./network.sh deployCC \
  -ccn landregistration \
  -ccp ~/blockchain/elandrecords/chaincode/land-registration \
  -ccl javascript \
  -c mychannel

echo "========================================="
echo " Fabric Network Running Successfully "
echo "========================================="
docker ps

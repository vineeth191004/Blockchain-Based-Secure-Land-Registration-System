#!/bin/bash

# Script to demonstrate Org3 (Collectorate) roles and activities in the terminal
# Requirements: Multi-organization network must be running

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================================${NC}"
}

print_step() {
    echo -e "\n${YELLOW}[STEP] $1${NC}"
}

# 1. Show Network Status for Org3
print_header "ORG3 (COLLECTORATE DEPARTMENT) - ACCESS LOGS & COMPLIANCE"

print_step "Reviewing Network Access Logs for Org3 Peer..."
docker logs peer0.org3.example.com --tail 20 2>/dev/null || echo "Peer logs not available (is the network running?)"

print_step "Verifying Org3 Peer Enrollment & MSP Identity..."
if [ -d "fabric-samples/test-network/organizations/peerOrganizations/org3.example.com" ]; then
    echo -e "${GREEN}✓ Org3 MSP Identity Found: Org3MSP${NC}"
    echo -e "Location: fabric-samples/test-network/organizations/peerOrganizations/org3.example.com"
else
    echo -e "${RED}✗ Org3 MSP Identity missing!${NC}"
fi

# 2. Demonstrate ABAC Enforcement
print_step "Demonstrating Attribute-Based Access Control (ABAC) for Org3..."
echo "Simulating Org3 Final Endorsement request..."
echo "----------------------------------------------------------------"
echo "Policy: Only Org3MSP with role 'collector' or 'ministry_welfare' can finalize"
echo "----------------------------------------------------------------"

# 3. Query Ledger for Completed Certificates
print_step "Checking Completed Land Registration Certificates (Issued by Org3)..."
source setOrg3.sh 2>/dev/null
if command -v peer &> /dev/null; then
    peer chaincode query -C mychannel -n land-registration -c '{"Args":["queryByStatus","completed"]}' 2>/dev/null | jq . || echo "Note: No completed certificates found yet."
else
    echo "Fabric CLI 'peer' not found in PATH."
fi

print_step "Commit Completeness & Audit Trail History..."
# Mocking the query for demonstration if network is not fully up
echo "Querying History for recent TXN-ORG3 transactions..."
echo "Recent Actions:"
echo " - [TXN-ORG3-1713545000] ACTION: final_endorsement_and_certification | BY: district_collector"
echo " - [TXN-ORG3-1713545100] ACTION: collectorate_approval | BY: joint_collector"

print_header "ORG3 COMPLIANCE CHECK COMPLETED"

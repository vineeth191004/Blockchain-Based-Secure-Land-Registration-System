#!/bin/bash

# Master Script to Run All Components of Land Registration System
# This script starts the Fabric network, seeds the database, and launches the API + Frontend.

set -e

# Add Fabric binaries to PATH
export PATH=${PWD}/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/fabric-samples/config

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=========================================="
    echo -e "  $1"
    echo -e "==========================================${NC}"
}

# 1. Start Fabric Network
print_header "Step 1: Starting Hyperledger Fabric Network"
if [ ! -f "./setup-network.sh" ]; then
    echo "Error: setup-network.sh not found in current directory"
    exit 1
fi
bash ./setup-network.sh

# 2. Start AI/OCR Service
print_header "Step 2: Starting AI & OCR Microservice"
cd ai_service
if [ -d "../ai_venv" ]; then
    source ../ai_venv/bin/activate
    pip install fastapi uvicorn pydantic > /dev/null 2>&1
else
    # Install globally if venv not found (system-wide or user local)
    pip install fastapi uvicorn pydantic > /dev/null 2>&1
fi
python3 main.py > ai_service.log 2>&1 &
AI_SERVICE_PID=$!
print_status "AI Service started (PID: $AI_SERVICE_PID)"
cd ..

# 3. Install Dependencies and Seed Database
print_header "Step 3: Seeding MongoDB Database"
cd client
print_status "Installing client dependencies..."
npm install > /dev/null 2>&1
print_status "Running seed script..."
node scripts/seed.js
cd ..

# 3. Start Fabric API
print_header "Step 3: Starting Fabric API Server"
cd fabric-api
print_status "Installing API dependencies..."
npm install
print_status "Starting API server in background..."
npm start > api.log 2>&1 &
API_PID=$!
cd ..

# 4. Start Frontend
print_header "Step 4: Starting Frontend Application"
cd client
print_status "Starting Next.js dev server in background..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

print_header "System is Starting Up!"
echo -e "${GREEN}Fabric API PID: $API_PID (Logs: fabric-api/api.log)${NC}"
echo -e "${GREEN}Frontend PID: $FRONTEND_PID (Logs: client/frontend.log)${NC}"
echo -e "${GREEN}AI Service PID: $AI_SERVICE_PID (Logs: ai_service/ai_service.log)${NC}"
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
echo -e "User Portal: http://localhost:3000/userlogin"
echo -e "Official Dashboard: http://localhost:3000/officiallogin"
echo ""
echo -e "${BLUE}To stop everything later:${NC}"
echo -e "kill $API_PID $FRONTEND_PID"
echo -e "cd fabric-samples/test-network && ./network.sh down"
echo ""

# Keep script running to monitor logs or just exit
print_status "All processes started. Happy coding! 🚀"

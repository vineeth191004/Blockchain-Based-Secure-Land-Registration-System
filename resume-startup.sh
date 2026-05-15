#!/bin/bash
# Resume startup after network is already up

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_header() { echo -e "${BLUE}==========================================\n  $1\n==========================================${NC}"; }

# 1. Start AI/OCR Service
print_header "Step 1: Starting AI & OCR Microservice"
cd ai_service
pip install fastapi uvicorn pydantic > /dev/null 2>&1
python3 main.py > ai_service.log 2>&1 &
AI_SERVICE_PID=$!
print_status "AI Service started (PID: $AI_SERVICE_PID)"
cd ..

# 2. Seeding MongoDB Database
print_header "Step 2: Seeding MongoDB Database"
cd client
npm install > /dev/null 2>&1
node scripts/seed.js
cd ..

# 3. Start Fabric API
print_header "Step 3: Starting Fabric API Server"
cd fabric-api
npm install > /dev/null 2>&1
npm start > api.log 2>&1 &
API_PID=$!
print_status "API server started (PID: $API_PID)"
cd ..

# 4. Start Frontend
print_header "Step 4: Starting Frontend Application"
cd client
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

print_header "System is Resumed and Running!"
echo -e "${GREEN}Fabric API PID: $API_PID (Logs: fabric-api/api.log)${NC}"
echo -e "${GREEN}Frontend PID: $FRONTEND_PID (Logs: client/frontend.log)${NC}"
echo -e "${GREEN}AI Service PID: $AI_SERVICE_PID (Logs: ai_service/ai_service.log)${NC}"
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
echo -e "User Portal: http://localhost:3000/userlogin"
echo -e "Official Dashboard: http://localhost:3000/officiallogin"
echo ""

# Blockchain-Based Secure Land Registration System

This project implements a complete Hyperledger Fabric blockchain solution for land registration with a 3-organization network architecture, integrated with an AI/OCR pipeline and a MongoDB backend.

## 🚀 Quick Start (Automated)

The easiest way to start the entire system is to use the master run script. This script will automatically set up the Fabric network, start the AI microservice, seed the database, and launch both the backend API and the frontend application.

```bash
# Run the master setup script
./run-all.sh
```

### Accessing the System
- **User Portal**: [http://localhost:3000/userlogin](http://localhost:3000/userlogin)
- **Official Dashboard**: [http://localhost:3000/officiallogin](http://localhost:3000/officiallogin)

---

## 🛠 Prerequisites

Ensure you have the following installed before running the system:
- **Docker & Docker Compose**
- **Node.js (v16+) & npm**
- **Python 3.8+ & pip**
- **MongoDB** (Running locally or connection string updated in `client/.env`)

---

## 🏗 Manual Setup Instructions

If you prefer to start components individually or need to troubleshoot, follow these steps in order:

### 1. Start the Blockchain Network
```bash
./setup-network.sh
```
This script automates:
- Generation of crypto materials and channel artifacts.
- Starting the Fabric network.
- Channel creation and joining for all three organizations.
- Chaincode installation and deployment.
- Admin user enrollment.

### 2. Start the AI & OCR Microservice
This service is required for document verification and processing.
```bash
cd ai_service
pip install fastapi uvicorn pydantic
python3 main.py
```

### 3. Seed the MongoDB Database
Seeds the necessary roles and user collections in MongoDB.
```bash
cd client
npm install
node scripts/seed.js
```

### 4. Start the Fabric API Server
The Express server acts as a bridge between the frontend and the Fabric network.
```bash
cd fabric-api
npm install
npm start
```
*The API server will run on port 3001.*

### 5. Start the Frontend Application
The Next.js client interface for users and officials.
```bash
cd client
npm install
npm run dev
```
*The frontend will be accessible at port 3000.*

---

## 🛑 Stopping the System

To gracefully stop the background processes (if started via `run-all.sh`) and bring down the network:

```bash
# 1. Stop background processes (find the PIDs outputted by run-all.sh)
kill <API_PID> <FRONTEND_PID> <AI_SERVICE_PID>

# 2. Bring down the Fabric network and clean up containers/volumes
cd fabric-samples/test-network
./network.sh down
```

---

## 🏢 Network Architecture

### Organizations
- **Org1 (Registration)**: Handles initial land application registration and user management.
- **Org2 (Revenue)**: Manages revenue department verification, survey reports, and land valuation.
- **Org3 (Collectorate)**: Provides final approval authority and oversees the complete registration process.

### User Roles
- **User**: Can submit applications, track status, and complete OTP-based terminal registration.
- **Clerk**: Can view and update applications.
- **Superintendent**: Can verify applications.
- **Revenue Inspector**: Can conduct surveys.
- **MRO**: Can approve revenue-related actions.
- **District Collector**: Final approval authority.

---

## 🌟 Key Features
- **OTP Terminal Registration**: Secure user onboarding via OTP entered directly in the terminal (`otp.txt`).
- **AI/OCR Pipeline**: Automated document verification using PaddleOCR and LayoutLMv3.
- **Role-Based Workflows**: Strictly enforced access control across multiple government departments.
- **Immutable Ledger**: All actions, approvals, and land records are secured on the Hyperledger Fabric blockchain.

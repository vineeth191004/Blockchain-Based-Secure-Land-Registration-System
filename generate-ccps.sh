#!/bin/bash

# Generates connection profiles using simple JSON structure

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    sed -e "s/ORG_TOKEN/$1/" \
        -e "s/P0PORT_TOKEN/$2/" \
        -e "s/CAPORT_TOKEN/$3/" \
        -e "s#PEERPEM_TOKEN#$PP#" \
        -e "s#CAPEM_TOKEN#$CP#" \
        ./ccp-template.json
}

cd /home/vineeth/bp/fabric-samples/test-network

cat << EOF > ccp-template.json
{
    "name": "test-network-orgORG_TOKEN",
    "version": "1.0.0",
    "client": {
        "organization": "OrgORG_TOKEN"
    },
    "organizations": {
        "OrgORG_TOKEN": {
            "mspid": "OrgORG_TOKENMSP",
            "peers": [
                "peer0.orgORG_TOKEN.example.com"
            ],
            "certificateAuthorities": [
                "ca.orgORG_TOKEN.example.com"
            ]
        }
    },
    "peers": {
        "peer0.orgORG_TOKEN.example.com": {
            "url": "grpcs://localhost:P0PORT_TOKEN",
            "tlsCACerts": {
                "pem": "PEERPEM_TOKEN"
            },
            "grpcOptions": {
                "ssl-target-name-override": "peer0.orgORG_TOKEN.example.com",
                "hostnameOverride": "peer0.orgORG_TOKEN.example.com"
            }
        }
    },
    "certificateAuthorities": {
        "ca.orgORG_TOKEN.example.com": {
            "url": "https://localhost:CAPORT_TOKEN",
            "caName": "ca-orgORG_TOKEN",
            "tlsCACerts": {
                "pem": ["CAPEM_TOKEN"]
            },
            "httpOptions": {
                "verify": false
            }
        }
    }
}
EOF

ORG=1
P0PORT=7051
CAPORT=7054
PEERPEM=organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
CAPEM=organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem
echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/org1.example.com/connection-org1.json

ORG=2
P0PORT=9051
CAPORT=8054
PEERPEM=organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem
CAPEM=organizations/peerOrganizations/org2.example.com/ca/ca.org2.example.com-cert.pem
echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/org2.example.com/connection-org2.json

ORG=3
P0PORT=11051
CAPORT=10054
PEERPEM=organizations/peerOrganizations/org3.example.com/tlsca/tlsca.org3.example.com-cert.pem
CAPEM=organizations/peerOrganizations/org3.example.com/ca/ca.org3.example.com-cert.pem
echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/org3.example.com/connection-org3.json

rm ccp-template.json
echo "Connection profiles generated."

const fs = require('fs');
const path = require('path');

const testNetwork = '/home/vineeth/bp/fabric-samples/test-network';

function buildCCP(org, peerPort, caPort, peerPemFile, caPemFile) {
    const peerPem = fs.readFileSync(path.join(testNetwork, peerPemFile), 'utf8').replace(/\\n/g, '\\n');
    const caPem = fs.readFileSync(path.join(testNetwork, caPemFile), 'utf8').replace(/\\n/g, '\\n');
    
    return {
        "name": `test-network-org${org}`,
        "version": "1.0.0",
        "client": {
            "organization": `Org${org}`
        },
        "organizations": {
            [`Org${org}`]: {
                "mspid": `Org${org}MSP`,
                "peers": [
                    `peer0.org${org}.example.com`
                ],
                "certificateAuthorities": [
                    `ca.org${org}.example.com`
                ]
            }
        },
        "peers": {
            [`peer0.org${org}.example.com`]: {
                "url": `grpcs://localhost:${peerPort}`,
                "tlsCACerts": {
                    "pem": peerPem
                },
                "grpcOptions": {
                    "ssl-target-name-override": `peer0.org${org}.example.com`,
                    "hostnameOverride": `peer0.org${org}.example.com`
                }
            }
        },
        "certificateAuthorities": {
            [`ca.org${org}.example.com`]: {
                "url": `https://localhost:${caPort}`,
                "caName": `ca-org${org}`,
                "tlsCACerts": {
                    "pem": [caPem]
                },
                "httpOptions": {
                    "verify": false
                }
            }
        }
    };
}

const orgs = [
    { org: 1, p: 7051, c: 7054 },
    { org: 2, p: 9051, c: 8054 },
    { org: 3, p: 11051, c: 11054 }
];

orgs.forEach(({ org, p, c }) => {
    try {
        const ccp = buildCCP(org, p, c, 
            `organizations/peerOrganizations/org${org}.example.com/tlsca/tlsca.org${org}.example.com-cert.pem`,
            `organizations/peerOrganizations/org${org}.example.com/ca/ca.org${org}.example.com-cert.pem`
        );
        const dest = path.join(testNetwork, `organizations/peerOrganizations/org${org}.example.com/connection-org${org}.json`);
        fs.writeFileSync(dest, JSON.stringify(ccp, null, 4));
        console.log(`Generated CCP for Org${org}`);
    } catch (e) {
        console.error(`Failed to generate CCP for Org${org}:`, e.message);
    }
});

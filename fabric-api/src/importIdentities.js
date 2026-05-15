'use strict';

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const { userOrgMap } = require('./userOrgMap');

async function main() {
    try {
        console.log('Starting identity import process...');

        const testNetworkPath = path.resolve(__dirname, '..', '..', 'fabric-samples', 'test-network');
        const walletsPath = path.resolve(__dirname, '..', 'wallets');

        const orgs = ['org1', 'org2', 'org3'];

        // Helper to get crypto material paths
        const getCryptoPath = (org, userType) => {
            const domain = `${org}.example.com`;
            const userName = userType === 'admin' ? `Admin@${domain}` : `User1@${domain}`;
            const mspPath = path.join(testNetworkPath, 'organizations', 'peerOrganizations', domain, 'users', userName, 'msp');
            const certPath = path.join(mspPath, 'signcerts', `${userName}-cert.pem`);
            const keystorePath = path.join(mspPath, 'keystore');

            // keystore has random file name
            const keyFiles = fs.readdirSync(keystorePath);
            const keyPath = path.join(keystorePath, keyFiles[0]);

            return { certPath, keyPath, mspId: org.charAt(0).toUpperCase() + org.slice(1) + 'MSP' };
        };

        for (const [username, org] of Object.entries(userOrgMap)) {
            console.log(`Processing user: ${username} for ${org}`);

            // Ensure wallet exists
            const walletPath = path.join(walletsPath, org);
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            // Determine if this is an admin-like user or regular user configuration mapping
            // For simplicity, map 'admin-' prefixed users to Admin crypto, others to User1 crypto
            const userType = username.startsWith('admin-') ? 'admin' : 'user';

            const { certPath, keyPath, mspId } = getCryptoPath(org, userType);

            if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
                console.error(`Crypto files not found for ${username} (${userType}) in ${org}. Skipping.`);
                continue;
            }

            const cert = fs.readFileSync(certPath).toString();
            const key = fs.readFileSync(keyPath).toString();

            const identity = {
                credentials: {
                    certificate: cert,
                    privateKey: key,
                },
                mspId: mspId,
                type: 'X.509',
            };

            await wallet.put(username, identity);
            console.log(`Successfully imported identity for ${username} into wallet`);
        }

        console.log('Identity import completed successfully.');

    } catch (error) {
        console.error('Error importing identities:', error);
        process.exit(1);
    }
}

main();

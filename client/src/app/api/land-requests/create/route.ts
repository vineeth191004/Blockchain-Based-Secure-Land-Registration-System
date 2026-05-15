import { NextRequest, NextResponse } from 'next/server';
import { apiCall, auth } from '@/lib/fabric-api';
import crypto from 'crypto';
import connectDB from '@/lib/db/connect';
import LandRequest from '@/lib/models/LandRequest';
import { getCurrentUser } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phoneNumber,
      aadharNumber,
      dob,
      ownerName,
      surveyNumber,
      area,
      address,
      state,
      city,
      pincode,
      nature,
      ipfsHash,
    } = body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !aadharNumber || !dob || !ownerName || !surveyNumber || !area || !address || !state || !city || !pincode || !ipfsHash) {
      return NextResponse.json(
        { message: 'Missing required fields: fullName, email, phoneNumber, aadharNumber, dob, ownerName, surveyNumber, area, address, state, city, pincode, ipfsHash' },
        { status: 400 }
      );
    }

    // Validate date of birth
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime())) {
      return NextResponse.json(
        { message: 'Invalid date of birth format' },
        { status: 400 }
      );
    }

    // Get current user
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique application ID
    const applicationId = 'APP-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    // Generate w3c compliant DID (Decentralized Identifier) for this interaction
    const did = 'did:landreg:' + crypto.randomUUID();

    // Prepare user data for blockchain
    const userData = {
      fullName,
      email,
      phoneNumber,
      aadharNumber,
      dob,
      did, // Inject DID into blockchain claim
      ownerName,
      surveyNumber,
      area,
      address,
      state,
      city,
      pincode,
      nature,
      ipfsHash,
      status: 'with_clerk',
      createdAt: new Date().toISOString(),
    };

    // Call fabric-api to create application on blockchain
    const result = await apiCall('/api/land/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationId,
        userData,
      }),
    }, req);

    console.log(`Land application ${applicationId} created on blockchain`);

    // Save to MongoDB
    await connectDB();
    const landRequest = new LandRequest({
      receiptNumber: applicationId,
      nature,
      createdBy: session.userId,
      fullName,
      email,
      phoneNumber,
      aadharNumber,
      dob: parsedDob,
      did, // Save DID to DB
      ownerName,
      surveyNumber,
      area,
      address,
      state,
      city,
      pincode,
      ipfsHash,
      status: 'with_clerk',
    });

    await landRequest.save();
    console.log(`Land request ${applicationId} saved to database`);

    return NextResponse.json({
      receiptNumber: applicationId,
      id: applicationId,
      message: 'Land application created successfully on blockchain',
      blockchainTxId: result.data?.txId,
    });
  } catch (error) {
    console.error('Create land application error:', error);
    return NextResponse.json(
      { message: 'Failed to create land application', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

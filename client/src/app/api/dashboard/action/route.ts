import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db/connect';
import Official from '@/lib/models/Official';
import LandRequest from '@/lib/models/LandRequest';
import { apiCall, API_CONFIG } from '@/lib/fabric-api';

export async function POST(req: NextRequest) {
  try {
    // Authenticate using session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();

    // Get official from session
    const Session = require('@/lib/models/Session').default;
    const session = await Session.findOne({
      sessionToken,
      expiresAt: { $gt: new Date() }
    });

    if (!session || !session.officialId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const official = await Official.findById(session.officialId).select('-password');

    if (!official) {
      return NextResponse.json({ error: 'Official not found' }, { status: 404 });
    }

    console.log('Official found:', { username: official.username, designation: official.designation });

    // Create currentUser object
    const currentUser = {
      username: official.username,
      role: official.designation,
      org: official.department
    };

    // Parse FormData to handle both JSON and files
    const contentType = req.headers.get('content-type');
    let applicationId: string, action: string, remarks: string, officialData: any = {}, files: any = {};

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await req.formData();
      applicationId = formData.get('applicationId') as string;
      action = formData.get('action') as string;
      remarks = formData.get('remarks') as string;

      // Extract all form fields
      for (const [key, value] of formData.entries()) {
        if (!['applicationId', 'action', 'remarks'].includes(key)) {
          if (value instanceof File) {
            files[key] = value;
          } else {
            try {
              officialData[key] = JSON.parse(value as string);
            } catch {
              officialData[key] = value;
            }
          }
        }
      }
    } else {
      // Handle JSON
      const body = await req.json();
      applicationId = body.applicationId;
      action = body.action;
      remarks = body.remarks || '';
      officialData = body.officialData || {};
      files = body.files || {};
    }

    console.log('Dashboard action request:', { action, applicationId, currentUser });

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: 'Application ID and action are required' },
        { status: 400 }
      );
    }

    // Look up the application in MongoDB to get the blockchain application ID (receiptNumber)
    const application = await LandRequest.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Use the receiptNumber as the blockchain application ID
    const blockchainApplicationId = application.receiptNumber;

    // Prepare action data for blockchain
    const actionData = {
      username: currentUser.username, // Add username for fabric authentication
      remarks,
      officialData,
      files,
      performedBy: currentUser.username,
      performedAt: new Date().toISOString(),
      userRole: currentUser.role,
      userOrg: currentUser.org,
    };

    let result;

    // Route to appropriate blockchain action based on action type and user role
    switch (action.toLowerCase()) {
      case 'forward':
      case 'submit':
        // Allow all roles in the workflow to forward applications
        const allowedForwardRoles = [
          'clerk', 'superintendent', 'project_officer', 'projectofficer',
          'mro', 'surveyor', 'revenue_inspector', 'revenueinspector',
          'vro', 'revenue_dept_officer', 'revenuedeptofficer',
          'joint_collector', 'jointcollector', 'district_collector', 'districtcollector',
          'collector', 'ministry_welfare', 'ministrywelfare'
        ];

        const normalizedRole = currentUser.role.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
        const canForward = allowedForwardRoles.some(role =>
          role.replace(/\s+/g, '').replace(/_/g, '') === normalizedRole
        );

        if (!canForward) {
          return NextResponse.json(
            { error: 'Insufficient permissions for forwarding' },
            { status: 403 }
          );
        }
        result = await apiCall(API_CONFIG.ENDPOINTS.LAND.FORWARD(blockchainApplicationId), {
          method: 'POST',
          body: JSON.stringify({ forwardData: actionData }),
        }, req);
        break;

      case 'verify':
        if (!['mro', 'vro', 'revenue_officer', 'revenue_dept'].includes(currentUser.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions for verification' },
            { status: 403 }
          );
        }
        result = await apiCall(API_CONFIG.ENDPOINTS.LAND.VERIFY(blockchainApplicationId), {
          method: 'POST',
          body: JSON.stringify({ officerData: actionData }),
        }, req);
        break;

      case 'survey':
      case 'survey_report':
        if (!['surveyor'].includes(currentUser.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions for survey' },
            { status: 403 }
          );
        }
        result = await apiCall(API_CONFIG.ENDPOINTS.LAND.SURVEY(blockchainApplicationId), {
          method: 'POST',
          body: JSON.stringify({ surveyData: actionData }),
        }, req);
        break;

      case 'approve':
        const allowedApproveRoles = ['joint_collector', 'collector', 'district_collector', 'mw', 'ministry_welfare', 'ministrywelfare'];
        if (!allowedApproveRoles.includes(currentUser.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions for approval' },
            { status: 403 }
          );
        }
        result = await apiCall(API_CONFIG.ENDPOINTS.LAND.APPROVE(blockchainApplicationId), {
          method: 'POST',
          body: JSON.stringify({ approvalData: actionData }),
        }, req);

        // If Ministry of Welfare approved, generate Patta certificate
        const ministryWelfareRoles = ['mw', 'ministry_welfare', 'ministrywelfare'];
        if (ministryWelfareRoles.includes(currentUser.role) && result.success) {
          try {
            console.log('Generating Patta certificate for Ministry of Welfare approval');
            // Call the client API directly (not fabric API)
            const clientApiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const pattaResult = await fetch(`${clientApiUrl}/api/patta/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ applicationId }),
            });

            if (pattaResult.ok) {
              const pattaData = await pattaResult.json();
              console.log('Patta generated successfully:', pattaData);
            } else {
              console.error('Failed to generate Patta:', await pattaResult.text());
            }
          } catch (pattaError) {
            console.error('Error generating Patta:', pattaError);
            // Don't fail the approval if Patta generation fails
          }
        }
        break;

      case 'reject':
      case 'send_back':
        result = await apiCall(API_CONFIG.ENDPOINTS.LAND.REJECT(blockchainApplicationId), {
          method: 'POST',
          body: JSON.stringify({ rejectData: actionData }),
        }, req);
        break;

      default:
        console.log('Unknown action:', action, 'by user:', currentUser);
        return NextResponse.json(
          { error: `Unknown action type: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Action failed on blockchain' },
        { status: 500 }
      );
    }

    // Update MongoDB status after successful blockchain transaction
    try {
      let finalStatus = result.data?.status || 'pending';

      // If Ministry of Welfare approved, set status to 'completed' for UI compatibility
      const ministryWelfareRoles = ['mw', 'ministry_welfare', 'ministrywelfare'];
      if (ministryWelfareRoles.includes(currentUser.role) && action === 'approve') {
        finalStatus = 'completed';
      }

      if (result.data && typeof result.data === 'object' && result.data.status) {
        await LandRequest.findByIdAndUpdate(applicationId, {
          status: finalStatus,
          updatedAt: new Date(),
          lastAction: action,
          lastActionBy: official._id,
          lastActionAt: new Date(),
        });
        console.log(`Updated MongoDB status for application ${applicationId} to ${finalStatus}`);
      } else if (result.data && typeof result.data === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsedData = JSON.parse(result.data);
          if (parsedData.status) {
            await LandRequest.findByIdAndUpdate(applicationId, {
              status: finalStatus,
              updatedAt: new Date(),
              lastAction: action,
              lastActionBy: official._id,
              lastActionAt: new Date(),
            });
            console.log(`Updated MongoDB status for application ${applicationId} to ${finalStatus}`);
          }
        } catch (parseError) {
          console.error('Failed to parse blockchain response:', parseError);
        }
      }
    } catch (updateError) {
      console.error('Failed to update MongoDB status:', updateError);
      // Don't fail the request if MongoDB update fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: `${action} action completed successfully`,
      data: result.data,
      transactionId: result.data?.txId,
    });

  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json(
      { error: `Failed to process action: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// Role hierarchy for forwarding (matches NEXT_STAGE in workflow.ts)
const ROLE_HIERARCHY: Record<string, string | null> = {
  'clerk': 'superintendent',
  'superintendent': 'project_officer',
  'project_officer': 'mro',
  'projectofficer': 'mro',
  'mro': 'surveyor',
  'surveyor': 'revenue_inspector',
  'revenue_inspector': 'vro',
  'revenueinspector': 'vro',
  'vro': 'revenue_dept_officer',
  'revenue_dept_officer': 'joint_collector',
  'revenuedeptofficer': 'joint_collector',
  'joint_collector': 'district_collector',
  'jointcollector': 'district_collector',
  'district_collector': 'ministry_welfare',
  'districtcollector': 'ministry_welfare',
  'ministry_welfare': null,
  'ministrywelfare': null, // Final approver
};

// Designation variations mapping (for flexible matching)
const DESIGNATION_VARIATIONS: Record<string, string[]> = {
  'project_officer': ['project officer', 'projectofficer', 'project_officer', 'Project Officer'],
  'projectofficer': ['project officer', 'projectofficer', 'project_officer', 'Project Officer'],
  'superintendent': ['superintendent', 'Superintendent'],
  'clerk': ['clerk', 'Clerk'],
  'mro': ['mro', 'MRO', 'Mandal Revenue Officer'],
  'surveyor': ['surveyor', 'Surveyor'],
  'revenue_inspector': ['revenue inspector', 'revenueinspector', 'revenue_inspector', 'Revenue Inspector'],
  'revenueinspector': ['revenue inspector', 'revenueinspector', 'revenue_inspector', 'Revenue Inspector'],
  'vro': ['vro', 'VRO', 'Village Revenue Officer'],
  'revenue_dept_officer': ['revenue dept officer', 'revenuedeptofficer', 'revenue_dept_officer', 'Revenue Department Officer'],
  'revenuedeptofficer': ['revenue dept officer', 'revenuedeptofficer', 'revenue_dept_officer', 'Revenue Department Officer'],
  'joint_collector': ['joint collector', 'jointcollector', 'joint_collector', 'Joint Collector'],
  'jointcollector': ['joint collector', 'jointcollector', 'joint_collector', 'Joint Collector'],
  'district_collector': ['district collector', 'districtcollector', 'district_collector', 'District Collector'],
  'districtcollector': ['district collector', 'districtcollector', 'district_collector', 'District Collector'],
  'ministry_welfare': ['ministry welfare', 'ministrywelfare', 'ministry_welfare', 'Ministry of Welfare'],
  'ministrywelfare': ['ministry welfare', 'ministrywelfare', 'ministry_welfare', 'Ministry of Welfare'],
};

// Status mapping to match LandRequest model
const STATUS_MAP: Record<string, string> = {
  'clerk': 'with_clerk',
  'superintendent': 'with_superintendent',
  'project_officer': 'with_project_officer',
  'projectofficer': 'with_project_officer',
  'mro': 'with_mro',
  'surveyor': 'with_surveyor',
  'revenue_inspector': 'with_revenue_inspector',
  'revenueinspector': 'with_revenue_inspector',
  'vro': 'with_vro',
  'revenue_dept_officer': 'with_revenue_dept',
  'revenuedeptofficer': 'with_revenue_dept',
  'joint_collector': 'with_joint_collector',
  'jointcollector': 'with_joint_collector',
  'district_collector': 'with_collector',
  'districtcollector': 'with_collector',
  'collector': 'with_collector',
  'ministry_welfare': 'with_ministry_welfare',
  'ministrywelfare': 'with_ministry_welfare',
};


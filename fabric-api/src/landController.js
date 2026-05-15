const express = require('express');
const fabricClient = require('./fabricClient');

const router = express.Router();

// Get all land applications
router.get('/applications', async (req, res) => {
  try {
    // Connect to fabric network first
    await fabricClient.connect('user_portal');

    // Use admin user for queries
    const applications = await fabricClient.getAllLandRequests('user_portal');

    res.json({
      success: true,
      data: applications
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications by email
router.get('/applications/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Connect to fabric network first
    await fabricClient.connect('user_portal');

    // Get all applications and filter by email
    const allApplications = await fabricClient.getAllLandRequests('user_portal');

    // Filter applications by email (blockchain returns {Key, Record} format)
    const userApplications = allApplications.filter(app => {
      const record = app.Record || app;
      const userData = record.userData || record;
      return userData.email && userData.email.toLowerCase() === email.toLowerCase();
    });

    res.json({
      success: true,
      data: userApplications
    });

  } catch (error) {
    console.error('Get applications by email error:', error);
    res.status(500).json({ error: 'Failed to fetch applications by email' });
  }
});

// Create new land application
router.post('/applications', async (req, res) => {
  try {
    const { applicationId, userData } = req.body;

    if (!applicationId || !userData) {
      return res.status(400).json({ error: 'Application ID and user data are required' });
    }

    // Connect to fabric network first
    await fabricClient.connect('admin-registration');

    // Use admin user for creating applications
    const result = await fabricClient.createApplication('admin-registration', applicationId, userData);

    res.json({
      success: true,
      data: result,
      message: 'Application created successfully'
    });

  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: error.message || 'Failed to create application' });
  }
});

// Verify application by revenue department
router.post('/applications/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { officerData } = req.body;

    if (!officerData) {
      return res.status(400).json({ error: 'Officer data is required' });
    }

    // For now, get username from request body (passed from dashboard)
    // TODO: Implement proper authentication
    const username = 'admin-registration'; // Use admin-registration for all operations (Org1)

    // Connect to fabric network
    await fabricClient.connect(username);

    // Perform verification
    const result = await fabricClient.verifyByRevenue(username, id, officerData);

    res.json({
      success: true,
      data: result,
      message: 'Application verified successfully'
    });

  } catch (error) {
    console.error('Verify application error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify application' });
  }
});

// Update survey report
router.post('/applications/:id/survey', async (req, res) => {
  try {
    const { id } = req.params;
    const { surveyData } = req.body;

    if (!surveyData) {
      return res.status(400).json({ error: 'Survey data is required' });
    }

    // For now, get username from request body (passed from dashboard)
    // TODO: Implement proper authentication
    const username = 'admin-registration'; // Use admin-registration for all operations (Org1)

    // Connect to fabric network
    await fabricClient.connect(username);

    // Perform survey update
    const result = await fabricClient.surveyReportUpdate(username, id, surveyData);

    res.json({
      success: true,
      data: result,
      message: 'Survey report updated successfully'
    });

  } catch (error) {
    console.error('Survey report update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update survey report' });
  }
});

// Forward application to next stage
router.post('/applications/:id/forward', async (req, res) => {
  try {
    const { id } = req.params;
    const { forwardData } = req.body;

    if (!forwardData) {
      return res.status(400).json({ error: 'Forward data is required' });
    }

    // For now, get username from request body (passed from dashboard)
    // TODO: Implement proper authentication
    const username = forwardData.username || 'admin-registration'; // Use username from forwardData or admin as fallback

    // Connect to fabric network
    await fabricClient.connect(username);

    // Perform forward
    const result = await fabricClient.forwardApplication(username, id, forwardData);

    res.json({
      success: true,
      data: result,
      message: 'Application forwarded successfully'
    });

  } catch (error) {
    console.error('Forward application error:', error);
    res.status(500).json({ error: error.message || 'Failed to forward application' });
  }
});

// Approve application by collector
router.post('/applications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalData } = req.body;

    if (!approvalData) {
      return res.status(400).json({ error: 'Approval data is required' });
    }

    // For now, get username from request body (passed from dashboard)
    // TODO: Implement proper authentication
    const username = 'admin-registration'; // Use admin-registration for all operations (Org1)

    // Connect to fabric network
    await fabricClient.connect(username);

    // Perform approval
    const result = await fabricClient.approveByCollector(username, id, approvalData);

    res.json({
      success: true,
      data: result,
      message: 'Application approved successfully'
    });

  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve application' });
  }
});

// Reject application
router.post('/applications/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectData } = req.body;

        if (!rejectData) {
            return res.status(400).json({ error: 'Reject data is required' });
        }

        const username = rejectData.username || 'admin-registration';

        // Connect to fabric network
        await fabricClient.connect(username);

        // Perform rejection
        const result = await fabricClient.rejectApplication(username, id, rejectData);

        res.json({
            success: true,
            data: result,
            message: 'Application rejected successfully'
        });

    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ error: error.message || 'Failed to reject application' });
    }
});

module.exports = router;
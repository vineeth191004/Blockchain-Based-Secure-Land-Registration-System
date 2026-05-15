'use strict';

const { Contract, Context } = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

class LandRegistrationContract extends Contract {

    constructor() {
        super('LandRegistrationContract');
    }

    /**
     * Initialize the chaincode
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Create a new land application
     */
    async createApplication(ctx, applicationId, userDataStr) {
        console.info('============= START : Create Application ===========');

        // Get client identity for RBAC
        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        // Only Org1 users can create applications
        if (mspId !== 'Org1MSP') {
            throw new Error('Only Registration Department (Org1) can create applications');
        }

        // Check if application already exists
        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (applicationAsBytes && applicationAsBytes.length > 0) {
            throw new Error(`Application ${applicationId} already exists`);
        }

        // Parse user data
        const userData = JSON.parse(userDataStr);

        // Generate deterministic transaction ID
        const txId = ctx.stub.getTxID();
        const transactionId = 'TXN-' + ctx.stub.getTxTimestamp().seconds + '-' + txId.substr(0, 8);

        // Create application object
        const application = {
            applicationId,
            userData,
            status: 'submitted',
            createdAt: ctx.stub.getTxTimestamp().seconds.toString(),
            updatedAt: ctx.stub.getTxTimestamp().seconds.toString(),
            history: [{
                transactionId,
                officialId: cid.getAttributeValue('hf.EnrollmentID') || 'unknown',
                officialName: cid.getAttributeValue('hf.EnrollmentID') || 'unknown',
                designation: 'user',
                action: 'created',
                remarks: 'Application submitted',
                timestamp: ctx.stub.getTxTimestamp().seconds.toString(),
                data: userData,
                documents: []
            }]
        };

        // Store application on blockchain
        await ctx.stub.putState(applicationId, Buffer.from(JSON.stringify(application)));

        console.info('============= END : Create Application ===========');
        return JSON.stringify(application);
    }

    /**
     * Verify application by Revenue Department
     */
    async verifyByRevenue(ctx, applicationId, officerDataStr) {
        console.info('============= START : Verify by Revenue ===========');

        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        // Only Org2 users can verify applications
        if (mspId !== 'Org2MSP') {
            throw new Error('Only Revenue Department (Org2) can verify applications');
        }

        // Get existing application
        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`Application ${applicationId} does not exist`);
        }

        const application = JSON.parse(applicationAsBytes.toString());

        // Check if application is in correct state
        if (application.status !== 'submitted') {
            throw new Error(`Application ${applicationId} is not in submitted state`);
        }

        // Parse officer data
        const officerData = JSON.parse(officerDataStr);

        // Update application
        application.status = 'verified';
        application.updatedAt = ctx.stub.getTxTimestamp().seconds.toString();
        application.revenueVerification = officerData;

        // Generate deterministic transaction ID
        const txId = ctx.stub.getTxID();
        const transactionId = 'TXN-' + ctx.stub.getTxTimestamp().seconds + '-' + txId.substr(0, 8);

        application.history.push({
            transactionId,
            officialId: cid.getAttributeValue('hf.EnrollmentID') || 'unknown',
            officialName: cid.getAttributeValue('hf.EnrollmentID') || 'unknown',
            designation: 'revenue_officer',
            action: 'verified',
            remarks: officerData.remarks || 'Verified by Revenue Department',
            timestamp: ctx.stub.getTxTimestamp().seconds.toString(),
            data: officerData,
            documents: []
        });

        // Store updated application
        await ctx.stub.putState(applicationId, Buffer.from(JSON.stringify(application)));

        console.info('============= END : Verify by Revenue ===========');
        return JSON.stringify(application);
    }

    /**
     * Update survey report
     */
    async surveyReportUpdate(ctx, applicationId, surveyDataStr) {
        console.info('============= START : Survey Report Update ===========');

        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        // Only Org2 surveyors can update survey reports
        if (mspId !== 'Org2MSP') {
            throw new Error('Only Revenue Department (Org2) can update survey reports');
        }

        // Get existing application
        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`Application ${applicationId} does not exist`);
        }

        const application = JSON.parse(applicationAsBytes.toString());

        // Parse survey data
        const surveyData = JSON.parse(surveyDataStr);

        // Update application
        application.updatedAt = ctx.stub.getTxTimestamp().seconds.toString();
        application.surveyReport = surveyData;

        // Generate deterministic transaction ID
        const txId = ctx.stub.getTxID();
        const transactionId = 'TXN-' + ctx.stub.getTxTimestamp().seconds + '-' + txId.substr(0, 8);

        application.history.push({
            transactionId,
            officialId: cid.getAttributeValue('hf.EnrollmentID') || 'unknown',
            officialName: cid.getAttributeValue('hf.EnrollmentID') || 'unknown',
            designation: 'surveyor',
            action: 'survey_updated',
            remarks: surveyData.remarks || 'Survey report updated',
            timestamp: ctx.stub.getTxTimestamp().seconds.toString(),
            data: surveyData,
            documents: []
        });

        // Store updated application
        await ctx.stub.putState(applicationId, Buffer.from(JSON.stringify(application)));

        console.info('============= END : Survey Report Update ===========');
        return JSON.stringify(application);
    }

    /**
     * Forward application to next stage
     */
    async forwardApplication(ctx, applicationId, forwardDataStr) {
        console.info('============= START : Forward Application ===========');

        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        // Get existing application
        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`Application ${applicationId} does not exist`);
        }

        const application = JSON.parse(applicationAsBytes.toString());

        // Parse forward data
        const forwardData = JSON.parse(forwardDataStr);

        // Define proper workflow sequence
        // Org1 (Registration) → Org2 (Revenue) → Org3 (Collectorate)
        const workflowSequence = {
            // Org1 - Registration Department
            'submitted': { allowedRoles: ['clerk'], nextStatus: 'with_superintendent' },
            'with_clerk': { allowedRoles: ['clerk'], nextStatus: 'with_superintendent' },
            'with_superintendent': { allowedRoles: ['superintendent'], nextStatus: 'with_project_officer' },
            'with_project_officer': { allowedRoles: ['project_officer'], nextStatus: 'with_mro' },

            // Org2 - Revenue Department
            'with_mro': { allowedRoles: ['mro'], nextStatus: 'with_surveyor' },
            'with_surveyor': { allowedRoles: ['surveyor'], nextStatus: 'with_revenue_inspector' },
            'with_revenue_inspector': { allowedRoles: ['revenue_inspector'], nextStatus: 'with_vro' },
            'with_vro': { allowedRoles: ['vro'], nextStatus: 'with_revenue_dept' },
            'with_revenue_dept': { allowedRoles: ['revenue_dept_officer', 'revenue_dept'], nextStatus: 'with_joint_collector' },

            // Org3 - Collectorate
            'with_joint_collector': { allowedRoles: ['joint_collector'], nextStatus: 'with_collector' },
            'with_collector': { allowedRoles: ['collector', 'district_collector'], nextStatus: 'with_ministry_welfare' },
            'with_district_collector': { allowedRoles: ['collector', 'district_collector'], nextStatus: 'with_ministry_welfare' }, // Recovery path for corrupted apps
            'with_ministry_welfare': { allowedRoles: ['ministry_welfare'], nextStatus: 'approved' }
        };

        const currentStatus = application.status;
        const userRole = forwardData.userRole;

        // Validate workflow transition
        const workflowStep = workflowSequence[currentStatus];
        if (!workflowStep) {
            throw new Error(`Invalid application status: ${currentStatus}`);
        }

        if (!workflowStep.allowedRoles.includes(userRole)) {
            throw new Error(`Role '${userRole}' is not authorized to forward from status '${currentStatus}'. Expected roles: ${workflowStep.allowedRoles.join(', ')}`);
        }

        const newStatus = workflowStep.nextStatus;

        // Update application
        application.status = newStatus;
        application.updatedAt = ctx.stub.getTxTimestamp().seconds.toString();

        // Generate deterministic transaction ID
        const txId = ctx.stub.getTxID();
        const transactionId = 'TXN-' + ctx.stub.getTxTimestamp().seconds + '-' + txId.substr(0, 8);

        application.history.push({
            transactionId,
            officialId: cid.getAttributeValue('hf.EnrollmentID') || forwardData.performedBy,
            officialName: cid.getAttributeValue('hf.EnrollmentID') || forwardData.performedBy,
            designation: userRole,
            action: 'forwarded',
            remarks: forwardData.remarks || `Forwarded to ${newStatus}`,
            timestamp: ctx.stub.getTxTimestamp().seconds.toString(),
            data: forwardData,
            documents: []
        });

        // Store updated application
        await ctx.stub.putState(applicationId, Buffer.from(JSON.stringify(application)));

        console.info('============= END : Forward Application ===========');
        return JSON.stringify(application);
    }

    /**
     * Approve application by Collectorate
     */
    /**
     * Terminate/Complete application by Collectorate (Org3)
     * This involves reviewing docs, committing completeness, and issuing certificate
     */
    async approveByCollector(ctx, applicationId, approvalDataStr) {
        console.info('============= START : Approve by Collector (Org3) ===========');

        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        // Attribute-Based Access Control (ABAC)
        // Verify MSP
        if (mspId !== 'Org3MSP') {
            throw new Error('Only Collectorate Department (Org3) is authorized for final endorsement');
        }

        // Verify specific role from attributes if available, otherwise fallback to provided role
        const attrRole = cid.getAttributeValue('role');
        const approvalData = JSON.parse(approvalDataStr);
        const userRole = attrRole || approvalData.userRole;

        // Get existing application
        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`Application ${applicationId} does not exist`);
        }

        const application = JSON.parse(applicationAsBytes.toString());

        // Define transition logic
        const collectorateRoles = ['joint_collector', 'collector', 'district_collector', 'ministry_welfare'];
        if (!collectorateRoles.includes(userRole)) {
            throw new Error(`Role ${userRole} is not authorized within the Collectorate Department for this action`);
        }

        // Update application state
        if (userRole === 'ministry_welfare' || userRole === 'mw') {
            application.status = 'completed';
            application.certificateIssued = true;
            application.certificateId = 'CERT-' + applicationId + '-' + ctx.stub.getTxTimestamp().seconds;
        } else {
            application.status = 'approved_by_collector';
        }

        application.updatedAt = ctx.stub.getTxTimestamp().seconds.toString();
        application.collectorApproval = {
            ...approvalData,
            officialId: cid.getAttributeValue('hf.EnrollmentID') || approvalData.performedBy,
            timestamp: ctx.stub.getTxTimestamp().seconds.toString()
        };

        // Log access and completeness
        const txId = ctx.stub.getTxID();
        const transactionId = 'TXN-ORG3-' + ctx.stub.getTxTimestamp().seconds + '-' + txId.substr(0, 8);

        application.history.push({
            transactionId,
            officialId: cid.getAttributeValue('hf.EnrollmentID') || approvalData.performedBy,
            officialName: cid.getAttributeValue('hf.EnrollmentID') || approvalData.performedBy,
            designation: userRole,
            action: application.status === 'completed' ? 'final_endorsement_and_certification' : 'collectorate_approval',
            remarks: approvalData.remarks || `Final review and endorsement by Org3 (${userRole})`,
            timestamp: ctx.stub.getTxTimestamp().seconds.toString(),
            data: approvalData,
            documents: application.status === 'completed' ? ['FINAL_CERTIFICATE'] : []
        });

        // Store updated application
        await ctx.stub.putState(applicationId, Buffer.from(JSON.stringify(application)));

        console.info('============= END : Approve by Collector (Org3) ===========');
        return JSON.stringify(application);
    }

    /**
     * Get application by ID
     */
    async rejectApplication(ctx, applicationId, rejectDataStr) {
        console.info('============= START : Reject Application ===========');
        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`${applicationId} does not exist`);
        }

        const application = JSON.parse(applicationAsBytes.toString());
        const rejectData = JSON.parse(rejectDataStr);

        application.status = 'rejected';
        application.lastAction = 'reject';
        application.lastActionBy = rejectData.performedBy;
        application.lastActionAt = rejectData.performedAt;
        application.remarks = rejectData.remarks;

        if (!application.actionHistory) {
            application.actionHistory = [];
        }
        application.actionHistory.push({
            officialId: rejectData.performedBy,
            action: 'rejected',
            remarks: rejectData.remarks,
            timestamp: rejectData.performedAt
        });

        await ctx.stub.putState(applicationId, Buffer.from(JSON.stringify(application)));
        console.info('============= END : Reject Application ===========');
        return JSON.stringify(application);
    }

    async getApplication(ctx, applicationId) {
        console.info('============= START : Get Application ===========');

        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`Application ${applicationId} does not exist`);
        }

        console.info('============= END : Get Application ===========');
        return applicationAsBytes.toString();
    }

    /**
     * Get all land applications
     */
    async getAllLandRequest(ctx) {
        console.info('============= START : Get All Applications ===========');

        const allResults = [];
        // Range query with empty string for startKey and endKey does an open-ended query of all applications
        const iterator = await ctx.stub.getStateByRange('', '');

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({
                Key: result.value.key,
                Record: record
            });
            result = await iterator.next();
        }

        await iterator.close();
        console.info('============= END : Get All Applications ===========');
        return JSON.stringify(allResults);
    }

    /**
     * Get application history
     */
    async getHistory(ctx, applicationId) {
        console.info('============= START : Get History ===========');

        const applicationAsBytes = await ctx.stub.getState(applicationId);
        if (!applicationAsBytes || applicationAsBytes.length === 0) {
            throw new Error(`Application ${applicationId} does not exist`);
        }

        const application = JSON.parse(applicationAsBytes.toString());

        console.info('============= END : Get History ===========');
        return JSON.stringify(application.history || []);
    }

    /**
     * Query applications by status
     */
    async queryByStatus(ctx, status) {
        console.info('============= START : Query by Status ===========');

        const queryString = {
            selector: {
                status: status
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const allResults = [];

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({
                Key: result.value.key,
                Record: record
            });
            result = await iterator.next();
        }

        await iterator.close();
        console.info('============= END : Query by Status ===========');
        return JSON.stringify(allResults);
    }
}

module.exports = LandRegistrationContract;
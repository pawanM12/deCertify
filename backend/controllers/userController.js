// backend/controllers/userController.js
const User = require('../models/User');
const Organization = require('../models/Organization');
const CertificateRequest = require('../models/CertificateRequest');
const mongoose = require('mongoose'); // Import mongoose for isValidObjectId

// @desc    Get all registered organizations
// @route   GET /api/users/organizations
// @access  Public (or Private, depending on app logic)
const getOrganizations = async (req, res) => {
  try {
    // Find all users with userType 'organization'
    const organizations = await User.find({ userType: 'organization' }).select('name walletAddress');
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Server error fetching organizations.' });
  }
};

// @desc    Request a certificate from an organization
// @route   POST /api/users/request-certificate
// @access  Private (Student only)
const requestCertificate = async (req, res) => {
  const { organizationId, issuanceAmount } = req.body;
  const studentId = req.user._id; // Student ID from authenticated user

  // Validate organizationId
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return res.status(400).json({ message: 'Invalid organization ID.' });
  }

  try {
    // Ensure the requesting user is a student
    const student = await User.findById(studentId);
    if (!student || student.userType !== 'student') {
      return res.status(403).json({ message: 'Only students can request certificates.' });
    }

    // Ensure the target organization exists and is of type 'organization'
    const organization = await User.findById(organizationId);
    if (!organization || organization.userType !== 'organization') {
      return res.status(404).json({ message: 'Organization not found or is not a valid organization.' });
    }

    // Check for existing pending request to prevent duplicates
    const existingRequest = await CertificateRequest.findOne({
      student: studentId,
      organization: organizationId,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request with this organization.' });
    }

    // Create a new certificate request
    const certificateRequest = await CertificateRequest.create({
      student: studentId,
      organization: organizationId,
      issuanceAmount: issuanceAmount || 0, // Default to 0 if not provided
      status: 'pending',
    });

    res.status(201).json({
      message: 'Certificate request submitted successfully.',
      request: certificateRequest,
    });
  } catch (error) {
    console.error('Error submitting certificate request:', error);
    res.status(500).json({ message: 'Server error submitting request.' });
  }
};

// @desc    Get all requests for a specific organization
// @route   GET /api/users/organization-requests
// @access  Private (Organization only)
const getOrganizationRequests = async (req, res) => {
  const organizationId = req.user._id; // Organization ID from authenticated user

  try {
    // Ensure the requesting user is an organization
    const organizationUser = await User.findById(organizationId);
    if (!organizationUser || organizationUser.userType !== 'organization') {
      return res.status(403).json({ message: 'Only organizations can view these requests.' });
    }

    // Fetch requests where this organization is the target
    const requests = await CertificateRequest.find({ organization: organizationId })
      .populate('student', 'name walletAddress email') // Populate student details
      .select('-__v'); // Exclude __v field

    res.json(requests);
  } catch (error) {
    console.error('Error fetching organization requests:', error);
    res.status(500).json({ message: 'Server error fetching organization requests.' });
  }
};

// @desc    Get all requests made by a specific student
// @route   GET /api/users/student-requests
// @access  Private (Student only)
const getStudentRequests = async (req, res) => {
  const studentId = req.user._id; // Student ID from authenticated user

  try {
    // Ensure the requesting user is a student
    const studentUser = await User.findById(studentId);
    if (!studentUser || studentUser.userType !== 'student') {
      return res.status(403).json({ message: 'Only students can view their requests.' });
    }

    // Fetch requests made by this student
    const requests = await CertificateRequest.find({ student: studentId })
      .populate('organization', 'name walletAddress') // Populate organization details
      .select('-__v');

    res.json(requests);
  } catch (error) {
    console.error('Error fetching student requests:', error);
    res.status(500).json({ message: 'Server error fetching student requests.' });
  }
};

// @desc    Update a certificate request status (accept/reject)
// @route   PUT /api/users/request/:id/status
// @access  Private (Organization only)
const updateCertificateRequestStatus = async (req, res) => {
  const requestId = req.params.id;
  const { status, remarks } = req.body;
  const organizationId = req.user._id; // Organization ID from authenticated user

  // Validate requestId and status
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ message: 'Invalid request ID.' });
  }
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be "accepted" or "rejected".' });
  }

  try {
    // Ensure the requesting user is an organization
    const organizationUser = await User.findById(organizationId);
    if (!organizationUser || organizationUser.userType !== 'organization') {
      return res.status(403).json({ message: 'Only organizations can update request status.' });
    }

    // Find the request and ensure it belongs to this organization
    const request = await CertificateRequest.findOne({ _id: requestId, organization: organizationId });

    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found or you do not have permission to update it.' });
    }

    // Update the status and remarks
    request.status = status;
    if (remarks) {
      request.remarks = remarks;
    }
    await request.save();

    res.json({ message: `Request status updated to ${status}.`, request });
  } catch (error) {
    console.error('Error updating certificate request status:', error);
    res.status(500).json({ message: 'Server error updating request status.' });
  }
};

// @desc    Get received certificates for a student
// @route   GET /api/users/received-certificates
// @access  Private (Student only)
const getReceivedCertificates = async (req, res) => {
  const studentId = req.user._id; // Student ID from authenticated user

  try {
    const studentUser = await User.findById(studentId);
    if (!studentUser || studentUser.userType !== 'student') {
      return res.status(403).json({ message: 'Only students can view received certificates.' });
    }

    // Find requests that have been 'issued' for this student
    const issuedCertificates = await CertificateRequest.find({
      student: studentId,
      status: 'issued',
      ipfsHash: { $exists: true, $ne: null } // Ensure IPFS hash exists
    })
      .populate('organization', 'name walletAddress') // Populate organization details
      .select('-__v');

    res.json(issuedCertificates);
  } catch (error) {
    console.error('Error fetching received certificates:', error);
    res.status(500).json({ message: 'Server error fetching received certificates.' });
  }
};


module.exports = {
  getOrganizations,
  requestCertificate,
  getOrganizationRequests,
  getStudentRequests,
  updateCertificateRequestStatus,
  getReceivedCertificates,
};


// backend/routes/user.js
const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getOrganizations,
  requestCertificate,
  getOrganizationRequests,
  getStudentRequests,
  updateCertificateRequestStatus,
  getReceivedCertificates,
} = require('../controllers/userController');

const router = express.Router();

// Public route to get all registered organizations (can be made private if needed)
router.get('/organizations', getOrganizations);

// Private route for students to request a certificate
router.post('/request-certificate', protect, requestCertificate);

// Private route for organizations to get their pending/all requests
router.get('/organization-requests', protect, getOrganizationRequests);

// Private route for students to get their requests
router.get('/student-requests', protect, getStudentRequests);

// Private route for organizations to update request status (accept/reject)
router.put('/request/:id/status', protect, updateCertificateRequestStatus);

// Private route for students to get their received certificates
router.get('/received-certificates', protect, getReceivedCertificates);

module.exports = router;


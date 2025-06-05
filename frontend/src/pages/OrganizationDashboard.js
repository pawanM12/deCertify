// frontend/src/pages/OrganizationDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import axios from 'axios';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
// Removed: import { QRCodeSVG } from 'qrcode.react'; // No longer needed for display

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

function OrganizationDashboard() {
  const { user, logout, updateBlockchainStatus } = useAuth();
  const { contract, address, isConnected, connectWallet, loading: web3Loading, error: web3Error } = useWeb3();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('account');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // For file upload feedback
  // Removed: [qrCodeDataUrl, setQrCodeDataUrl] as QR is embedded

  const [loading, setLoading] = useState(false); // General loading for data fetches
  const [error, setError] = useState(null); // General error for data fetches
  const [orgIssuanceFee, setOrgIssuanceFee] = useState(0n); // State to store organization's own issuance fee from blockchain
  const [orgVerificationCharge, setOrgVerificationCharge] = useState(0n); // State to store organization's own verification charge from blockchain
  const [fetchingOrgFees, setFetchingOrgFees] = useState(true); // Loading state for fetching org fees

  // Function to fetch all requests for this organization
  const fetchOrganizationRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/users/organization-requests`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setAllRequests(response.data);
      setPendingRequests(response.data.filter(req => req.status === 'pending'));
    } catch (err) {
      console.error('Error fetching organization requests:', err);
      setError(err.response?.data?.message || 'Failed to fetch organization requests.');
    } finally {
      setLoading(false);
    }
  }, [user?.token]); // Dependency on user.token

  // Function to fetch organization's own fees from the blockchain
  const fetchMyOrganizationFees = useCallback(async () => {
    setFetchingOrgFees(true);
    if (!isConnected || !contract || !address) {
      setFetchingOrgFees(false);
      return;
    }
    try {
      const orgDetails = await contract.organizations(address);
      if (orgDetails.isRegistered) {
        setOrgIssuanceFee(orgDetails.issuanceFee);
        setOrgVerificationCharge(orgDetails.verificationCharge);
      } else {
        // This case should ideally not happen if user.isBlockchainRegistered is true
        console.warn('Current organization not registered on blockchain when trying to fetch fees.');
      }
    } catch (err) {
      console.error('Error fetching organization fees from blockchain:', err);
      setError(`Failed to fetch your organization's fees: ${err.message || err.reason}`);
    } finally {
      setFetchingOrgFees(false);
    }
  }, [isConnected, contract, address]); // Dependencies for this callback

  useEffect(() => {
    if (user && user.userType !== 'organization') {
      setError('Access Denied: Only organizations can view this dashboard.');
      return;
    }

    if (user?.token) {
      fetchOrganizationRequests();
    }
  }, [user, fetchOrganizationRequests]);

  // Effect to fetch organization's fees when connected or contract is ready
  useEffect(() => {
    if (isConnected && contract && address && user?.isBlockchainRegistered) {
      fetchMyOrganizationFees();
    }
  }, [isConnected, contract, address, user?.isBlockchainRegistered, fetchMyOrganizationFees]);


  // Removed: handleUpdateBlockchainFees function as fees are now set during registration

  // Handle file selection
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setUploadStatus(null);
    // Removed: setQrCodeDataUrl('')
  };

  // Handle accepting a request and uploading document
  const handleAcceptRequest = async (requestId, studentWalletAddress) => {
    setLoading(true);
    setUploadStatus(null);
    setError(null);

    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Please select a document to upload.' });
      setLoading(false);
      return;
    }
    if (!isConnected || !address || !contract) {
      setError('Please connect your wallet and ensure contract is loaded.');
      setLoading(false);
      return;
    }
    if (!user.isBlockchainRegistered) {
      setError('Your organization must be registered on the blockchain first (Account Details tab).');
      setLoading(false);
      return;
    }
    if (fetchingOrgFees) {
      setError('Still fetching organization fees. Please wait.');
      setLoading(false);
      return;
    }

    try {
      // First, update backend request status to 'accepted'
      await axios.put(`${API_URL}/users/request/${requestId}/status`,
        { status: 'accepted' },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('document', selectedFile);

      // Upload document to IPFS via backend (backend now handles QR embedding)
      const uploadResponse = await axios.post(`${API_URL}/ipfs/upload-document/${requestId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });

      // The backend now returns the IPFS hash of the *QR-embedded* PDF
      const { pdfIpfsHash } = uploadResponse.data; // newQrCodeDataUrl is no longer returned

      // Now, call the smart contract to issue the certificate
      // Include the issuance fee (orgIssuanceFee) as value in the transaction
      console.log(`Issuing certificate with fee: ${ethers.formatEther(orgIssuanceFee)} CELO`);
      const tx = await contract.issueCertificate(studentWalletAddress, pdfIpfsHash, {
        value: orgIssuanceFee // Pass the organization's own issuance fee
      });
      await tx.wait();

      setUploadStatus({ type: 'success', message: 'Document uploaded, QR code embedded in PDF, and certificate issued on blockchain!' });
      // Removed: setQrCodeDataUrl as QR is not displayed on frontend
      setSelectedFile(null); // Clear selected file
      fetchOrganizationRequests(); // Refresh requests list
    } catch (err) {
      console.error('Error accepting request and uploading document:', err);
      let errorMessage = err.response?.data?.message || err.message || 'Failed to accept request and upload document.';
      if (err.reason) { // Ethers.js revert reason
        errorMessage = `Blockchain Error: ${err.reason}`;
      } else if (err.data?.message) { // MetaMask RPC error message
        errorMessage = `Blockchain Error: ${err.data.message}`;
      }
      setUploadStatus({ type: 'error', message: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle rejecting a request
  const handleRejectRequest = async (requestId, remarks) => {
    setLoading(true);
    setUploadStatus(null);
    setError(null);
    try {
      await axios.put(`${API_URL}/users/request/${requestId}/status`,
        { status: 'rejected', remarks },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setUploadStatus({ type: 'success', message: 'Request rejected successfully.' });
      fetchOrganizationRequests(); // Refresh requests list
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err.response?.data?.message || err.message || 'Failed to reject request.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(120deg, #ecebff 0%, #e0f7fa 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '0',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1100,
        margin: '48px 0',
        borderRadius: 32,
        boxShadow: '0 8px 32px var(--shadow-color)',
        background: 'linear-gradient(135deg, #fff 60%, #ecebff 100%)',
        padding: '40px 32px',
        minHeight: 600,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}>
          <div>
            <h1 style={{ color: 'var(--primary-color)', fontWeight: 900, fontSize: '2.3em', margin: 0, letterSpacing: '-0.5px' }}>
              Welcome, {user.name}
            </h1>
            <div style={{ color: 'var(--secondary-color)', fontWeight: 700, fontSize: '1.1em', marginTop: 4 }}>
              Organization Dashboard
            </div>
          </div>
          <button onClick={handleLogout} className="button button-outline" style={{ fontWeight: 700, fontSize: '1.08em', padding: '10px 24px' }}>Logout</button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 32 }}>
          <button className={`tab-button${activeTab === 'account' ? ' active' : ''}`} onClick={() => setActiveTab('account')}>Account</button>
          <button className={`tab-button${activeTab === 'pending-requests' ? ' active' : ''}`} onClick={() => setActiveTab('pending-requests')}>Pending Requests</button>
          <button className={`tab-button${activeTab === 'all-requests' ? ' active' : ''}`} onClick={() => setActiveTab('all-requests')}>All Requests</button>
        </div>

        {/* Alerts */}
        {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}
        {uploadStatus && <div className={`alert alert-${uploadStatus.type}`} style={{ marginBottom: 24 }}>{uploadStatus.message}</div>}
        {web3Error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{web3Error}</div>}

        {/* Tab Content */}
        <div>
          {activeTab === 'account' && (
            <div className="card" style={{ marginBottom: 32, borderRadius: 24, boxShadow: '0 4px 24px var(--shadow-color)', padding: '32px 24px', background: 'linear-gradient(135deg, #f8f9fb 60%, #ecebff 100%)' }}>
              <h2 style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.5em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>🏢</span> Account Details
              </h2>
              <div style={{ color: '#888', fontSize: '1.08em', marginBottom: 18 }}>
                View and manage your organization account information.
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '18px 0 24px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 22 }}>🏢</span><span style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>Name:</span> <span style={{ marginLeft: 6 }}>{user.name}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 22 }}>📧</span><span style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>Email:</span> <span style={{ marginLeft: 6 }}>{user.email || 'N/A'}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 22 }}>💼</span><span style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>Wallet:</span> <span style={{ marginLeft: 6 }}>{address}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 22 }}>🏷️</span><span style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>User Type:</span> <span style={{ marginLeft: 6 }}>Organization</span></div>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
                <div className="alert" style={{ background: user.isBlockchainRegistered ? '#e0f7fa' : '#fff3e0', color: user.isBlockchainRegistered ? '#155724' : '#b26a00', border: 'none', fontWeight: 700, fontSize: '1.08em', flex: 1 }}>
                  <span style={{ fontSize: 20 }}>{user.isBlockchainRegistered ? '✅' : '⚠️'}</span> Blockchain Registered: {user.isBlockchainRegistered ? 'Yes' : 'No'}
                </div>
                <div className="alert" style={{ background: isConnected ? '#e8f5e9' : '#ffebee', color: isConnected ? '#388e3c' : '#c62828', border: 'none', fontWeight: 700, fontSize: '1.08em', flex: 1 }}>
                  <span style={{ fontSize: 20 }}>{isConnected ? '🔗' : '❌'}</span> Wallet Status: {isConnected ? `Connected (${address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'N/A'})` : 'Disconnected'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pending-requests' && (
            <div className="card" style={{ marginBottom: 32, borderRadius: 24, boxShadow: '0 4px 24px var(--shadow-color)', padding: '32px 24px' }}>
              <h2 style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.5em', marginBottom: 18 }}>Pending Certificate Requests</h2>
              {loading ? (
                <div className="spinner"></div>
              ) : pendingRequests.length === 0 ? (
                <div className="alert alert-info">No pending requests.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Student Wallet</th>
                        <th>Requested On</th>
                        <th>Issuance Amount (CELO)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((req) => (
                        <tr key={req._id}>
                          <td>{req.student?.name || 'N/A'}</td>
                          <td>{req.student?.walletAddress ? `${req.student.walletAddress.substring(0, 6)}...${req.student.walletAddress.substring(req.student.walletAddress.length - 4)}` : 'N/A'}</td>
                          <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td>{ethers.formatEther(req.issuanceAmount || 0)}</td>
                          <td>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handleFileChange}
                              style={{ marginBottom: '10px' }}
                              disabled={loading}
                            />
                            {selectedFile && (
                              <p style={{ fontSize: '0.9em', color: 'gray' }}>Selected: {selectedFile.name}</p>
                            )}
                            <button
                              onClick={() => handleAcceptRequest(req._id, req.student.walletAddress)}
                              className="button button-primary"
                              style={{ marginRight: '10px', padding: '8px 15px', fontSize: '0.9em' }}
                              disabled={loading || !selectedFile || !isConnected || !user.isBlockchainRegistered || fetchingOrgFees}
                            >
                              {loading ? <div className="spinner"></div> : 'Accept & Upload'}
                            </button>
                            <button
                              onClick={() => {
                                const remarks = prompt('Enter remarks for rejection (optional):');
                                handleRejectRequest(req._id, remarks);
                              }}
                              className="button button-danger"
                              style={{ padding: '8px 15px', fontSize: '0.9em', backgroundColor: 'var(--danger-color)' }}
                              disabled={loading}
                            >
                              Reject
                            </button>
                            {uploadStatus && (
                              <div className={`alert alert-${uploadStatus.type}`} style={{ marginTop: '10px' }}>
                                {uploadStatus.message}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'all-requests' && (
            <div className="card" style={{ marginBottom: 32, borderRadius: 24, boxShadow: '0 4px 24px var(--shadow-color)', padding: '32px 24px' }}>
              <h2 style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.5em', marginBottom: 18 }}>All Certificate Requests</h2>
              {loading ? (
                <div className="spinner"></div>
              ) : allRequests.length === 0 ? (
                <div className="alert alert-info">No requests found.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 1100 }}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Status</th>
                        <th>IPFS Hash</th>
                        <th>Remarks</th>
                        <th>Requested On</th>
                        <th>Issued On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRequests.map((req) => (
                        <tr key={req._id}>
                          <td>{req.student?.name || 'N/A'}</td>
                          <td>{req.status}</td>
                          <td>
                            {req.ipfsHash ? (
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${req.ipfsHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--secondary-color)', textDecoration: 'underline' }}
                              >
                                {req.ipfsHash.substring(0, 10)}...
                              </a>
                            ) : 'N/A'}
                          </td>
                          <td>{req.remarks || 'N/A'}</td>
                          <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td>{req.issuedAt ? new Date(req.issuedAt).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizationDashboard;


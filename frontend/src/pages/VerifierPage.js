// frontend/src/pages/VerifierPage.js
import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

function VerifierPage() {
  const { contract, isConnected, connectWallet, loading: web3Loading, error: web3Error } = useWeb3();

  const [certificateId, setCertificateId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerificationResult(null);
    setError(null);

    if (!isConnected || !contract) {
      setError('Please connect your wallet to verify certificates.');
      return;
    }
    if (!certificateId) {
      setError('Please enter a Certificate ID.');
      return;
    }

    setLoading(true);
    try {
      // Convert certificateId to BigInt for contract call using ethers.toBigInt()
      const id = ethers.toBigInt(certificateId); // Changed from BigInt(certificateId)

      // Call the verifyCertificate function on the smart contract
      // This function is payable, so we need to send value if the organization has a verificationCharge
      // For now, we'll assume 0 value, but in a real scenario, you'd fetch the charge
      // and prompt the user to send that amount.
      // Example: const tx = await contract.verifyCertificate(id, { value: ethers.parseEther("0.005") });
      const [isValid, ipfsHash] = await contract.verifyCertificate(id);

      if (isValid) {
        setVerificationResult({
          type: 'success',
          message: 'Certificate is valid!',
          ipfsHash: ipfsHash,
        });
      } else {
        setVerificationResult({
          type: 'error',
          message: 'Certificate is invalid or has been revoked.',
        });
      }
    } catch (err) {
      console.error('Error verifying certificate:', err);
      // Check for specific error messages from require statements
      let errorMessage = err.message || 'Failed to verify certificate.';
      if (err.reason) {
        errorMessage = `Blockchain Error: ${err.reason}`;
      } else if (err.data?.message) {
        errorMessage = `Blockchain Error: ${err.data.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '30px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--primary-color)', marginBottom: '25px' }}>Verify Certificate</h1>
        <p style={{ marginBottom: '20px' }}>
          Enter the Certificate ID (found on the certificate or by scanning its QR code) to verify its authenticity on the Celo blockchain.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {web3Error && <div className="alert alert-error">{web3Error}</div>}

        <div style={{ marginBottom: '20px' }}>
          {!isConnected ? (
            <button onClick={connectWallet} className="button button-primary" disabled={web3Loading}>
              {web3Loading ? 'Connecting Wallet...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="alert alert-info">
              Wallet Connected: {contract.runner.address ? `${contract.runner.address.substring(0, 6)}...${contract.runner.address.substring(contract.runner.address.length - 4)}` : 'N/A'}
            </div>
          )}
        </div>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="certificateId">Certificate ID:</label>
            <input
              type="text"
              id="certificateId"
              className="input-field"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              placeholder="e.g., 1, 2, 3..."
              required
              disabled={loading || !isConnected}
            />
          </div>
          <button type="submit" className="button button-primary" disabled={loading || !isConnected || !certificateId}>
            {loading ? <div className="spinner"></div> : 'Verify Certificate'}
          </button>
        </form>

        {verificationResult && (
          <div className={`alert alert-${verificationResult.type}`} style={{ marginTop: '20px' }}>
            <p>{verificationResult.message}</p>
            {verificationResult.ipfsHash && (
              <p>
                Document IPFS Hash: {' '}
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${verificationResult.ipfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--secondary-color)', textDecoration: 'underline' }}
                >
                  {verificationResult.ipfsHash}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifierPage;


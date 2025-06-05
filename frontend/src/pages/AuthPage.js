// frontend/src/pages/AuthPage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, login, isAuthenticated, user, loading: authLoading, error: authError, updateBlockchainStatus } = useAuth();
  const { connectWallet, address, isConnected, contract, loading: web3Loading, error: web3Error } = useWeb3();

  const isRegisterPage = location.pathname === '/register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('student'); // Default to student
  const [issuanceFeeInput, setIssuanceFeeInput] = useState(''); // New state for organization issuance fee
  const [verificationChargeInput, setVerificationChargeInput] = useState(''); // New state for organization verification charge

  const [formError, setFormError] = useState(null); // For form-specific errors
  const [blockchainRegistrationLoading, setBlockchainRegistrationLoading] = useState(false);
  const [blockchainRegistrationError, setBlockchainRegistrationError] = useState(null);


  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.userType === 'student') {
        navigate('/student-dashboard');
      } else if (user.userType === 'organization') {
        navigate('/organization-dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleConnectWallet = async () => {
    setFormError(null);
    try {
      await connectWallet();
    } catch (err) {
      // Error handled by Web3Context, but can set a local form error if needed
      setFormError('Failed to connect wallet. Please ensure MetaMask/CeloExtensionWallet is installed and connected to Alfajores.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setBlockchainRegistrationError(null); // Clear blockchain errors on new submission

    if (!isConnected || !address) {
      setFormError('Please connect your wallet first.');
      return;
    }

    if (isRegisterPage) {
      if (!name || !userType) {
        setFormError('Please fill in Name and select User Type.');
        return;
      }
      if (password && password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }

      setBlockchainRegistrationLoading(true); // Start loading for blockchain registration
      try {
        // 1. Register user on backend (MongoDB)
        const registeredUser = await register(address, name, userType, password, email);

        // 2. Register user on Celo blockchain
        if (!contract) {
          throw new Error('Blockchain contract not loaded. Ensure wallet is connected and on Alfajores.');
        }

        let tx;
        if (userType === 'student') {
          console.log('Registering student on blockchain...');
          tx = await contract.registerStudent(name);
        } else if (userType === 'organization') {
          console.log('Registering organization on blockchain...');
          // Parse fees to Wei from input fields
          const feeWei = issuanceFeeInput ? ethers.parseEther(issuanceFeeInput) : 0n;
          const chargeWei = verificationChargeInput ? ethers.parseEther(verificationChargeInput) : 0n;
          tx = await contract.registerOrganization(name, chargeWei, feeWei);
        }

        if (tx) {
          await tx.wait(); // Wait for the transaction to be mined
          console.log('Blockchain registration successful for:', userType, 'Tx Hash:', tx.hash);

          // 3. Update blockchain registration status in backend
          await updateBlockchainStatus(registeredUser._id, registeredUser.token);
          setBlockchainRegistrationLoading(false);
          // Redirect will happen via useEffect due to isAuthenticated and user update
        } else {
          throw new Error('No blockchain transaction initiated.');
        }

      } catch (err) {
        setBlockchainRegistrationLoading(false);
        console.error('Full registration process failed:', err);
        const errorMessage = err.message || 'Registration failed.';
        setFormError(errorMessage);
        setBlockchainRegistrationError(`Blockchain registration failed: ${err.reason || err.message}`);
      }
    } else { // Login Page
      if (!address) {
        setFormError('Please connect your wallet.');
        return;
      }
      try {
        await login(address, password);
        // Login success handled by useEffect redirect
      } catch (err) {
        setFormError(err.message);
      }
    }
  };

  const isLoading = authLoading || web3Loading || blockchainRegistrationLoading;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(120deg, #ecebff 0%, #e0f7fa 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '44px 32px 36px 32px',
        textAlign: 'center',
        borderRadius: '32px',
        boxShadow: '0 8px 32px var(--shadow-color)',
        background: 'linear-gradient(135deg, #fff 60%, #ecebff 100%)',
        margin: '40px 0',
      }}>
        <h2 style={{
          color: 'var(--primary-color)',
          marginBottom: '10px',
          fontSize: '2.3em',
          fontWeight: 900,
          letterSpacing: '-0.5px',
        }}>
          {isRegisterPage ? 'Register' : 'Login'} to deCertify
        </h2>
        <div style={{
          color: 'var(--secondary-color)',
          fontSize: '1.15em',
          marginBottom: '28px',
          fontWeight: 600,
        }}>
          {isRegisterPage
            ? 'Create your account and join the next generation of secure, verifiable credentials.'
            : 'Login securely with your wallet and password.'}
        </div>

        {formError && <div className="alert alert-error">{formError}</div>}
        {authError && <div className="alert alert-error">{authError}</div>}
        {web3Error && <div className="alert alert-error">{web3Error}</div>}
        {blockchainRegistrationError && <div className="alert alert-error">{blockchainRegistrationError}</div>}

        <div style={{ marginBottom: '24px' }}>
          {!isConnected || !address ? (
            <button onClick={handleConnectWallet} className="button button-primary" disabled={isLoading} style={{ fontSize: '1.1em', fontWeight: 700, width: '100%' }}>
              {web3Loading ? 'Connecting Wallet...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="alert alert-info" style={{ fontWeight: 600, fontSize: '1.1em', background: '#e0f7fa', color: 'var(--primary-color)', border: 'none', boxShadow: '0 2px 8px var(--shadow-color)' }}>
              Wallet Connected: {address.substring(0, 6)}...{address.substring(address.length - 4)}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {isRegisterPage && (
            <>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label htmlFor="name" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>Name:</label>
                <input
                  type="text"
                  id="name"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ fontSize: '1.08em', fontWeight: 500 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label htmlFor="email" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>Email (Optional):</label>
                <input
                  type="email"
                  id="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  style={{ fontSize: '1.08em', fontWeight: 500 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label htmlFor="userType" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>User Type:</label>
                <select
                  id="userType"
                  className="input-field"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ fontSize: '1.08em', fontWeight: 500 }}
                >
                  <option value="student">Student</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
              {userType === 'organization' && (
                <>
                  <div className="form-group" style={{ marginBottom: 22 }}>
                    <label htmlFor="issuanceFee" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>Default Issuance Fee (CELO, optional):</label>
                    <input
                      type="number"
                      id="issuanceFee"
                      className="input-field"
                      value={issuanceFeeInput}
                      onChange={(e) => setIssuanceFeeInput(e.target.value)}
                      placeholder="e.g., 0.01"
                      disabled={isLoading}
                      style={{ fontSize: '1.08em', fontWeight: 500 }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 22 }}>
                    <label htmlFor="verificationCharge" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>Default Verification Charge (CELO, optional):</label>
                    <input
                      type="number"
                      id="verificationCharge"
                      className="input-field"
                      value={verificationChargeInput}
                      onChange={(e) => setVerificationChargeInput(e.target.value)}
                      placeholder="e.g., 0.01"
                      disabled={isLoading}
                      style={{ fontSize: '1.08em', fontWeight: 500 }}
                    />
                  </div>
                </>
              )}
            </>
          )}
          <div className="form-group" style={{ marginBottom: 22 }}>
            <label htmlFor="password" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>Password:</label>
            <input
              type="password"
              id="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              style={{ fontSize: '1.08em', fontWeight: 500 }}
            />
          </div>
          {isRegisterPage && (
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label htmlFor="confirmPassword" style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.08em' }}>Confirm Password:</label>
              <input
                type="password"
                id="confirmPassword"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{ fontSize: '1.08em', fontWeight: 500 }}
              />
            </div>
          )}
          <button type="submit" className="button button-primary" style={{ width: '100%', fontSize: '1.15em', fontWeight: 700, marginTop: 10 }} disabled={isLoading}>
            {isRegisterPage ? (isLoading ? 'Registering...' : 'Register') : (isLoading ? 'Logging in...' : 'Login')}
          </button>
        </form>
        <div style={{ marginTop: 28, fontSize: '1.08em', color: '#888', fontWeight: 500 }}>
          {isRegisterPage ? (
            <>Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Login</Link></>
          ) : (
            <>Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Register</Link></>
          )}
        </div>
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--secondary-color)',
          fontWeight: 700,
          fontSize: '1.08em',
          textDecoration: 'none',
          marginTop: 24,
          transition: 'color 0.2s',
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🏠</span> Home
        </Link>
      </div>
    </div>
  );
}

export default AuthPage;


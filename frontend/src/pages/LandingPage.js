// frontend/src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

function LandingPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isConnected, connectWallet, disconnectWallet, address, loading: web3Loading, error: web3Error } = useWeb3();

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const handleLogout = () => {
    logout();
    disconnectWallet();
  };

  return (
    <>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 4vw',
        background: 'linear-gradient(90deg, #6C63FF 0%, #43BCCD 100%)',
        color: '#fff',
        minHeight: 64,
        boxShadow: '0 2px 12px rgba(108,99,255,0.08)',
        position: 'relative',
        zIndex: 10,
        marginBottom: 0,
        borderRadius: 0,
      }}>
        <div style={{ fontWeight: 900, fontSize: '2em', color: '#fff', letterSpacing: '-1px' }}>deCertify</div>
        <nav style={{ display: 'flex', gap: 24 }}>
          {!isAuthenticated ? (
            <>
              <Link to="/register" className="button button-outline" style={{ color: '#fff', borderColor: '#fff' }}>Register</Link>
              <Link to="/login" className="button button-outline" style={{ color: '#fff', borderColor: '#fff' }}>Login</Link>
            </>
          ) : (
            <>
              {user && user.userType === 'student' && (
                <Link to="/student-dashboard" className="button button-outline" style={{ color: '#fff', borderColor: '#fff' }}>Dashboard</Link>
              )}
              {user && user.userType === 'organization' && (
                <Link to="/organization-dashboard" className="button button-outline" style={{ color: '#fff', borderColor: '#fff' }}>Dashboard</Link>
              )}
              <button onClick={handleLogout} className="button button-outline" style={{ color: '#fff', borderColor: '#fff' }}>Logout</button>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        width: '100%',
        background: 'linear-gradient(100deg, #ecebff 0%, #e0f7fa 100%)',
        padding: '80px 0 80px 0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '4.5em', color: 'var(--primary-color)', marginBottom: 18, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>Secure e-Certificates on Blockchain</h1>
          <p style={{
            fontSize: '1.7em',
            fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
            color: 'transparent',
            background: 'linear-gradient(90deg, #6C63FF 0%, #43BCCD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
            lineHeight: 1.4,
            letterSpacing: '0.02em',
            maxWidth: 900,
            margin: '0 auto 44px',
            textShadow: '0 2px 12px rgba(108,99,255,0.08)',
          }}>
            The next generation platform for issuing, verifying, and managing academic and professional certificates—secure, instant, and tamper-proof, powered by Celo Blockchain.
          </p>
          <div className="button-group" style={{ justifyContent: 'center', marginBottom: 24 }}>
            {!isAuthenticated && <Link to="/register" className="button button-primary" style={{ fontSize: '1.2em', fontWeight: 700 }}>Get Started</Link>}
            <Link to="/verify" className="button button-outline" style={{ fontSize: '1.2em', fontWeight: 700 }}>Verify Certificate</Link>
          </div>
          <div style={{ fontSize: '1.1em', color: '#555', marginTop: 16 }}>
            <span style={{ background: '#fff', borderRadius: 16, padding: '8px 18px', boxShadow: '0 2px 8px var(--shadow-color)', display: 'inline-block' }}>
              Trusted by organizations, universities, and professionals worldwide
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="main-grid" style={{ maxWidth: 1200, margin: '48px auto 0 auto', padding: '0 0 0 0', gap: 48 }}>
        <div className="card" style={{
          minHeight: 240,
          background: 'linear-gradient(135deg, #e0f7fa 0%, #f8f9fb 100%)',
          borderRadius: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px var(--shadow-color)',
          margin: '0 0 32px 0',
          padding: '40px 32px',
        }}>
          <div style={{ fontSize: 56, marginBottom: 18, color: 'var(--primary-color)' }}>🔍</div>
          <h2 style={{ color: 'var(--secondary-color)', fontSize: '2.2em', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px', textAlign: 'center' }}>Instant Verification</h2>
          <div style={{ color: '#43BCCD', fontSize: '1.1em', marginBottom: 12, fontWeight: 700, textAlign: 'center' }}>No more waiting weeks for manual checks</div>
          <p style={{ fontSize: '1.18em', fontWeight: 500, color: '#333', lineHeight: 1.6, textAlign: 'center', maxWidth: 340 }}>
            Verify certificates instantly from anywhere in the world. Our blockchain-backed system ensures authenticity in seconds.
          </p>
        </div>
        <div className="card" style={{
          minHeight: 240,
          background: 'linear-gradient(135deg, #fff3e0 0%, #f8f9fb 100%)',
          borderRadius: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px var(--shadow-color)',
          margin: '0 0 32px 0',
          padding: '40px 32px',
        }}>
          <div style={{ fontSize: 56, marginBottom: 18, color: 'var(--primary-color)' }}>🛡️</div>
          <h2 style={{ color: 'var(--secondary-color)', fontSize: '2.2em', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px', textAlign: 'center' }}>Tamper-Proof Records</h2>
          <div style={{ color: '#FFA726', fontSize: '1.1em', marginBottom: 12, fontWeight: 700, textAlign: 'center' }}>Immutable, secure, and transparent</div>
          <p style={{ fontSize: '1.18em', fontWeight: 500, color: '#333', lineHeight: 1.6, textAlign: 'center', maxWidth: 340 }}>
            All documents are cryptographically secured and stored on the blockchain, making forgery impossible and verification effortless.
          </p>
        </div>
        <div className="card" style={{
          minHeight: 240,
          background: 'linear-gradient(135deg, #e8f5e9 0%, #f8f9fb 100%)',
          borderRadius: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px var(--shadow-color)',
          margin: '0 0 32px 0',
          padding: '40px 32px',
        }}>
          <div style={{ fontSize: 56, marginBottom: 18, color: 'var(--primary-color)' }}>🤝</div>
          <h2 style={{ color: 'var(--secondary-color)', fontSize: '2.2em', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px', textAlign: 'center' }}>Seamless Integration</h2>
          <div style={{ color: '#66BB6A', fontSize: '1.1em', marginBottom: 12, fontWeight: 700, textAlign: 'center' }}>For organizations, students, and verifiers</div>
          <p style={{ fontSize: '1.18em', fontWeight: 500, color: '#333', lineHeight: 1.6, textAlign: 'center', maxWidth: 340 }}>
            Organizations and students can issue, request, and manage certificates with a simple, intuitive interface and optional verification fees.
          </p>
        </div>
      </section>

      {/* Wallet Status */}
      <section style={{ maxWidth: 800, margin: '48px auto 48px auto', padding: '0', }}>
        <div style={{
          background: 'linear-gradient(135deg, #f3e5f5 0%, #f8f9fb 100%)',
          borderRadius: 32,
          boxShadow: '0 8px 32px var(--shadow-color)',
          padding: '48px 32px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <h3 style={{ color: 'var(--primary-color)', fontWeight: 900, marginBottom: 18, fontSize: '2em', letterSpacing: '-0.5px', textAlign: 'center' }}>Wallet & Account Status</h3>
          <div style={{ color: '#8e24aa', fontSize: '1.15em', marginBottom: 22, fontWeight: 600, textAlign: 'center', maxWidth: 500 }}>
            Connect your wallet to access all features, issue or verify certificates, and manage your blockchain identity.
          </div>
          {web3Loading && <div className="spinner"></div>}
          {web3Error && <div className="alert alert-error">{web3Error}</div>}
          {isConnected ? (
            <div className="alert alert-success" style={{ justifyContent: 'center', fontSize: '1.15em', fontWeight: 700, marginBottom: 10 }}>
              Connected: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'N/A'}
              <button onClick={disconnectWallet} className="button button-outline" style={{ marginLeft: 16, fontSize: '1em' }}>Disconnect</button>
            </div>
          ) : (
            <button onClick={handleConnectWallet} className="button button-primary" disabled={web3Loading} style={{ fontSize: '1.15em', fontWeight: 700, marginBottom: 10 }}>
              {web3Loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          {isAuthenticated && user && (
            <div className="alert alert-info" style={{ marginTop: 14, fontSize: '1.1em', fontWeight: 600, textAlign: 'center' }}>
              {user.name} ({user.userType})
              {user.isBlockchainRegistered ? ' (Blockchain Registered)' : ' (Not Blockchain Registered)'}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', color: '#aaa', fontSize: '1em', padding: '18px 0 8px 0' }}>
        &copy; {new Date().getFullYear()} deCertify. All rights reserved.
      </footer>
    </>
  );
}

export default LandingPage;


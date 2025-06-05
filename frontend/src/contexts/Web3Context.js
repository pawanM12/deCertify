// frontend/src/contexts/Web3Context.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
// Removed: import { Web3Modal } from '@web3modal/standalone'; // No longer needed for MetaMask-only

// Import your contract ABI
import deCertifyAbi from '../artifacts/deCertify.json'; // Path to your compiled ABI

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Removed: Ref to hold the Web3Modal instance (web3modalRef)

  // Replace with your deployed contract address
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

  // Removed: useEffect for Web3Modal initialization as it's no longer needed

  // Function to disconnect from Web3 wallet
  const disconnectWallet = useCallback(() => {
    // For MetaMask, disconnecting usually means resetting state in the app
    // The wallet itself remains connected to the dApp unless user manually disconnects
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setContract(null);
    setIsConnected(false);
    setError(null);
    console.log('Wallet disconnected.');
  }, []);

  // Function to connect to Web3 wallet (MetaMask only)
  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check if MetaMask (or other injected provider) is installed
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed. Please install MetaMask to use this dApp.');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting to connect to MetaMask...');
      // Request account access from MetaMask
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await newProvider.send("eth_requestAccounts", []); // Request accounts explicitly
      const newAddress = accounts[0]; // Get the first connected account

      const newSigner = await newProvider.getSigner(newAddress); // Get signer for the connected account

      // Get chain ID to ensure it's Alfajores
      const { chainId } = await newProvider.getNetwork();
      if (chainId !== 44787n) { // 44787 is the chain ID for Celo Alfajores
        setError('Please switch to Celo Alfajores Testnet in your wallet.');
        setLoading(false);
        disconnectWallet(); // Disconnect if wrong chain
        return;
      }

      // Initialize contract instance
      const deCertifyContract = new ethers.Contract(contractAddress, deCertifyAbi.abi, newSigner);

      setProvider(newProvider);
      setSigner(newSigner);
      setAddress(newAddress);
      setContract(deCertifyContract);
      setIsConnected(true);
      console.log('MetaMask connected:', newAddress);

      // Listen for account changes and chain changes
      // These listeners are crucial for real-time updates if the user changes accounts or networks in MetaMask
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User disconnected all accounts or locked wallet
          disconnectWallet();
        } else {
          // Account changed, update address and re-initialize signer/contract
          setAddress(accounts[0]);
          newProvider.getSigner(accounts[0]).then(s => setSigner(s));
          setContract(new ethers.Contract(contractAddress, deCertifyAbi.abi, newSigner));
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        // Chain changed, check if it's still Alfajores, otherwise disconnect
        if (parseInt(chainId, 16) !== 44787) { // Chain ID is a hex string
          setError('Please switch to Celo Alfajores Testnet in your wallet.');
          disconnectWallet();
        } else {
          // If chain is correct, re-initialize provider, signer, contract
          newProvider.getSigner(newAddress).then(s => setSigner(s));
          setContract(new ethers.Contract(contractAddress, deCertifyAbi.abi, newSigner));
        }
      });

      // MetaMask doesn't have a 'disconnect' event for dApp-initiated disconnects
      // The 'disconnect' event is for when the chain is disconnected or the wallet is locked.
      // We rely on accountsChanged for user-initiated disconnects (e.g., switching accounts to none).

    } catch (err) {
      console.error('Error connecting wallet:', err);
      // User rejected connection, or other MetaMask error
      setError('Failed to connect to MetaMask. ' + (err.message || ''));
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [contractAddress, disconnectWallet]);

  // Auto-connect on load if MetaMask is already connected
  useEffect(() => {
    const checkMetaMaskConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          // listAccounts() returns an array of addresses currently connected to the dApp
          const accounts = await newProvider.listAccounts(); 
          if (accounts.length > 0) {
            // If accounts are already connected, attempt to connect the wallet
            connectWallet();
          }
        } catch (err) {
          console.error("Error checking MetaMask auto-connection:", err);
        }
      }
    };
    checkMetaMaskConnection();

    // Clean up event listeners on component unmount to prevent memory leaks
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        // Remove the listeners when the component unmounts
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [connectWallet]); // Dependency on connectWallet to ensure it's stable

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        address,
        contract,
        isConnected,
        loading,
        error,
        connectWallet,
        disconnectWallet,
        contractAddress
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};


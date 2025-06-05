// frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores user data from backend (walletAddress, name, userType, token)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Register user on backend
  const register = async (walletAddress, name, userType, password, email) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/register`, {
        walletAddress,
        name,
        userType,
        password,
        email,
      });
      const userData = response.data;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed.';
      setError(errorMessage);
      throw new Error(errorMessage); // Re-throw to be caught by component
    } finally {
      setLoading(false);
    }
  };

  // Login user on backend
  const login = async (walletAddress, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        walletAddress,
        password,
      });
      const userData = response.data;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  // Update blockchain registration status in backend
  const updateBlockchainStatus = async (userId, token) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(
        `${API_URL}/update-blockchain-status/${userId}`,
        {}, // Empty body for a PUT request that just updates a flag
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const updatedUser = { ...user, isBlockchainRegistered: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update blockchain status.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user?.token, // Check if user object and token exist
        loading,
        error,
        register,
        login,
        logout,
        updateBlockchainStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


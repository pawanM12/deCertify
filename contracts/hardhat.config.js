// contracts/hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config(); // Load environment variables from .env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24", // Specify the Solidity compiler version
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org", // Celo Alfajores testnet RPC URL
      accounts: [process.env.PRIVATE_KEY], // Your Celo account private key (from .env)
      chainId: 44787, // Chain ID for Celo Alfajores
    },
    // You can add other networks here, e.g., mainnet, local, etc.
    localhost: {
      url: "http://127.0.0.1:8545", // Default Hardhat local network
      chainId: 31337,
    }
  },
  etherscan: {
    // CeloScan API key for verifying contracts
    // You might need to get an API key from CeloScan if you want to verify contracts
    apiKey: {
      alfajores: process.env.CELOSCAN_API_KEY || "", // Your CeloScan API Key from .env
    },
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts", // Path to your Solidity contracts
    tests: "./test",       // Path to your tests
    cache: "./cache",      // Path to Hardhat cache
    artifacts: "./artifacts" // Path to compiled artifacts
  },
};


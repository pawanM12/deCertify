// contracts/scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // Get the contract factory for deCertify
  const deCertify = await hre.ethers.getContractFactory("deCertify");

  // Deploy the contract
  console.log("Deploying deCertify contract...");
  const deCertifyContract = await deCertify.deploy();

  // Wait for the contract to be deployed
  await deCertifyContract.waitForDeployment();

  const contractAddress = deCertifyContract.target;
  console.log(`deCertify contract deployed to: ${contractAddress}`);

  // You can save this address to a file or your frontend config
  // For example, writing to a file:
  // fs.writeFileSync('deployed_contract_address.txt', contractAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


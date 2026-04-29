const Projects = artifacts.require("Projects");
const RequestManager = artifacts.require("RequestManager");

module.exports = async function (deployer, network, accounts) {
  // Deploy Projects contract first
  await deployer.deploy(Projects);
  const projectsInstance = await Projects.deployed();

  // Deploy RequestManager with the address of the deployed Projects contract
  // Note: arbitrator and extraData are placeholder values for local development
  const arbitratorAddress = accounts[9]; // Use a test account as placeholder arbitrator for local dev
  const arbitratorExtraData = "0x"; // Empty bytes for local development
  
  await deployer.deploy(RequestManager, projectsInstance.address, arbitratorAddress, arbitratorExtraData);
  const requestManagerInstance = await RequestManager.deployed();

  // Link the RequestManager contract to Projects so it can close projects on behalf of the employer
  await projectsInstance.setRequestManager(requestManagerInstance.address);
};

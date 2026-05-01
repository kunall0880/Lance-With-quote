import Web3 from 'web3';
import ProjectsContract from '../contracts/Projects.json'; 
import RequestManagerContract from '../contracts/RequestManager.json';
import { downloadFileFromIPFS } from './ipfs';

// Removed hardcoded LOCAL_GANACHE_ADDRESSES - always use fresh addresses from env or contract JSON

// helper to pick contract address from deployed networks or fall back to an env var
const getDeployedAddress = async (web3, contractJson, envVar) => {
  // prefer explicit env var for situations like hosted testnet
  if (process.env[envVar]) {
    console.log(`Using ${envVar} from environment:`, process.env[envVar]);
    return process.env[envVar];
  }

  const networkId = await web3.eth.net.getId();
  console.log(`Detected network ID: ${networkId}, contract: ${contractJson.contractName}`);

  if (contractJson.networks && contractJson.networks[networkId]) {
    const address = contractJson.networks[networkId].address;
    console.log(`Found address for network ${networkId}: ${address}`);
    return address;
  }
  
  // Fallback: try common Ganache network IDs if exact match not found
  const ganacheIds = ['5777', '1337'];
  for (const id of ganacheIds) {
    if (contractJson.networks && contractJson.networks[id]) {
      console.log(`Falling back to Ganache network ${id}: ${contractJson.networks[id].address}`);
      return contractJson.networks[id].address;
    }
  }
  
  console.error(`No address found for network ${networkId} or any Ganache fallback for ${contractJson.contractName}`);
  console.log('Available networks:', Object.keys(contractJson.networks || {}));
  return null;
};

// note: the old hardcoded addresses have been removed to enable local development with Ganache


export const connectWallet = async () => {
  if (window.ethereum) {
    // handle cases where multiple wallets are injected (e.g. MetaMask + Phantom)
    let provider = window.ethereum;
    if (provider.providers && Array.isArray(provider.providers)) {
      // prefer MetaMask if present
      const mm = provider.providers.find(p => p.isMetaMask);
      provider = mm || provider.providers[0];
    }

    const web3 = new Web3(provider);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      return { accounts, web3 };
    } catch (error) {
      console.error('Wallet access denied or failed:', error);
      return null;
    }
  } else {
    console.error('No Ethereum provider detected. Install MetaMask and refresh.');
    return null;
  }
};

export const getAccounts = async () => {
  const result = await connectWallet();
  if (result && result.accounts) {
    return result.accounts;
  }
  return []; // no accounts available or user denied access
};

export const getBalance = async (account) => {
  const { web3 } = await connectWallet();
  if (web3) {
    const balance = await web3.eth.getBalance(account);
    return web3.utils.fromWei(balance, 'ether');
  }
  return null;
};

// Utility to get stored account and role from localStorage
export const getStoredCredentials = () => {
  const account = localStorage.getItem('selectedAccount');
  const role = localStorage.getItem('role');
  return { account, role };
};

// Initialize Projects contract instance (address resolved dynamically)
export const getProjectsContract = async () => {
  const { web3 } = await connectWallet();
  if (web3) {
    const address = await getDeployedAddress(web3, ProjectsContract, 'REACT_APP_PROJECTS_CONTRACT_ADDRESS');
    if (!address) {
      console.error('Unable to determine Projects contract address for current network.');
      return null;
    }
    return new web3.eth.Contract(ProjectsContract.abi, address);
  }
  return null;
};

// Initialize RequestManager contract instance (address resolved dynamically)
// NOTE: RequestManager may not be deployed if it exceeds the 24KB bytecode limit on Ganache
export const getRequestManagerContract = async () => {
  try {
    const { web3 } = await connectWallet();
    if (web3) {
      const address = await getDeployedAddress(web3, RequestManagerContract, 'REACT_APP_REQUEST_MANAGER_ADDRESS');
      if (!address) {
        console.warn('RequestManager contract address not found - it may not be deployed.');
        return null;
      }
      const contract = new web3.eth.Contract(RequestManagerContract.abi, address);
      // Verify the contract exists at the address
      const code = await web3.eth.getCode(address);
      if (code === '0x') {
        console.warn(`RequestManager contract not deployed at ${address}`);
        return null;
      }
      
      // Debug: Log available methods on the contract
      console.log('RequestManager contract loaded at:', address);
      console.log('Available methods:', Object.keys(contract.methods).filter(m => !m.startsWith('_')));
      
      // Verify key methods exist
      const hasAddFile = typeof contract.methods.addFile === 'function';
      const hasSendMilestoneReviewRequest = typeof contract.methods.sendMilestoneReviewRequest === 'function';
      console.log('Method check - addFile:', hasAddFile, 'sendMilestoneReviewRequest:', hasSendMilestoneReviewRequest);
      
      if (!hasAddFile || !hasSendMilestoneReviewRequest) {
        console.error('WARNING: Expected methods not found on contract!');
        console.error('This likely means the ABI does not match the deployed contract');
      }
      
      return contract;
    }
  } catch (error) {
    console.warn('Error loading RequestManager contract:', error.message);
  }
  return null;
};

// Function to add a project
export const addProject = async (name, description, reward, account) => {
  const contract = await getProjectsContract();
  if (contract) {
    try {
      // Convert reward to Wei and send the transaction
      const rewardInWei = Web3.utils.toWei(reward, 'ether');
      await contract.methods.addProject(name, description, rewardInWei).send({ from: account });
      return { success: true, message: 'Project added successfully.' };
    } catch (error) {
      console.error('Error adding project:', error);
      return { success: false, message: 'Failed to add project.' };
    }
  }
  return { success: false, message: 'Failed to connect to the contract.' };
};

export const fetchAllProjects = async () => {
  try {
    const contract = await getProjectsContract();
    if (!contract) {
      console.error("Contract not found. Ensure you are connected to the correct network.");
      return [];
    }

    // Call viewOpenProjects function to get only open projects (not assigned/closed)
    const projectData = await contract.methods.viewOpenProjects().call();

    // Deconstruct arrays from projectData
    const ids = projectData[0];
    const names = projectData[1];
    const descriptions = projectData[2];
    const rewards = projectData[3];
    const statuses = projectData[4];
    const employers = projectData[5];

    // Map the arrays to create an array of project objects
    const projects = ids.map((id, index) => ({
      id: id.toString(), // Convert BigInt to string if needed
      title: names[index],
      description: descriptions[index],
      reward: rewards[index], // Convert BigInt to string if needed
      status: statuses[index].toString(), // Assuming status is an enum, adjust as needed
      employer: employers[index],
    }));

    return projects;

  } catch (error) {
    console.error("Error fetching open projects:", error);
    return [];
  }
};

// Function to raise dispute
export const raiseDispute = async (milestoneId, projectId, account) => {
  const contract = await getRequestManagerContract();
  if (!contract) {
    console.warn('RequestManager contract is not deployed. Dispute feature unavailable.');
    return { success: false, message: 'RequestManager contract not deployed. This feature is currently unavailable.' };
  }
  if (contract) {
    try {
      // Set a fixed arbitration fee for dispute
      const fee = Web3.utils.toWei('0.01', 'ether'); // Example fee

      await contract.methods.raiseDispute(milestoneId, projectId).send({
        from: account,
        value: fee
      });
      return { success: true, message: 'Dispute raised successfully.' };
    } catch (error) {
      console.error('Error raising dispute:', error);
      return { success: false, message: 'Failed to raise dispute.' };
    }
  }
  return { success: false, message: 'Failed to connect to the contract.' };
};
export const fetchUserProjects = async (selectedAccount) => {
  //console.log(selectedAccount);
  //console.log(1);
  try {
    const contract = await getProjectsContract();
    if (!contract) {
      console.error("Contract not found. Ensure you are connected to the correct network.");
      return [];
    }

    // Call viewProjects function to get all projects
    const projectData = await contract.methods.viewProjects().call();
    const statusEnum = ["Closed", "Open"];
    // Deconstruct arrays from projectData
    const ids = projectData[0];
    const names = projectData[1];
    const descriptions = projectData[2];
    const rewards = projectData[3];
    const statuses = projectData[4];
    const employers = projectData[5];
    // Map the arrays to create an array of project objects and filter by employer
    const projects = ids.map((id, index) => ({
      id: id, // Convert BigInt to string if needed
      title: names[index],
      description: descriptions[index],
      reward: rewards[index], // Convert BigInt to string if needed
      status: statusEnum[statuses[index]], // Assuming status is an enum, adjust as needed
      employer: employers[index],
    })).filter(project => project.employer && project.employer.toLowerCase() === selectedAccount.toLowerCase());

    return projects;

  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
  }
};

export async function addMilestone(projectId, name, description, daycount, percentage, selectedAccount) {
  try {
    const contract = await getProjectsContract(); // Await the contract instance
    
    if (!contract) {
      console.error("Contract instance not initialized");
      return;
    }

    // Debugging logs to verify parameters and account
    console.log("Parameters: ", { projectId, name, description, daycount, percentage, selectedAccount });
    console.log("Contract Address: ", contract.options.address);

    // Call contract method with `send` to trigger the transaction
    const transaction = await contract.methods.addMilestone(projectId, name, description, daycount, percentage)
      .send({ from: selectedAccount });
    
    console.log("Transaction successful:", transaction);
  } catch (error) {
    console.error("Error adding milestone:", error);
  }
}

export const getMilestones = async (projectId) => {
  try {
    const contract = await getProjectsContract();
    if (!contract) {
      console.log('Contract not available for milestone fetch');
      return [];
    }
    
    // Validate projectId
    const projId = typeof projectId === 'bigint' ? projectId.toString() : String(projectId);
    console.log(`Attempting to fetch milestones for project ID: ${projId}`);
    
    // Call the contract function with error handling
    let result;
    try {
      result = await contract.methods.getMilestones(projId).call();
      console.log('getMilestones returned:', result);
    } catch (decodeError) {
      console.error('Raw decoding error:', decodeError);
      console.error('This may indicate an ABI mismatch or contract version mismatch');
      console.error('The deployed contract may have a different version than the ABI expects');
      
      // Try to get more info about the error
      if (decodeError.message && decodeError.message.includes('not enough data')) {
        console.error('HINT: The contract returned less data than expected. This suggests the deployed contract');
        console.error('has fewer return parameters than the ABI declares. You may need to:');
        console.error('1. Redeploy the contract with the updated version, OR');
        console.error('2. Update the Projects.json ABI to match the deployed contract');
      }
      return [];
    }

    // Handle case where result is empty or doesn't have expected structure
    if (!result || result.length === 0) {
      console.warn('getMilestones returned empty result - project may have no milestones');
      return [];
    }

    // Safely extract results with fallbacks for older contract versions
    // New version: 11 return values
    // Old version: might have 8 or fewer
    const ids = result[0];
    const projectIds = result[1] || [];
    const names = result[2] || [];
    const descriptions = result[3] || [];
    const daycounts = result[4] || [];
    const percentages = result[5] || [];
    const statuses = result[6] || [];
    const freelancers = result[7] || [];
    const clients = result[8] || [];
    const amounts = result[9] || [];
    const proofFileHashes = result[10] || [];

    // Verify we have at least IDs
    if (!ids || ids.length === 0) {
      console.warn('No milestones found for project:', projId);
      return [];
    }

    console.log(`Found ${ids.length} milestones for project ${projId}`);

    // Map the milestones into an array of objects with safe conversion
    return ids.map((id, index) => {
      try {
        const statusValue = statuses[index] ? parseInt(statuses[index]) : 0;
        
        return {
          id : id.toString(),
          projectId: projectIds[index] || projId,
          name: names[index] || 'Unnamed Milestone',
          description: descriptions[index] || '',
          daycount: daycounts[index] ? daycounts[index].toString() : '0',
          percentage: percentages[index] ? percentages[index].toString() : '0',
          status: statusValue, // 0=Pending, 1=InProgress, 2=Completed, 3=Rejected
          freelancer: freelancers[index] || '0x0000000000000000000000000000000000000000',
          client: clients[index] || '0x0000000000000000000000000000000000000000',
          amount: amounts[index] ? amounts[index].toString() : '0',
          proof: proofFileHashes[index] || '',
        };
      } catch (itemError) {
        console.error(`Error processing milestone at index ${index}:`, itemError);
        return null;
      }
    }).filter(m => m !== null);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data
    });
    return []; // Return empty array on error
  }
};

export const uploadMilestoneProof = async (projectId, milestoneId, freelancer, proofFileHash) => {
  try {
    const contract = await getProjectsContract();
    if (!contract) {
      console.error("Contract not found. Ensure you are connected to the correct network.");
      return { success: false, message: 'Contract not found.' };
    }

    // Call the contract method to upload milestone proof
    await contract.methods.uploadMilestoneProof(projectId, milestoneId, freelancer, proofFileHash).send({ from: freelancer });
    
    console.log("Milestone proof uploaded successfully.");
    return { success: true, message: 'Milestone proof uploaded successfully.' };
  } catch (error) {
    console.error("Error uploading milestone proof:", error);
    return { success: false, message: 'Failed to upload milestone proof.' };
  }
};

// src/services/web3.js

export const setFreelancerRating = async (freelancerAddress, rating) => {
  try {
    const contract = await getProjectsContract();
    if (!contract) {
      console.error("Contract not found. Ensure you are connected to the correct network.");
      return { success: false, message: 'Contract not found.' };
    }

    // Call the contract method to set the freelancer rating
    await contract.methods.setFreelancerRating(freelancerAddress, rating).send({ from: freelancerAddress });
    
    console.log("Freelancer rating set successfully.");
    return { success: true, message: 'Freelancer rating set successfully.' };
  } catch (error) {
    console.error("Error setting freelancer rating:", error);
    return { success: false, message: 'Failed to set freelancer rating.' };
  }
};

// src/services/web3.js

export const getFreelancerRating = async (freelancerAddress) => {
  try {
    const contract = await getProjectsContract();
    if (!contract) {
      console.error("Contract not found. Ensure you are connected to the correct network.");
      return { success: true, rating: '0' }; // Return default rating instead of error
    }

    // Call the contract method to get the freelancer rating
    try {
      const rating = await contract.methods.getFreelancerRating(freelancerAddress).call();
      console.log(`Freelancer rating: ${rating}`);
      return { success: true, rating: rating.toString() };
    } catch (contractError) {
      // If the method doesn't exist or throws, return default rating
      console.log('Freelancer rating not yet set or method unavailable, returning default');
      return { success: true, rating: '0' };
    }
  } catch (error) {
    console.error("Error getting freelancer rating:", error);
    return { success: true, rating: '0' }; // Return default rating on error
  }
};



export const fetchRequestsByProjectId = async (projectId) => { 
  console.log("Project ID:", projectId);
  try {
    console.log("Step 1: Getting contract instance...");
    const contract = await getRequestManagerContract(); // Get the instance of the RequestManager contract
    if (!contract) {
      console.warn('RequestManager contract not deployed. Returning empty requests list.');
      return [];
    }
    console.log("Step 2: Calling viewAllRequests...");

    // Call the contract function
    const result = await contract.methods.viewAllRequests().call();
    console.log("Step 3: Response received:", result);

    // Destructure the returned arrays to match the Solidity return values
    const requestIds = result[0];
    const projectIds = result[1];
    const freelancers = result[2];
    const freelancerRatings = result[3];
    const statuses = result[4];
    const escrowContracts = result[5];
    console.log("4");
    // Map the requests into an array of objects and filter by projectId
    const statusEnum = ["Pending", "Approved", "Rejected"];
    const filteredRequests = requestIds.map((id, index) => ({
      requestId: id.toString(),
      projectId: projectIds[index].toString(),
      freelancer: freelancers[index],
      freelancerRating: freelancerRatings[index].toString(),
      status: statusEnum[statuses[index]], // Assuming you want to keep the enum or convert it to a string
      escrowContract: escrowContracts[index], // This can be an address or object based on your requirements
    })).filter(request => request.projectId === projectId.toString()); // Filter by projectId
    
    return filteredRequests; // Return the filtered array of requests
  } catch (error) {
    console.error("Error fetching requests by project ID:", error);
    return []; // Return empty array on error
  }
};

export const acceptRequest = async (requestId, employer, projectReward, projectId) => {
  try {
    const requestManagerContract = await getRequestManagerContract();
    if (!requestManagerContract) {
      console.warn('RequestManager contract not deployed.');
      throw new Error('RequestManager contract not deployed. This feature is currently unavailable.');
    }
    
    console.log('Accepting request:', requestId, 'from:', employer, 'projectId:', projectId);
    
    // DEPRECATED: This uses the old request-based workflow
    // The new quotation-based workflow (acceptQuotation) is recommended instead
    // due to smart contract design constraints with closeProject authorization
    
    const receipt = await requestManagerContract.methods.acceptRequest(requestId).send({
      from: employer,
      value: projectReward,
    });
    console.log('Request accepted successfully');
    
    return receipt;
  } catch (error) {
    console.error('Error accepting request:', error);
    // Log helpful message
    if (error.message.includes('Only the employer can close')) {
      console.error('ERROR: The old request system cannot close projects due to smart contract design.');
      console.error('SOLUTION: Please use the Quotation system instead by viewing quotations from freelancers.');
    }
    throw error;
  }
};

export const rejectRequest = async (requestId, employer) => {
  try {
    const contract = await getRequestManagerContract();
    if (!contract) {
      console.warn('RequestManager contract not deployed.');
      throw new Error('RequestManager contract not deployed. This feature is currently unavailable.');
    }
    console.log(1);
    await contract.methods.rejectRequest(requestId).send({
      from: employer,
    });
    console.log('Request rejected successfully');
  } catch (error) {
    console.error('Error rejecting request:', error);
  }
};

export const fetchAcceptedProjectsByFreelancer = async (freelancer) => {
  try {
    // If caller did not provide freelancer address, try stored selectedAccount
    if (!freelancer) {
      const stored = localStorage.getItem('selectedAccount');
      if (stored) {
        console.warn('fetchAcceptedProjectsByFreelancer: no freelancer passed, using stored selectedAccount', stored);
        freelancer = stored;
      } else {
        console.warn('fetchAcceptedProjectsByFreelancer: no freelancer provided and no selectedAccount in localStorage');
        return [];
      }
    }
    console.log("Fetching accepted projects for freelancer:", freelancer);

    const projectsContract = await getProjectsContract();
    const requestManagerContract = await getRequestManagerContract();

    if (!projectsContract) {
      console.log("Projects contract not available");
      return [];
    }

    if (!requestManagerContract) {
      console.log("RequestManager contract not deployed - accepting projects feature unavailable");
      return [];
    }

    // Additional diagnostics: check on-chain bytecode for both contracts
    try {
      const { web3 } = await connectWallet();
      if (web3 && requestManagerContract.options && requestManagerContract.options.address) {
        const code = await web3.eth.getCode(requestManagerContract.options.address);
        console.log('RequestManager on-chain code (prefix):', code.slice(0, 40));
      }
      if (web3 && projectsContract.options && projectsContract.options.address) {
        const pcode = await web3.eth.getCode(projectsContract.options.address);
        console.log('Projects contract on-chain code (prefix):', pcode.slice(0, 40));
      }
    } catch (diagErr) {
      console.warn('Diagnostics getCode failed:', diagErr);
    }

    // Debug: check RequestManager's stored Projects contract and requestCount
    try {
      const rmProjectsAddr = await requestManagerContract.methods.projectsContract().call();
      console.log('RequestManager.projectsContract() =>', rmProjectsAddr);
    } catch (e) {
      console.error('Could not read requestManager.projectsContract():', e);
    }
    try {
      const rawRequestCount = await requestManagerContract.methods.requestCount().call();
      console.log('requestCount raw:', rawRequestCount, '(type:', typeof rawRequestCount + ')');
      const parsedReqCount = parseInt(String(rawRequestCount), 10);
      console.log('requestCount parsed:', parsedReqCount);
    } catch (e) {
      console.error('Could not read requestCount():', e);
      // Try again with a from parameter to see if provider handles it differently
      try {
        const rawRequestCountFrom = await requestManagerContract.methods.requestCount().call({ from: freelancer });
        console.log('requestCount raw (from):', rawRequestCountFrom, '(type:', typeof rawRequestCountFrom + ')');
      } catch (e2) {
        console.error('Could not read requestCount() even with {from}:', e2);
      }
    }

    // Try to use the contract helper if available (more efficient and authoritative)
    if (requestManagerContract.methods.viewAcceptedProjectsByFreelancer) {
      try {
        const result = await requestManagerContract.methods.viewAcceptedProjectsByFreelancer(freelancer).call();
        const ids = result[0] || [];
        const names = result[1] || [];
        const descriptions = result[2] || [];
        const rewards = result[3] || [];
        const statuses = result[4] || [];
        const employers = result[5] || [];

        const projects = ids.map((id, idx) => ({
          id: id.toString(),
          name: names[idx],
          title: names[idx],
          description: descriptions[idx],
          reward: rewards[idx] ? rewards[idx].toString() : '0',
          status: statuses[idx] !== undefined ? statuses[idx].toString() : '0',
          employer: employers[idx],
        }));

        console.log("Accepted projects (via viewAcceptedProjectsByFreelancer):", projects.length);
        return projects;
      } catch (err) {
        console.warn("viewAcceptedProjectsByFreelancer failed, falling back to assignedFreelancer loop:", err.message);
      }
    }

    // Fallback: loop through projects and check assignedFreelancer mapping
    // Get total project count
    const projectCount = await projectsContract.methods.projectCount().call();
    console.log("Total projects raw:", projectCount, "(type:", typeof projectCount + ")");
    const totalProjects = parseInt(String(projectCount), 10);
    console.log("Interpreted total projects:", totalProjects);

    const acceptedProjects = [];

    // Loop through all projects to find ones assigned to this freelancer
    for (let i = 1; i <= totalProjects; i++) {
      try {
        // Check if this freelancer is assigned to this project
        const assignedFreelancer = await requestManagerContract.methods.assignedFreelancer(i).call();
        
        // Log assignedFreelancer raw value for debugging
        console.log(`assignedFreelancer[${i}] =`, assignedFreelancer);

        // Compare addresses (case-insensitive)
        const freelancerAddr = freelancer && typeof freelancer === 'string' ? freelancer.toLowerCase() : String(freelancer).toLowerCase();
        if (assignedFreelancer && assignedFreelancer.toLowerCase() === freelancerAddr) {
          console.log(`Project ${i} is assigned to freelancer (match)`);
          
          // Get project details
          const projectData = await projectsContract.methods.getProject(i).call();
          
          if (projectData) {
            acceptedProjects.push({
              id: i.toString(),
              name: projectData[0] || projectData.name,
              title: projectData[0] || projectData.name,
              description: projectData[1] || projectData.description,
              reward: projectData[2] ? projectData[2].toString() : projectData.reward,
              status: projectData[4] ? projectData[4].toString() : projectData.status,
              employer: projectData[5] || projectData.employer,
            });
          }
        }
      } catch (err) {
        // Skip projects with errors
        console.log(`Error checking project ${i}:`, err.message);
      }
    }

    console.log("Accepted projects found:", acceptedProjects.length);
    // If none found via assignedFreelancer mapping, try scanning requests directly
    if (acceptedProjects.length === 0) {
      try {
        console.log('No assignedFreelancer entries matched. Scanning requests via viewAllRequests...');
        let allRequests;
        try {
          allRequests = await requestManagerContract.methods.viewAllRequests().call();
        } catch (vErr) {
          console.error('viewAllRequests call failed, retrying with {from}:', vErr);
          allRequests = await requestManagerContract.methods.viewAllRequests().call({ from: freelancer });
        }
        const reqIds = allRequests[0] || [];
        const projIds = allRequests[1] || [];
        const freelancersArr = allRequests[2] || [];
        const statusesArr = allRequests[4] || [];
        const escrows = allRequests[5] || [];

        const foundFromRequests = [];
        for (let idx = 0; idx < reqIds.length; idx++) {
          try {
            const statusNum = parseInt(String(statusesArr[idx] || '0'), 10);
            // 1 -> Accepted (RequestStatus.Accepted)
            if (statusNum === 1) {
              const reqFreelancer = freelancersArr[idx] || '';
              if (reqFreelancer && reqFreelancer.toLowerCase() === freelancer.toLowerCase()) {
                const projId = projIds[idx];
                try {
                  const projectData = await projectsContract.methods.getProject(projId).call();
                  foundFromRequests.push({
                    id: String(projId),
                    name: projectData[0] || projectData.name,
                    title: projectData[0] || projectData.name,
                    description: projectData[1] || projectData.description,
                    reward: projectData[2] ? projectData[2].toString() : '0',
                    status: projectData[4] ? projectData[4].toString() : '0',
                    employer: projectData[5] || projectData.employer,
                    requestId: reqIds[idx].toString(),
                    escrow: escrows[idx]
                  });
                } catch (pdErr) {
                  console.warn(`Could not fetch project ${projId} for request ${reqIds[idx]}:`, pdErr.message);
                }
              }
            }
          } catch (iterErr) {
            console.warn('Error scanning request index', idx, iterErr.message);
          }
        }

        if (foundFromRequests.length > 0) {
          console.log('Accepted projects found via requests scan:', foundFromRequests.length);
          return foundFromRequests;
        }
      } catch (scanErr) {
        console.error('viewAllRequests scan failed:', scanErr);
      }

      // Event-based fallback: build requestId -> projectId map from RequestSent events,
      // then find RequestAccepted events for this freelancer and resolve projects.
      try {
        console.log('Event-based fallback: scanning RequestSent and RequestAccepted events');
        const sentEvents = await requestManagerContract.getPastEvents('RequestSent', { fromBlock: 0, toBlock: 'latest' });
        const acceptedEvents = await requestManagerContract.getPastEvents('RequestAccepted', { fromBlock: 0, toBlock: 'latest' });

        const requestToProject = {};
        for (const ev of sentEvents) {
          const rv = ev.returnValues || {};
          const rid = rv.requestId || rv[0] || rv['requestId'];
          const pid = rv.projectId || rv[1] || rv['projectId'];
          if (rid !== undefined && pid !== undefined) requestToProject[String(rid)] = String(pid);
        }

        const foundFromEvents = [];
        const seenProjectIds = new Set();

        for (const ev of acceptedEvents) {
          const rv = ev.returnValues || {};
          const rid = rv.requestId || rv[0] || rv['requestId'];
          const freelancerAddr = (rv.freelancer || rv[1] || rv['freelancer'] || '').toLowerCase();
          if (!rid) continue;
          if (freelancerAddr !== freelancer.toLowerCase()) continue;

          // Map requestId -> projectId
          let projId = requestToProject[String(rid)];
          if (!projId) {
            // try to fetch request on-chain as a last resort
            try {
              const req = await requestManagerContract.methods.getRequest(String(rid)).call();
              projId = req.projectId || req[0];
            } catch (reqErr) {
              console.warn('Could not resolve projectId for request', rid, reqErr.message || reqErr);
            }
          }

          if (projId && !seenProjectIds.has(String(projId))) {
            try {
              const projectData = await projectsContract.methods.getProject(projId).call();
              const projObj = {
                id: String(projId),
                name: projectData[0] || projectData.name,
                title: projectData[0] || projectData.name,
                description: projectData[1] || projectData.description,
                reward: projectData[2] ? projectData[2].toString() : '0',
                status: projectData[4] ? projectData[4].toString() : '0',
                employer: projectData[5] || projectData.employer,
                requestId: String(rid)
              };
              foundFromEvents.push(projObj);
              seenProjectIds.add(String(projId));
            } catch (pdErr) {
              console.warn('Could not fetch project for projId', projId, pdErr.message || pdErr);
            }
          }
        }

        if (foundFromEvents.length > 0) {
          console.log('Accepted projects found via events:', foundFromEvents.length);
          return foundFromEvents;
        }
      } catch (evtErr) {
        console.error('Event-based fallback failed:', evtErr);
      }
    }

    return acceptedProjects;
  } catch (error) {
    console.error("Error fetching accepted projects for freelancer:", error);
    return [];
  }
};

export async function addFile(milestoneId, name, rid, cid, account) {
  try {
      // Validate all required parameters
      if (!milestoneId || milestoneId === undefined || milestoneId === null) {
        throw new Error("Missing required parameter: milestoneId");
      }
      if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error("Missing required parameter: name (must be a non-empty string)");
      }
      if (!rid || typeof rid !== 'string' || rid.trim() === '') {
        throw new Error("Missing required parameter: rid (must be a non-empty string)");
      }
      if (!cid || typeof cid !== 'string' || cid.trim() === '') {
        throw new Error("Missing required parameter: cid (must be a non-empty string)");
      }
      if (!account || typeof account !== 'string' || account.trim() === '') {
        throw new Error("Missing required parameter: account (must be a valid address)");
      }

      // Get the contract instance
      const contract = await getRequestManagerContract();
      if (!contract) {
        throw new Error('RequestManager contract not available. Please ensure it is deployed and the address is correct.');
      }

      const milestoneIdStr = String(milestoneId);
      const nameStr = String(name);
      const ridStr = String(rid);
      const cidStr = String(cid);

      console.log('addFile called with:', { milestoneIdStr, nameStr, ridStr, cidStr, account });
      console.log('milestoneId validation:', { 
        value: milestoneIdStr,
        isNumber: !isNaN(Number(milestoneIdStr)),
        isGreaterThanZero: Number(milestoneIdStr) > 0
      });

      // Try to call addFile
      console.log('Sending addFile transaction...');
      const tx = contract.methods.addFile(milestoneIdStr, nameStr, ridStr, cidStr);
      
      // Estimate gas first to see if there's an issue
      try {
        console.log('Estimating gas...');
        const gasEstimate = await tx.estimateGas({ from: account });
        console.log('Gas estimate successful:', gasEstimate);
      } catch (gasError) {
        console.error('⚠️  Gas estimation failed (this often reveals the real error):');
        console.error('Gas error message:', gasError.message);
        if (gasError.data) {
          console.error('Gas error data:', gasError.data);
        }
        // Continue anyway - gas estimation can fail for other reasons
      }

      // Send the transaction
      console.log('Sending transaction with gas: 500000...');
      const receipt = await tx.send({ 
        from: account,
        gas: 500000
      });
      
      console.log('✓ addFile transaction successful!');
      console.log('Transaction receipt:', receipt);
      
      // If addFile succeeded, now try sendMilestoneReviewRequest
      console.log('Calling sendMilestoneReviewRequest...');
      try {
        await contract.methods.sendMilestoneReviewRequest(milestoneIdStr, cidStr, account).send({
          from: account,
          gas: 300000
        });
        console.log('✓ sendMilestoneReviewRequest successful!');
      } catch (reviewError) {
        console.error('⚠️  sendMilestoneReviewRequest failed:', reviewError.message);
        console.warn('File was added successfully, but review request failed. This is not critical.');
      }

      console.log('✓ File upload to blockchain completed successfully');
      
  } catch (error) {
      console.error('❌ Error calling addFile:', error.message);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      throw error;
  }
};

/**
 * Downloads all files associated with a specific milestone.
 * @param {number} milestoneId - The ID of the milestone to retrieve files for.
 */
export const downloadFilesForMilestone = async (milestoneId) => {
  try {
    console.log("Fetching files for milestone:", milestoneId);
    
    // Call the smart contract function to get all files for the milestone
    const contract = await getRequestManagerContract();
    const result = await contract.methods.viewAllFilesForMilestone(milestoneId).call();
    
    // Destructure the result
    const ids = result[0];
    const names = result[2];
    const cids = result[4];
    
    if (!ids || ids.length === 0) {
      console.log("No files found for milestone:", milestoneId);
      throw new Error(`No files found for milestone ${milestoneId}`);
    }

    console.log(`Found ${ids.length} file(s) to download`);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const downloadErrors = [];
    let successCount = 0;

    // Iterate through the files and download each one
    for (let i = 0; i < ids.length; i++) {
      try {
        const cid = cids[i];
        const filename = names[i] || `downloadedFile_${ids[i]}`;
        
        if (!cid) {
          console.warn(`Skipping file ${i + 1}: No CID provided`);
          continue;
        }

        console.log(`Downloading file ${i + 1}/${ids.length}: ${filename} (CID: ${cid})`);
        await downloadFileFromIPFS(cid, filename);
        successCount++;
        
        // Wait before the next download to avoid rate limiting
        if (i < ids.length - 1) {
          await delay(1000);
        }
      } catch (fileError) {
        console.error(`Error downloading file ${i + 1}:`, fileError);
        downloadErrors.push({
          index: i,
          error: fileError.message
        });
      }
    }

    console.log(`Download complete: ${successCount}/${ids.length} files downloaded successfully`);
    
    if (downloadErrors.length > 0) {
      throw new Error(`Downloaded ${successCount} file(s) but encountered ${downloadErrors.length} error(s)`);
    }
  } catch (error) {
    console.error('Error downloading files for milestone:', error);
    throw error;
  }
};

export const fetchMilestoneReviewRequestsByMilestoneId = async (milestoneId) => {
  console.log("Milestone ID:", milestoneId);
  try {
    console.log("Step 1: Getting contract instance...");
    const contract = await getRequestManagerContract(); // Get the instance of the RequestManager contract
    console.log("Step 2: Calling viewAllMilestoneReviewRequests...");

    // Call the contract function
    const result = await contract.methods.viewAllMilestoneReviewRequests().call();
    console.log("Step 3: Response received:", result);

    // Destructure the returned arrays to match the Solidity return values
    const requestIds = result[0];
    const milestoneIds = result[1];
    const freelancers = result[2];
    const cids = result[3];
    const reviewedStatuses = result[4];

    // Map the requests into an array of objects and filter by milestoneId
    const filteredRequests = requestIds.map((id, index) => ({
      requestId: id.toString(),
      milestoneId: milestoneIds[index].toString(),
      freelancer: freelancers[index],
      cid: cids[index],
      reviewed: reviewedStatuses[index],
    })).filter(request => request.milestoneId === milestoneId.toString()); // Filter by milestoneId

    return filteredRequests; // Return the filtered array of requests
  } catch (error) {
    console.error("Error fetching milestone review requests by milestone ID:", error);
    throw error; // Re-throw the error for further handling if needed
  }
};

// Function to accept a milestone review request
export const acceptMilestoneReviewRequest = async (reviewRequestId, projId, selectedAccount) => {
  try {
    // Get the RequestManager and Projects contract instances
    console.log(1);
    const requestManagerContract = await getRequestManagerContract();
    console.log(2);
    // Call the acceptMilestoneReviewRequest function
    await requestManagerContract.methods
      .acceptMilestoneReviewRequest(reviewRequestId, projId)
      .send({ from: selectedAccount });
    console.log('Milestone review request accepted:');
  } catch (error) {
    console.error('Error accepting milestone review request:', error);
    throw error; // Re-throw the error for handling in the UI
  }
};

// Function to reject a milestone review request
export const rejectMilestoneReviewRequest = async (reviewRequestId, reason, selectedAccount) => {
  try {
    // Get the RequestManager contract instance
    const requestManagerContract = await getRequestManagerContract();

    // Call the rejectMilestoneReviewRequest function
    await requestManagerContract.methods
      .rejectMilestoneReviewRequest(reviewRequestId, reason)
      .send({ from: selectedAccount });
  } catch (error) {
    console.error('Error rejecting milestone review request:', error);
    throw error; // Re-throw the error for handling in the UI
  }
};

export const fetchReviewResponsesByMilestoneId = async (milestoneId) => {
  console.log("Fetching review responses for Milestone ID:", milestoneId);

  try {
    console.log("Step 1: Getting contract instance...");
    const contract = await getRequestManagerContract(); // Get the instance of the RequestManager contract
    console.log("Step 2: Calling viewAllReviewResponses...");

    // Call the contract function
    const result = await contract.methods.viewAllReviewResponses().call();
    console.log("Step 3: Response received:", result);

    // Destructure each array from the result
    const responseIds = result[0];
    const milestoneIds = result[1];
    const freelancers = result[2];
    const responses = result[3];
    const acceptedStatuses = result[4];

    // Map each response into an object and filter by milestoneId
    const filteredResponses = responseIds.map((id, index) => ({
      responseId: id,
      milestoneId: milestoneIds[index].toString(),
      freelancer: freelancers[index],
      response: responses[index],
      accepted: acceptedStatuses[index],
    })).filter(response => response.milestoneId === milestoneId.toString()); // Filter by milestoneId

    return filteredResponses; // Return the filtered array of responses
  } catch (error) {
    console.error("Error fetching review responses by milestone ID:", error);
    throw error; // Re-throw the error for further handling if needed
  }
};

export const acceptRejectionReason = async (reviewRequestId, selectedAccount) => {
  console.log("Accepting rejection reason for Review Request ID:", reviewRequestId);

  try {
    console.log("Step 1: Getting contract instance...");
    const contract = await getRequestManagerContract(); // Get the instance of the RequestManager contract
    console.log("Step 2: Sending transaction...");

    // Send the transaction to the blockchain
    const receipt = await contract.methods.acceptRejectionReason(reviewRequestId)
      .send({ from: selectedAccount });

    console.log("Transaction successful! Receipt:", receipt);
    return receipt; // Return the transaction receipt for further handling if needed
  } catch (error) {
    console.error("Error accepting rejection reason:", error);
    throw error; // Re-throw the error for further handling if needed
  }
};

// ===== NEW FUNCTIONS FOR ADDITIONAL FEATURES =====

/**
 * Send a request draft from freelancer to employer
*/
export const sendRequestDraft = async (requestId, draftContent, selectedAccount) => {
  try {
    const contract = await getRequestManagerContract();
    const receipt = await contract.methods.sendRequestDraft(requestId, draftContent)
      .send({ from: selectedAccount });
    console.log('Request draft sent successfully:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error sending request draft:', error);
    throw error;
  }
};

/**
 * Get all request drafts for a specific request
 */
export const getRequestDrafts = async (requestId) => {
  try {
    const contract = await getRequestManagerContract();
    const drafts = await contract.methods.getRequestDrafts(requestId).call();
    return drafts;
  } catch (error) {
    console.error('Error fetching request drafts:', error);
    throw error;
  }
};

/**
 * Rate a freelancer (called by client/employer)
 */
export const rateFreelancer = async (requestId, rating, review, selectedAccount) => {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    const contract = await getRequestManagerContract();
    const receipt = await contract.methods.rateFreelancer(requestId, rating, review)
      .send({ from: selectedAccount });
    console.log('Freelancer rating submitted:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error rating freelancer:', error);
    throw error;
  }
};

/**
 * Get all ratings for a specific freelancer
 */
export const getFreelancerRatings = async (freelancerAddress) => {
  try {
    const contract = await getRequestManagerContract();
    const ratings = await contract.methods.getFreelancerRatings(freelancerAddress).call();
    return ratings;
  } catch (error) {
    console.error('Error fetching freelancer ratings:', error);
    throw error;
  }
};

/**
 * Get average rating for a freelancer
 */
export const getFreelancerAverageRating = async (freelancerAddress) => {
  try {
    const contract = await getRequestManagerContract();
    const averageRating = await contract.methods.getFreelancerAverageRating(freelancerAddress).call();
    return parseInt(averageRating) / 1; // Convert to decimal if needed
  } catch (error) {
    console.error('Error fetching freelancer average rating:', error);
    throw error;
  }
};

/**
 * Complete a project (called by client/employer)
 */
export const completeProject = async (requestId, selectedAccount) => {
  try {
    const contract = await getRequestManagerContract();
    const receipt = await contract.methods.completeProject(requestId)
      .send({ from: selectedAccount });
    console.log('Project completed:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error completing project:', error);
    throw error;
  }
};

/**
 * Get project completion status
 */
export const getProjectCompletion = async (projectId) => {
  try {
    const contract = await getRequestManagerContract();
    const completion = await contract.methods.getProjectCompletion(projectId).call();
    return completion;
  } catch (error) {
    console.error('Error fetching project completion:', error);
    throw error;
  }
};

// ===== REQUEST & QUOTATION FUNCTIONS =====

/**
 * Send a request for a project (freelancer applies)
 * @param {number} projectId - The project ID
 * @param {number} freelancerRating - The freelancer's current rating
 * @param {string} selectedAccount - The freelancer's account
 */
export const sendRequest = async (projectId, freelancerRating, selectedAccount) => {
  try {
    const contract = await getRequestManagerContract();
    console.log('Sending request with projectId:', projectId, 'Type:', typeof projectId, 'Rating:', freelancerRating, 'From:', selectedAccount);
    const receipt = await contract.methods.sendRequest(
      String(projectId),
      String(freelancerRating || 0)
    ).send({ from: selectedAccount });
    console.log('Request sent successfully:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error sending request:', error);
    throw error;
  }
};

/**
 * CRITICAL: Verify contract state before ANY blockchain operation
 * STRICT RULE: Always check that frontend is connected to correct deployed contract
 * @returns {Promise<{valid: boolean, contractAddress: string, networkId: number, projectCount: number, error?: string}>}
 */
export const verifyContractState = async () => {
  try {
    console.log('\n[verifyContractState] ========== CRITICAL CONTRACT VERIFICATION ==========');
    
    const projectsContract = await getProjectsContract();
    if (!projectsContract) {
      const error = 'Projects contract instance unavailable - cannot verify state';
      console.error(`[verifyContractState] ✗ ${error}`);
      return { valid: false, contractAddress: null, networkId: null, projectCount: 0, error };
    }

    // STEP 1: Get contract address
    const contractAddress = projectsContract.options.address;
    console.log(`[verifyContractState] Frontend contract address: ${contractAddress}`);

    // STEP 2: Get network ID
    const { web3 } = await connectWallet();
    if (!web3) {
      const error = 'Web3 instance not available';
      console.error(`[verifyContractState] ✗ ${error}`);
      return { valid: false, contractAddress, networkId: null, projectCount: 0, error };
    }
    
    const networkId = await web3.eth.net.getId();
    console.log(`[verifyContractState] Connected network ID: ${networkId}`);

    // STEP 3: Verify contract bytecode exists on-chain
    const code = await web3.eth.getCode(contractAddress);
    if (code === '0x') {
      const error = `No contract bytecode found at address ${contractAddress}. Contract not deployed on this network!`;
      console.error(`[verifyContractState] ✗ CRITICAL: ${error}`);
      return { valid: false, contractAddress, networkId, projectCount: 0, error };
    }
    console.log(`[verifyContractState] ✓ Contract bytecode verified on-chain`);

    // STEP 4: Fetch projectCount from contract
    let projectCount = 0;
    try {
      projectCount = await projectsContract.methods.projectCount().call();
      projectCount = parseInt(String(projectCount), 10);
      console.log(`[verifyContractState] projectCount from contract: ${projectCount}`);
    } catch (countError) {
      const error = `Could not fetch projectCount: ${countError.message}`;
      console.error(`[verifyContractState] ✗ ${error}`);
      return { valid: false, contractAddress, networkId, projectCount: 0, error };
    }

    // STEP 5: Check if contract state is empty (possible address mismatch)
    if (projectCount === 0) {
      const error = 'Contract state is EMPTY (projectCount = 0). Possible causes: (1) Contract address mismatch OR (2) Freshly deployed contract with no data';
      console.warn(`[verifyContractState] ⚠️  ${error}`);
      console.warn(`[verifyContractState] Cross-check: Frontend address=${contractAddress}, Network=${networkId}`);
      console.warn(`[verifyContractState] If you just deployed, this is normal. Otherwise, check .env file.`);
      return { 
        valid: false, 
        contractAddress, 
        networkId, 
        projectCount: 0, 
        error 
      };
    }

    // STEP 6: All checks passed
    console.log(`[verifyContractState] ✓ CONTRACT STATE VERIFIED SUCCESSFULLY`);
    console.log(`[verifyContractState] Contract address: ${contractAddress}, Network: ${networkId}, Projects: ${projectCount}`);
    console.log(`[verifyContractState] ============================================================\n`);
    
    return { 
      valid: true, 
      contractAddress, 
      networkId, 
      projectCount,
      error: null 
    };
  } catch (error) {
    console.error('[verifyContractState] ✗ CRITICAL ERROR:', error.message);
    console.error('[verifyContractState] Full error:', error);
    return { valid: false, contractAddress: null, networkId: null, projectCount: 0, error: error.message };
  }
};

/**
 * Get Projects contract with automatic state verification
 * STRICT RULE: Never use the raw getProjectsContract() before verifying state
 * This wrapper ensures contract address is correct and state is consistent
 * @returns {Promise<{contract: object, verification: object} | null>}
 */
export const safeGetProjectsContract = async () => {
  try {
    console.log('[safeGetProjectsContract] Getting contract with state verification...');
    
    // Get contract instance
    const contract = await getProjectsContract();
    if (!contract) {
      console.error('[safeGetProjectsContract] ✗ Could not instantiate contract');
      return null;
    }

    // Verify contract state
    const verification = await verifyContractState();
    if (!verification.valid) {
      const errorMsg = `Contract state verification failed: ${verification.error}`;
      console.error(`[safeGetProjectsContract] ✗ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log('[safeGetProjectsContract] ✓ Contract ready for use');
    return { contract, verification };
  } catch (error) {
    console.error('[safeGetProjectsContract] ✗ Error:', error.message);
    throw error;
  }
};

export const verifyRequestManagerProjectLink = async () => {
  try {
    const requestManagerContract = await getRequestManagerContract();
    if (!requestManagerContract) {
      throw new Error('RequestManager contract not available for link verification');
    }

    const { web3 } = await connectWallet();
    if (!web3) {
      throw new Error('Web3 provider not available for link verification');
    }

    const networkId = await web3.eth.net.getId();
    const requestManagerAddress = requestManagerContract.options.address;
    console.log('[verifyRequestManagerProjectLink] Quotation Contract:', requestManagerAddress);
    console.log('[verifyRequestManagerProjectLink] Connected network ID:', networkId);

    const linkedProjectsAddress = await requestManagerContract.methods.getProjectsContractAddress().call();
    console.log('[verifyRequestManagerProjectLink] Projects Contract (inside):', linkedProjectsAddress);

    const linkedProjectCount = await requestManagerContract.methods.debugProjectCount().call();
    console.log('[verifyRequestManagerProjectLink] Projects Count:', linkedProjectCount);

    if (Number(linkedProjectCount) === 0) {
      throw new Error('Projects contract not linked correctly or empty state');
    }

    const localProjectsContract = await getProjectsContract();
    const localProjectsAddress = localProjectsContract?.options?.address || null;
    if (localProjectsAddress && linkedProjectsAddress !== localProjectsAddress) {
      const error = `RequestManager linked Projects address (${linkedProjectsAddress}) does not match frontend Projects address (${localProjectsAddress})`;
      console.error('[verifyRequestManagerProjectLink] ✗', error);
      throw new Error(error);
    }

    return {
      valid: true,
      requestManagerAddress,
      linkedProjectsAddress,
      projectCount: parseInt(String(linkedProjectCount), 10),
      networkId,
      localProjectsAddress
    };
  } catch (error) {
    console.error('[verifyRequestManagerProjectLink] ✗', error.message);
    throw error;
  }
};

/**
 * Check if a request exists for a project
 * @param {number} projectId - The project ID
 */
export const checkRequestExists = async (projectId) => {
  try {
    const contract = await getRequestManagerContract();
    console.log('Checking if request exists for projectId:', projectId);
    // Call the public projectToRequest mapping to get the requestId
    const requestId = await contract.methods.projectToRequest(String(projectId)).call();
    const exists = requestId && requestId !== '0';
    console.log('Request exists:', exists, 'Request ID:', requestId);
    return exists;
  } catch (error) {
    console.error('Error checking request:', error);
    return false;
  }
};

/**
 * Validate that a project ID exists and is valid
 * STRICT RULE: All project IDs must be validated before calling contract write functions
 * CRITICAL: Verifies contract state FIRST to catch address mismatches
 * @param {number} projectId - The project ID to validate
 * @returns {Promise<{valid: boolean, projectCount: number, project: object, contractAddress: string, networkId: number, error?: string}>}
 */
export const validateProjectId = async (projectId) => {
  try {
    console.log('\n[validateProjectId] ========== PROJECT ID VALIDATION ==========');
    console.log(`[validateProjectId] Validating projectId: ${projectId}`);
    
    // CRITICAL STEP 1: Verify RequestManager internal Projects link
    console.log('[validateProjectId] STEP 1: Verifying RequestManager -> Projects link...');
    const linkVerification = await verifyRequestManagerProjectLink();
    console.log('[validateProjectId] ✓ RequestManager link verified');

    const contractAddress = linkVerification.linkedProjectsAddress;
    const networkId = linkVerification.networkId;
    const projectCountNum = linkVerification.projectCount;

    console.log(`[validateProjectId] STEP 2: Contract state verified`);
    console.log(`[validateProjectId]   Contract address: ${contractAddress}`);
    console.log(`[validateProjectId]   Network ID: ${networkId}`);
    console.log(`[validateProjectId]   Project count: ${projectCountNum}`);

    // Step 2: Check projectId bounds (must be > 0 and <= projectCount)
    console.log(`[validateProjectId] STEP 3: Checking projectId bounds...`);
    const projectIdNum = parseInt(String(projectId), 10);
    if (projectIdNum <= 0 || projectIdNum > projectCountNum) {
      const errorMsg = `Invalid project ID: ${projectIdNum}. Valid range is 1-${projectCountNum}`;
      console.error(`[validateProjectId] ✗ FAILED: ${errorMsg}`);
      return { 
        valid: false, 
        projectCount: projectCountNum, 
        project: null, 
        contractAddress,
        networkId,
        error: errorMsg 
      };
    }
    console.log(`[validateProjectId] ✓ projectId ${projectIdNum} is within bounds`);

    // Step 3: Fetch and validate project data from Projects contract
    console.log(`[validateProjectId] STEP 4: Fetching project data...`);
    const projectsContract = await getProjectsContract();
    if (!projectsContract) {
      const errorMsg = 'Projects contract not available';
      console.error(`[validateProjectId] ✗ ${errorMsg}`);
      return { 
        valid: false, 
        projectCount: projectCountNum, 
        project: null, 
        contractAddress,
        networkId,
        error: errorMsg 
      };
    }
    try {
      const projectData = await projectsContract.methods.projects(String(projectIdNum)).call();
      console.log(`[validateProjectId] Project data for ID ${projectIdNum}:`, projectData);

      if (!projectData || !projectData[0]) {
        const errorMsg = `Project ${projectIdNum} does not exist`;
        console.error(`[validateProjectId] ✗ FAILED: ${errorMsg}`);
        return { 
          valid: false, 
          projectCount: projectCountNum, 
          project: projectData, 
          contractAddress,
          networkId,
          error: errorMsg 
        };
      }

      console.log(`[validateProjectId] ✓ SUCCESS: Project ${projectIdNum} is valid`);
      console.log(`[validateProjectId] ============================================================\n`);
      return { 
        valid: true, 
        projectCount: projectCountNum, 
        project: projectData,
        contractAddress,
        networkId,
        error: null 
      };
    } catch (projectFetchError) {
      const errorMsg = `Could not fetch project data: ${projectFetchError.message}`;
      console.error(`[validateProjectId] ✗ FAILED: ${errorMsg}`);
      return { 
        valid: false, 
        projectCount: projectCountNum, 
        project: null, 
        contractAddress,
        networkId,
        error: errorMsg 
      };
    }
  } catch (error) {
    console.error('[validateProjectId] ✗ CRITICAL ERROR:', error.message);
    return { valid: false, projectCount: 0, project: null, contractAddress: null, networkId: null, error: error.message };
  }
};

/**
 * Safe wrapper for proposeQuotation with full input validation
 * STRICT RULE: Never send transactions without validating all inputs first
 * @param {number} projectId - The project ID (must be pre-validated)
 * @param {number} proposedAmount - The proposed amount in wei
 * @param {string} description - Description of quotation
 * @param {string} selectedAccount - The freelancer's account
 * @param {number} freelancerRating - Optional freelancer rating
 * @returns {Promise<object>} Transaction receipt
 */
export const safeProposeQuotation = async (projectId, proposedAmount, description, selectedAccount, freelancerRating = 0) => {
  try {
    console.log('\n[safeProposeQuotation] ========== SAFE QUOTATION PROPOSAL ==========');
    
    // STEP 1: Validate project ID exists and is valid
    // This includes comprehensive contract state verification
    console.log('[safeProposeQuotation] STEP 1: Validating project ID and contract state...');
    const validation = await validateProjectId(projectId);
    
    if (!validation.valid) {
      const errorMsg = `Cannot propose quotation: ${validation.error}`;
      console.error(`[safeProposeQuotation] ✗ ${errorMsg}`);
      console.error(`[safeProposeQuotation] Contract address: ${validation.contractAddress}, Network: ${validation.networkId}`);
      throw new Error(errorMsg);
    }

    console.log(`[safeProposeQuotation] ✓ Project ${projectId} validated successfully`);
    console.log(`[safeProposeQuotation] Contract address: ${validation.contractAddress}`);
    console.log(`[safeProposeQuotation] Network ID: ${validation.networkId}`);
    console.log(`[safeProposeQuotation] Total projects in contract: ${validation.projectCount}`);
    console.log(`[safeProposeQuotation] Project details:`, validation.project);

    // STEP 2: Validate other inputs
    console.log('[safeProposeQuotation] STEP 2: Validating input parameters...');
    if (!proposedAmount || Number(proposedAmount) <= 0) {
      throw new Error('Proposed amount must be greater than 0');
    }
    if (!description || String(description).trim().length === 0) {
      throw new Error('Description cannot be empty');
    }
    if (!selectedAccount || String(selectedAccount).trim().length === 0) {
      throw new Error('Selected account must be provided');
    }
    console.log(`[safeProposeQuotation] ✓ All input parameters validated`);

    // STEP 3: Log summary before sending transaction
    console.log('[safeProposeQuotation] STEP 3: Transaction summary');
    console.log(`[safeProposeQuotation] Project ID: ${projectId} (verified in contract at ${validation.contractAddress})`);
    console.log(`[safeProposeQuotation] Proposed amount (wei): ${proposedAmount}`);
    console.log(`[safeProposeQuotation] Description: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`);
    console.log(`[safeProposeQuotation] Freelancer account: ${selectedAccount}`);
    console.log(`[safeProposeQuotation] ============================================================`);

    // STEP 4: Call the actual proposeQuotation function
    console.log('[safeProposeQuotation] STEP 4: Sending transaction...');
    const receipt = await proposeQuotation(projectId, proposedAmount, description, selectedAccount, freelancerRating);
    console.log('[safeProposeQuotation] ✓ Quotation proposed successfully');
    console.log(`[safeProposeQuotation] Transaction hash: ${receipt.transactionHash}\n`);
    return receipt;
  } catch (error) {
    console.error('[safeProposeQuotation] ✗ Error:', error.message);
    console.error('[safeProposeQuotation] Full error object:', error);
    console.error('[safeProposeQuotation] Suggestion: Check that .env has correct contract addresses');
    console.error('[safeProposeQuotation] Suggestion: Verify connected network matches deployment network\n');
    throw error;
  }
};

/**
 * Propose a quotation for a project
 * @param {number} projectId - The project ID
 * @param {number} proposedAmount - The amount proposed (in wei)
 * @param {string} description - Description/notes for the quotation
 * @param {string} selectedAccount - The account proposing the quotation
 */
export const proposeQuotation = async (projectId, proposedAmount, description, selectedAccount, freelancerRating = 0) => {
  try {
    const contract = await getRequestManagerContract();

    if (!contract) {
      throw new Error(
        'RequestManager contract is not deployed on this network. ' +
        'The quotation system requires RequestManager to be deployed. ' +
        'Please deploy RequestManager to a testnet like Sepolia or Mainnet where the 24KB bytecode limit does not apply.'
      );
    }

    // Ensure a request exists for this project so acceptQuotation can assign a freelancer reliably.
    // This supports multiple contract variants:
    // - Some versions use projectToRequest(projectId) -> requestId
    // - Others store requests keyed by projectId and expose getRequest(projectId)
    let hasRequest = false;
    try {
      if (contract.methods.projectToRequest) {
        const requestId = await contract.methods.projectToRequest(String(projectId)).call();
        hasRequest = requestId && String(requestId) !== '0';
      }
    } catch (_) {
      // ignore - method may not exist on this deployment
    }

    if (!hasRequest) {
      try {
        if (contract.methods.getRequest) {
          const req = await contract.methods.getRequest(String(projectId)).call();
          const freelancer = (req && (req.freelancer || req[1])) ? String(req.freelancer || req[1]) : '';
          hasRequest = freelancer && freelancer.toLowerCase() !== '0x0000000000000000000000000000000000000000';
        }
      } catch (_) {
        // ignore - method may not exist or may revert on empty
      }
    }

    if (!hasRequest && contract.methods.sendRequest) {
      console.log('No existing request found; creating request before quotation for projectId:', projectId);
      await contract.methods.sendRequest(
        String(projectId),
        String(freelancerRating || 0)
      ).send({ from: selectedAccount });
    }

    console.log('Proposing quotation with projectId:', projectId, 'Type:', typeof projectId, 'Amount:', proposedAmount, 'From:', selectedAccount);
    const receipt = await contract.methods.proposeQuotation(
      String(projectId),
      String(proposedAmount),
      description
    ).send({ from: selectedAccount });
    console.log('Quotation proposed successfully:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error proposing quotation:', error);
    throw error;
  }
};

/**
 * Counter-propose a quotation with negotiation notes
 * @param {number} projectId - The project ID
 * @param {number} newAmount - The new proposed amount (in wei)
 * @param {string} notes - Negotiation notes/counter-offer explanation
 * @param {string} selectedAccount - The account making the counter-proposal
 */
export const counterPropose = async (projectId, newAmount, notes, selectedAccount) => {
  try {
    const contract = await getRequestManagerContract();
    const receipt = await contract.methods.counterPropose(
      String(projectId),
      String(newAmount),
      notes
    ).send({ from: selectedAccount });
    console.log('Counter-proposal sent successfully:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error sending counter-proposal:', error);
    throw error;
  }
};

/**
 * Accept a quotation and create escrow with negotiated amount
 * @param {number} projectId - The project ID
 * @param {number} quotationIndex - The index of the quotation to accept
 * @param {number} amount - The amount to send (should match proposed amount)
 * @param {string} employer - The employer's account
 */
export const acceptQuotation = async (projectId, quotationIndex, amount, employer) => {
  try {
    const requestManagerContract = await getRequestManagerContract();
    
    // Ensure amount is properly formatted as string without scientific notation
    let amountStr = String(amount);
    if (amountStr.includes('e') || amountStr.includes('E')) {
      // If in scientific notation, convert to fixed notation
      const num = Number(amount);
      amountStr = num.toLocaleString('en-US', { 
        useGrouping: false,
        maximumFractionDigits: 0
      }).replace(/,/g, '');
    }
    
    console.log('Accepting quotation with amount (wei):', amountStr, 'projectId:', projectId, 'index:', quotationIndex, 'from:', employer);
    
    // Accept the quotation through RequestManager
    const receipt = await requestManagerContract.methods.acceptQuotation(
      String(projectId),
      String(quotationIndex)
    ).send({
      from: employer,
      value: amountStr  // Send the exact quoted amount
    });
    console.log('Quotation accepted successfully:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('Error accepting quotation:', error);
    throw error;
  }
};

/**
 * Reject a specific quotation
 * @param {number} projectId - The project ID
 * @param {number} quotationIndex - The index of the quotation to reject
 * @param {string} employer - The employer's account
 */
export const rejectQuotation = async (projectId, quotationIndex, employer) => {
  try {
    const contract = await getRequestManagerContract();
    const receipt = await contract.methods.rejectQuotation(
      String(projectId),
      String(quotationIndex)
    ).send({ from: employer });
    console.log('Quotation rejected successfully:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error rejecting quotation:', error);
    throw error;
  }
};

/**
 * Get all quotations for a project
 * @param {number} projectId - The project ID
 */
export const getQuotations = async (projectId) => {
  try {
    const contract = await getRequestManagerContract();
    const quotations = await contract.methods.getQuotations(String(projectId)).call();
    return quotations.map(q => ({
      proposedBy: q.proposedBy,
      proposedAmount: q.proposedAmount.toString(),
      description: q.description,
      negotiationNotes: q.negotiationNotes,
      status: q.status, // 0: Pending, 1: Proposed, 2: Negotiating, 3: Accepted, 4: Rejected
      timestamp: q.timestamp.toString()
    }));
  } catch (error) {
    console.error('Error fetching quotations:', error);
    throw error;
  }
};

/**
 * Get the latest quotation for a project
 * @param {number} projectId - The project ID
 */
export const getLatestQuotation = async (projectId) => {
  try {
    const contract = await getRequestManagerContract();
    const quotation = await contract.methods.getLatestQuotation(String(projectId)).call();
    return {
      proposedBy: quotation.proposedBy,
      proposedAmount: quotation.proposedAmount.toString(),
      description: quotation.description,
      negotiationNotes: quotation.negotiationNotes,
      status: quotation.status,
      timestamp: quotation.timestamp.toString()
    };
  } catch (error) {
    console.error('Error fetching latest quotation:', error);
    throw error;
  }
};

/**
 * Check if a project is assigned to a freelancer
 * @param {number} projectId - The project ID
 */
export const isProjectAssigned = async (projectId) => {
  try {
    const contract = await getRequestManagerContract();
    const isAssigned = await contract.methods.isProjectAssigned(String(projectId)).call();
    return isAssigned;
  } catch (error) {
    console.error('Error checking project assignment:', error);
    throw error;
  }
};

/**
 * Get employer's projects with incoming quotations
 * Allows employers to see which of their projects have quotations pending from freelancers
 * @param {string} employerAddress - The employer's wallet address
 */
export const getEmployerProjectsWithQuotations = async (employerAddress) => {
  try {
    // Get all open projects owned by this employer
    const projectsContract = await getProjectsContract();
    const requestManagerContract = await getRequestManagerContract();
    
    if (!projectsContract || !requestManagerContract) {
      console.error("Contracts not found. Ensure you are connected to the correct network.");
      return [];
    }

    // Fetch all projects to find employer's projects
    const projectData = await projectsContract.methods.viewProjects().call();
    
    const ids = projectData[0];
    const names = projectData[1];
    const descriptions = projectData[2];
    const rewards = projectData[3];
    const statuses = projectData[4];
    const employers = projectData[5];

    // Filter for projects owned by this employer
    const employerProjects = [];
    
    for (let i = 0; i < ids.length; i++) {
      if (employers[i].toLowerCase() === employerAddress.toLowerCase()) {
        const projectId = ids[i];
        
        try {
          // Get quotations for this project
          const quotations = await requestManagerContract.methods.getQuotations(String(projectId)).call();
          
          // Only include projects with quotations (non-empty array)
          if (quotations && quotations.length > 0) {
            employerProjects.push({
              id: projectId.toString(),
              title: names[i],
              description: descriptions[i],
              reward: rewards[i].toString(),
              status: statuses[i].toString(),
              employer: employers[i],
              quotationCount: quotations.length,
              latestQuotation: quotations[quotations.length - 1], // Latest quotation
              allQuotations: quotations
            });
          }
        } catch (quotationError) {
          console.warn(`Could not fetch quotations for project ${projectId}:`, quotationError);
        }
      }
    }

    return employerProjects;
  } catch (error) {
    console.error('Error fetching employer projects with quotations:', error);
    throw error;
  }
};

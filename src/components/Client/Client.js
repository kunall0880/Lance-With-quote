// // src/components/Client/Client.js
// import React, { useEffect, useState } from 'react';
// import { addProject, getBalance } from '../../services/web3';
// import { useNavigate } from 'react-router-dom';
// import './Client.css';

// function Client() {
//   const [selectedAccount, setSelectedAccount] = useState('');
//   const [balance, setBalance] = useState('');
//   const [projectName, setProjectName] = useState('');
//   const [projectDescription, setProjectDescription] = useState('');
//   const [projectBudget, setProjectBudget] = useState('');
//   const [statusMessage, setStatusMessage] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     const account = localStorage.getItem('selectedAccount');
//     if (account) {
//       setSelectedAccount(account);
//       fetchBalance(account);
//     }
//   }, []);

//   const fetchBalance = async (account) => {
//     const balance = await getBalance(account);
//     if (balance) {
//       setBalance(balance);
//     }
//   };

//   const handleAddProject = async (e) => {
//     e.preventDefault();
//     if (!projectName || !projectDescription || !projectBudget) {
//       alert("Please fill in all project details.");
//       return;
//     }

//     try {
//       await addProject(projectName, projectDescription, projectBudget, selectedAccount);
//       setStatusMessage("Project added successfully!");
//       setProjectName('');
//       setProjectDescription('');
//       setProjectBudget('');
//     } catch (error) {
//       console.error("Error adding project:", error);
//       setStatusMessage("Failed to add project. Please try again.");
//     }
//   };

//   const handleViewProjects = () => {
//     navigate('/client/projects', { state: { selectedAccount } });
//   };

//   return (
//     <div className="clients-projects-page">
//       <h2>Client Dashboard</h2>
//       {selectedAccount && <p>Connected Account: {selectedAccount}</p>}
//       {balance && <p>Account Balance: {balance} ETH</p>}

//       <h3>Add a New Project</h3>
//       <form onSubmit={handleAddProject}>
//         <div>
//           <label>Project Name:</label>
//           <input
//             type="text"
//             value={projectName}
//             onChange={(e) => setProjectName(e.target.value)}
//             required
//           />
//         </div>
//         <div>
//           <label>Project Description:</label>
//           <textarea
//             value={projectDescription}
//             onChange={(e) => setProjectDescription(e.target.value)}
//             required
//           />
//         </div>
//         <div>
//           <label>Project Budget (in ETH):</label>
//           <input
//             type="number"
//             value={projectBudget}
//             onChange={(e) => setProjectBudget(e.target.value)}
//             required
//           />
//         </div>
//         <button type="submit">Add Project</button>
//       </form>

//       {statusMessage && <p className="status-message">{statusMessage}</p>}

//       <button onClick={handleViewProjects}>View Projects</button>
//     </div>
//   );
// }

// export default Client;

// src/components/Client/Client.js


import React, { useEffect, useState } from 'react';
import { addProject, getBalance } from '../../services/web3';
import { useNavigate } from 'react-router-dom';
import './Client.css';

function Client() {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
 
  useEffect(() => {
    const account = localStorage.getItem('selectedAccount');
    if (account) {
      setSelectedAccount(account);
      fetchBalance(account);
    }
  }, []);

  const fetchBalance = async (account) => {
    const balance = await getBalance(account);
    if (balance) {
      setBalance(balance);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectName || !projectDescription || !projectBudget) {
      alert("Please fill in all project details.");
      return;
    }

    try {
      await addProject(projectName, projectDescription, projectBudget, selectedAccount);
      setStatusMessage("Project added successfully!");
      setProjectName('');
      setProjectDescription('');
      setProjectBudget('');
      setIsModalOpen(false); // Close the modal after successful project addition
    } catch (error) {
      console.error("Error adding project:", error);
      setStatusMessage("Failed to add project. Please try again.");
    }
  };

  const handleViewProjects = () => {
    navigate('/client/projects', { state: { selectedAccount } });
  };

  const handleViewQuotations = () => {
    navigate('/client/quotations', { state: { selectedAccount } });
  };

  return (
    <div className="clients-projects-page">
      <section className="dashboard-panel">
        <div className="page-title">
          <div>
            <h2>Client Dashboard</h2>
            <p className="subtle-text">Create new jobs, review quotes, and manage project flow with a clean Web3 dashboard.</p>
          </div>
        </div>

        <div className="dashboard-ticker">
          <span>Live updates</span>
          <p>New quote received • 1 milestone ready • 0 unresolved requests</p>
        </div>

        <div className="dashboard-summary">
          <div className="metric-card">
            <h3>Connected wallet</h3>
            <p>{selectedAccount || 'No wallet connected'}</p>
          </div>
          <div className="metric-card">
            <h3>Balance</h3>
            <p>{balance ? `${balance} ETH` : 'Loading...'}</p>
          </div>
          <div className="metric-card">
            <h3>Action center</h3>
            <p>Launch projects and review quotes instantly</p>
          </div>
        </div>

        <div className="dashboard-insight-grid">
          <div className="insight-card">
            <h4>Active Projects</h4>
            <p>0 ongoing jobs yet — add a project to get bids.</p>
          </div>
          <div className="insight-card">
            <h4>Pending Quotes</h4>
            <p>Track incoming proposals and accept the best fit.</p>
          </div>
          <div className="insight-card">
            <h4>Milestone Trust</h4>
            <p>Use escrow-style workflows for safer freelancer payments.</p>
          </div>
        </div>

        <div className="activity-panel">
          <div className="activity-header">
            <h3>Recent activity</h3>
            <span className="badge">Live</span>
          </div>
          <div className="activity-items">
            <div className="activity-item">
              <p className="activity-title">New project draft ready</p>
              <p className="activity-detail">Add details and publish to start receiving bids.</p>
            </div>
            <div className="activity-item">
              <p className="activity-title">Quote from freelancer</p>
              <p className="activity-detail">A proposal is waiting for your review in the quotations page.</p>
            </div>
            <div className="activity-item">
              <p className="activity-title">Milestone workflow</p>
              <p className="activity-detail">Hold project funds in a secure smart contract until delivery.</p>
            </div>
          </div>
        </div>

        <div className="client-actions">
          <button className="button-primary" onClick={() => setIsModalOpen(true)}>Add Project</button>
          <button className="button-secondary" onClick={handleViewProjects}>View Projects</button>
          <button className="button-secondary" onClick={handleViewQuotations}>View Quotations</button>
        </div>

        {statusMessage && <p className="status-message">{statusMessage}</p>}
      </section>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-button" type="button" onClick={() => setIsModalOpen(false)}>✕</button>
            <h3>Add a New Project</h3>
            <form onSubmit={handleAddProject}>
              <div>
                <label>Project Name:</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Project Description:</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Project Budget (in ETH):</label>
                <input
                  type="number"
                  value={projectBudget}
                  onChange={(e) => setProjectBudget(e.target.value)}
                  required
                />
              </div>
              <div className="client-actions">
                <button type="submit" className="button-primary">Submit</button>
                <button type="button" className="button-secondary" onClick={() => setIsModalOpen(false)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Client;


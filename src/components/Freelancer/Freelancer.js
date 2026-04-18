// // // delance/src/components/Freelancer.js
// // import React, { useEffect, useState } from 'react';
// // import { connectWallet } from '../../services/web3'; // Import connectWallet function
// // import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation

// // function Freelancer() {
// //   const [selectedAccount, setSelectedAccount] = useState('');
// //   const [balance, setBalance] = useState('');
// //   const navigate = useNavigate(); // Initialize the useNavigate hook

// //   useEffect(() => {
// //     const account = localStorage.getItem('selectedAccount');
// //     if (account) {
// //       setSelectedAccount(account);
// //       fetchBalance(account);
// //     }
// //   }, []); 

// //   const fetchBalance = async (account) => {
// //     const { web3 } = await connectWallet();
// //     if (web3) {
// //       const balance = await web3.eth.getBalance(account);
// //       setBalance(web3.utils.fromWei(balance, 'ether'));
// //     }
// //   };

// //   // Function to navigate to the FreelancerProjectsPage
// //   const handleViewProjects = () => {
// //     navigate('/freelancer/projects', { state: { selectedAccount } });
// //   };

// //   // Function to navigate to the YourProjects page
// //   const handleYourProjects = () => {
// //     navigate('/freelancer/your-projects', { state: { selectedAccount } });
// //   };

// //   return (
// //     <div>
// //       <h2>Freelancer Dashboard</h2>
// //       {selectedAccount && <p>Connected Account: {selectedAccount}</p>}
// //       {balance && <p>Account Balance: {balance} ETH</p>}
// //       <button onClick={handleViewProjects}>View Projects</button>
// //       <button onClick={handleYourProjects}>Your Projects</button> {/* New button */}
// //     </div>
// //   );
// // }

// // export default Freelancer;


// // delance/src/components/Freelancer.js
// import React, { useEffect, useState } from 'react';
// import { connectWallet } from '../../services/web3'; // Import connectWallet function
// import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
// import { getFreelancerRating } from '../../services/web3'; // Import getFreelancerRating function

// function Freelancer() {
//   const [selectedAccount, setSelectedAccount] = useState('');
//   const [balance, setBalance] = useState('');
//   const [rating, setRating] = useState(null); // State for freelancer rating
//   const navigate = useNavigate(); // Initialize the useNavigate hook

//   useEffect(() => {
//     const account = localStorage.getItem('selectedAccount');
//     if (account) {
//       setSelectedAccount(account);
//       fetchBalance(account);
//       fetchFreelancerRating(account); // Fetch the freelancer rating
//     }
//   }, []);

//   const fetchBalance = async (account) => {
//     const { web3 } = await connectWallet();
//     if (web3) {
//       const balance = await web3.eth.getBalance(account);
//       setBalance(web3.utils.fromWei(balance, 'ether'));
//     }
//   };

//   const fetchFreelancerRating = async (account) => {
//     const result = await getFreelancerRating(account); // Call the getFreelancerRating function
//     if (result.success) {
//       setRating(result.rating); // Set the rating state
//     } else {
//       console.error(result.message); // Handle error
//     }
//   };

//   // Function to navigate to the FreelancerProjectsPage
//   const handleViewProjects = () => {
//     navigate('/freelancer/projects', { state: { selectedAccount } });
//   };

//   // Function to navigate to the YourProjects page
//   const handleYourProjects = () => {
//     navigate('/freelancer/your-projects', { state: { selectedAccount } });
//   };

//   return (
//     <div>
//       <h2>Freelancer Dashboard</h2>
//       {selectedAccount && <p>Connected Account: {selectedAccount}</p>}
//       {balance && <p>Account Balance: {balance} ETH</p>}
//       {rating !== null && <p>Freelancer Rating: {rating}</p>} {/* Display the rating */}
//       <button onClick={handleViewProjects}>View Projects</button>
//       <button onClick={handleYourProjects}>Your Projects</button> {/* New button */}
//     </div>
//   );
// }

// export default Freelancer;

// delance/src/components/Freelancer.js
import React, { useEffect, useState } from 'react';
import { connectWallet } from '../../services/web3'; // Import connectWallet function
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import { getFreelancerRating } from '../../services/web3'; // Import getFreelancerRating function
import './Freelancer.css'; // Import the CSS file

function Freelancer() {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [rating, setRating] = useState(null); // State for freelancer rating
  const navigate = useNavigate(); // Initialize the useNavigate hook

  useEffect(() => {
    const account = localStorage.getItem('selectedAccount');
    if (account) {
      setSelectedAccount(account);
      fetchBalance(account);
      fetchFreelancerRating(account); // Fetch the freelancer rating
    }
  }, []);

  const fetchBalance = async (account) => {
    const { web3 } = await connectWallet();
    if (web3) {
      const balance = await web3.eth.getBalance(account);
      setBalance(web3.utils.fromWei(balance, 'ether'));
    }
  };

  const fetchFreelancerRating = async (account) => {
    const result = await getFreelancerRating(account); // Call the getFreelancerRating function
    if (result.success) {
      setRating(result.rating); // Set the rating state
    } else {
      console.error(result.message); // Handle error
    }
  };

  // Function to navigate to the FreelancerProjectsPage
  const handleViewProjects = () => {
    navigate('/freelancer/projects', { state: { selectedAccount } });
  };

  // Function to navigate to the YourProjects page
  const handleYourProjects = () => {
    navigate('/freelancer/your-projects', { state: { selectedAccount } });
  };

  return (
    <div className="freelancer-container">
      <section className="freelancer-panel">
        <div className="page-title">
          <div>
            <h2 className="freelancer-title">Freelancer Dashboard</h2>
            <p className="subtle-text">Browse available jobs, monitor your wallet, and track your reputation in one sleek panel.</p>
          </div>
        </div>

        <div className="freelancer-stats">
          <div className="freelancer-card">
            <h3>Wallet</h3>
            <p>{selectedAccount || 'No wallet connected'}</p>
          </div>
          <div className="freelancer-card">
            <h3>Balance</h3>
            <p>{balance ? `${balance} ETH` : 'Loading...'}</p>
          </div>
          <div className="freelancer-card">
            <h3>Rating</h3>
            <p>{rating !== null ? rating : 'Not rated yet'}</p>
          </div>
        </div>

        <div className="dashboard-ticker">
          <span>Live updates</span>
          <p>2 new gigs available • 1 project awarded • 0 unpaid milestones</p>
        </div>

        <div className="dashboard-insight-grid">
          <div className="insight-card">
            <h4>Open bids</h4>
            <p>Browse current client opportunities and send your best proposal.</p>
          </div>
          <div className="insight-card">
            <h4>Milestone-ready</h4>
            <p>Work on projects with milestone payment transparency.</p>
          </div>
          <div className="insight-card">
            <h4>Reputation boost</h4>
            <p>Complete jobs and improve your Web3 freelancer score.</p>
          </div>
        </div>

        <div className="activity-panel">
          <div className="activity-header">
            <h3>Recent activity</h3>
            <span className="badge">New</span>
          </div>
          <div className="activity-items">
            <div className="activity-item">
              <p className="activity-title">New job available</p>
              <p className="activity-detail">A client has posted a project in your preferred category.</p>
            </div>
            <div className="activity-item">
              <p className="activity-title">Awaiting reply</p>
              <p className="activity-detail">One of your proposals is pending client approval.</p>
            </div>
            <div className="activity-item">
              <p className="activity-title">Reputation score</p>
              <p className="activity-detail">Complete the first project to unlock a better rating.</p>
            </div>
          </div>
        </div>

        <div className="freelancer-actions">
          <button className="freelancer-button" onClick={handleViewProjects}>View Projects</button>
          <button className="freelancer-button" onClick={handleYourProjects}>Your Projects</button>
        </div>
      </section>
    </div>
  );
}

export default Freelancer;

// import React, { useState } from 'react';
// import { acceptMilestoneReviewRequest, rejectMilestoneReviewRequest } from '../../../../../services/web3'; // Adjust the path based on your project structure
// import './ReviewRequestCard.css'

// function ReviewRequestCard({ request, selectedAccount, projectId }) {
//     console.log(selectedAccount);
//     console.log(projectId);
//     console.log(request.requestId);
//   const [declineReason, setDeclineReason] = useState('');
//   const [isDeclining, setIsDeclining] = useState(false);

//   // Handler for accepting the review request
//   const handleAccept = async () => {
//     try {
//       await acceptMilestoneReviewRequest(request.requestId, projectId, selectedAccount);
//       console.log('Request accepted successfully.');
//     } catch (error) {
//       console.error('Error accepting request:', error);
//     }
//   };

//   // Handler for declining the review request
//   const handleDecline = async () => {
//     try {
//       await rejectMilestoneReviewRequest(request.requestId, declineReason, selectedAccount);
//       console.log('Request declined successfully.');
//       setIsDeclining(false); // Close the input after sending
//       setDeclineReason(''); // Reset the reason
//     } catch (error) {
//       console.error('Error declining request:', error);
//     }
//   };

//   return (
//     <div className="review-request-card">
//       <p>Request ID: {request.requestId}</p>
//       <p>Milestone ID: {request.milestoneId}</p>
//       <p>Freelancer: {request.freelancer}</p>
//       <p>CID: {request.cid}</p>
//       <p>Reviewed: {request.reviewed ? "Yes" : "No"}</p>
      
//       <button onClick={handleAccept}>Accept Request</button>
      
//       <button onClick={() => setIsDeclining(true)}>Decline Request</button>
      
//       {isDeclining && (
//         <div className="decline-reason-input">
//           <textarea
//             value={declineReason}
//             onChange={(e) => setDeclineReason(e.target.value)}
//             placeholder="Enter reason for declining..."
//           />
//           <button onClick={handleDecline}>Send</button>
//           <button onClick={() => setIsDeclining(false)}>Cancel</button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default ReviewRequestCard;

import React, { useState } from 'react';
import { acceptMilestoneReviewRequest, rejectMilestoneReviewRequest } from '../../../../../services/web3';
import './ReviewRequestCard.css';

const shortenAddress = (address) => {
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

function ReviewRequestCard({ request, selectedAccount, projectId }) {
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    try {
      await acceptMilestoneReviewRequest(request.requestId, request.milestoneId, selectedAccount);
      console.log('Request accepted successfully.');
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDecline = async () => {
    try {
      await rejectMilestoneReviewRequest(request.requestId, declineReason, selectedAccount);
      console.log('Request declined successfully.');
      setIsDeclining(false);
      setDeclineReason('');
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  return (
    <article className="review-request-card">
      <div className="review-request-card__header">
        <div>
          <span className="review-request-card__label">Request ID</span>
          <p className="review-request-card__title">{request.requestId}</p>
        </div>
        <span className={`status-chip ${request.reviewed ? 'status-chip--success' : 'status-chip--pending'}`}>
          {request.reviewed ? 'Reviewed' : 'Pending'}
        </span>
      </div>

      <div className="review-request-card__grid">
        <div>
          <span className="review-request-card__label">Milestone</span>
          <p className="review-request-card__value">#{request.milestoneId}</p>
        </div>
        <div>
          <span className="review-request-card__label">Freelancer</span>
          <p className="review-request-card__value">{shortenAddress(request.freelancer)}</p>
        </div>
        <div className="review-request-card__full-width">
          <span className="review-request-card__label">CID</span>
          <p className="review-request-card__value">{request.cid || '—'}</p>
        </div>
      </div>

      {!request.reviewed && (
        <div className="review-request-card__actions">
          <button className="button button--success" type="button" onClick={handleAccept}>
            Accept Request
          </button>
          <button className="button button--danger" type="button" onClick={() => setIsDeclining(true)}>
            Decline Request
          </button>
        </div>
      )}

      {isDeclining && (
        <div className="decline-reason-input">
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Enter reason for declining..."
          />
          <div className="decline-actions">
            <button className="button button--primary" type="button" onClick={handleDecline}>
              Send
            </button>
            <button className="button button--secondary" type="button" onClick={() => setIsDeclining(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default ReviewRequestCard;

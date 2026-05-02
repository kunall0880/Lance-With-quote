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
import { acceptMilestoneReviewRequest, rejectMilestoneReviewRequest } from '../../../../../services/web3'; // Adjust the path based on your project structure
import './ReviewRequestCard.css';

function ReviewRequestCard({ request, selectedAccount, projectId }) {
    console.log("hi");
    console.log(typeof(request.requestId));
    console.log(typeof(projectId));
    console.log(typeof(selectedAccount));
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  // Handler for accepting the review request
  const handleAccept = async () => {
    try {
      console.log("Calling acceptMilestoneReviewRequest with:", {
        reviewRequestId: request.requestId,
        milestoneId: request.milestoneId,
        selectedAccount
      });
      await acceptMilestoneReviewRequest(request.requestId, request.milestoneId, selectedAccount);
      console.log('Request accepted successfully.');
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  // Handler for declining the review request
  const handleDecline = async () => {
    try {
      await rejectMilestoneReviewRequest(request.requestId, declineReason, selectedAccount);
      console.log('Request declined successfully.');
      setIsDeclining(false); // Close the input after sending
      setDeclineReason(''); // Reset the reason
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  return (
    <div className="review-request-card">
      <p>Request ID: {request.requestId}</p>
      <p>Milestone ID: {request.milestoneId}</p>
      <p>Freelancer: {request.freelancer}</p>
      <p>CID: {request.cid}</p>
      <p>Reviewed: {request.reviewed ? "Yes" : "No"}</p>
      
      {/* Conditionally render buttons based on the reviewed status */}
      {!request.reviewed && (
        <>
          <button onClick={handleAccept}>Accept Request</button>
          <button onClick={() => setIsDeclining(true)}>Decline Request</button>
          
          {isDeclining && (
            <div className="decline-reason-input">
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter reason for declining..."
              />
              <button onClick={handleDecline}>Send</button>
              <button onClick={() => setIsDeclining(false)}>Cancel</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReviewRequestCard;

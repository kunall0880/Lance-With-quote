import React, { useState } from 'react';
import { downloadFilesForMilestone, fetchMilestoneReviewRequestsByMilestoneId } from '../../../../services/web3';
import ReviewRequestCard from './ReviewRequestCard/ReviewRequestCard';
import './MilestoneCard.css';

function MilestoneCard({ milestone, selectedAddress, projectId }) {
  const [reviewRequests, setReviewRequests] = useState([]);
  const [showReviewRequests, setShowReviewRequests] = useState(false);

  const handleDownloadFiles = async () => {
    await downloadFilesForMilestone(milestone.id);
  };

  const handleViewReviewRequests = async () => {
    if (showReviewRequests) {
      setShowReviewRequests(false);
      setReviewRequests([]);
      return;
    }

    try {
      const requests = await fetchMilestoneReviewRequestsByMilestoneId(milestone.id);
      setReviewRequests(requests);
      setShowReviewRequests(true);
    } catch (error) {
      console.error('Error fetching review requests:', error);
    }
  };

  return (
    <article className="milestone-card">
      <header className="milestone-card__header">
        <div>
          <span className="milestone-card__id">Milestone #{milestone.id}</span>
          <h3 className="milestone-card__title">{milestone.name}</h3>
        </div>
        <span className="status-chip status-chip--submitted">Review</span>
      </header>

      <div className="milestone-card__grid">
        <div className="milestone-card__field">
          <span className="milestone-card__label">Description</span>
          <span className="milestone-card__value">{milestone.description || 'No description available.'}</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Deadline</span>
          <span className="milestone-card__value">{milestone.daycount} days</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Milestone Share</span>
          <span className="milestone-card__value">{milestone.percentage}%</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Completed</span>
          <span className="milestone-card__value">{milestone.completed ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className="milestone-card__actions">
        <button type="button" className="button button--secondary" onClick={handleDownloadFiles}>
          Download Files
        </button>
        <button type="button" className="button button--primary" onClick={handleViewReviewRequests}>
          {showReviewRequests ? 'Hide Review Requests' : 'View Review Requests'}
        </button>
      </div>

      {showReviewRequests && (
        <section className="milestone-card__responses">
          <div className="section-title-row">
            <h4 className="section-title">Review Requests</h4>
            <span className="section-subtitle">{reviewRequests.length} request{reviewRequests.length === 1 ? '' : 's'}</span>
          </div>
          {reviewRequests.length > 0 ? (
            reviewRequests.map((request) => (
              <ReviewRequestCard
                key={request.requestId}
                request={request}
                selectedAccount={selectedAddress}
                projectId={projectId}
              />
            ))
          ) : (
            <p className="empty-state">No review requests found for this milestone.</p>
          )}
        </section>
      )}
    </article>
  );
}

export default MilestoneCard;


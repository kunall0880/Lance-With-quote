import React from 'react';
import './ReviewResponseCard.css';

const shortenAddress = (address) => {
    if (!address) return '—';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

function ReviewResponseCard({ response }) {
    return (
        <div className="review-response-card">
            <div className="review-response-card__header">
                <div>
                    <span className="review-response-card__label">Response ID</span>
                    <p className="review-response-card__title">{response.responseId}</p>
                </div>
                <span className={`status-chip ${response.accepted ? 'status-chip--success' : 'status-chip--warning'}`}>
                    {response.accepted ? 'Accepted' : 'Rejected'}
                </span>
            </div>

            <div className="review-response-card__grid">
                <div>
                    <span className="review-response-card__label">Milestone</span>
                    <p className="review-response-card__value">#{response.milestoneId}</p>
                </div>
                <div>
                    <span className="review-response-card__label">Freelancer</span>
                    <p className="review-response-card__value">{shortenAddress(response.freelancer)}</p>
                </div>
            </div>

            <div className="review-response-card__field">
                <span className="review-response-card__label">Response</span>
                <p className="review-response-card__value">{response.response || 'No response text provided.'}</p>
            </div>
        </div>
    );
}

export default ReviewResponseCard;

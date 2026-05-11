// delance/src/components/YourProjectCard.js
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { getFreelancerRating, getMilestones } from '../../../../services/web3'; // Adjust the path based on your project structure
import MilestoneCard from '../MilestoneCard/MilestoneCard';
import './ProjectCard.css'

const YourProjectCard = ({ project, selectedAccount }) => {
  const { id, name, description, reward, status, employer } = project;
  const [freelancerRating, setFreelancerRating] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [showMilestones, setShowMilestones] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const web3 = new Web3();

  // Utility function to format amounts from Wei to ETH
  const formatAmount = (value) => {
    if (value === undefined || value === null) return '0';
    const rawValue = String(value);
    if (rawValue === '0' || rawValue === '') return '0';

    // If the value looks like a large Wei amount, convert it to Ether.
    if (/^\d+$/.test(rawValue) && rawValue.length > 12) {
      try {
        return web3.utils.fromWei(rawValue, 'ether');
      } catch (error) {
        console.error('Amount conversion error:', error, rawValue);
      }
    }

    return rawValue;
  };

  // Utility function to shorten addresses
  const shortenAddress = (address) => {
    if (!address) return '—';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusMap = {
      0: { text: 'Open', class: 'status-open' },
      1: { text: 'In Progress', class: 'status-in-progress' },
      2: { text: 'Submitted', class: 'status-submitted' },
      3: { text: 'Completed', class: 'status-completed' },
      4: { text: 'Paid', class: 'status-paid' },
      5: { text: 'Disputed', class: 'status-disputed' }
    };
    return statusMap[status] || { text: 'Unknown', class: 'status-unknown' };
  };

  // Fetch the freelancer's rating when the component mounts
  useEffect(() => {
    const fetchFreelancerRating = async () => {
      if (selectedAccount) {
        try {
          const rating = await getFreelancerRating(selectedAccount);
          setFreelancerRating(rating.rating);
        } catch (error) {
          console.error('Error fetching freelancer rating:', error);
        }
      }
    };

    fetchFreelancerRating();
  }, [selectedAccount]);

  // Handle viewing milestones for the project
  const handleViewMilestones = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      if (!showMilestones) {
        const fetchedMilestones = await getMilestones(id);

        // Ensure fetched milestones are in an array format
        if (Array.isArray(fetchedMilestones)) {
          setMilestones(fetchedMilestones);
        } else {
          console.error("Fetched milestones data is not an array:", fetchedMilestones);
          setMilestones([]);
        }
      }
      setShowMilestones(!showMilestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = getStatusBadge(status);

  return (
    <article className="your-project-card">
      {/* Project Header */}
      <header className="project-header">
        <div className="project-title-section">
          <h3 className="project-title">{name}</h3>
          <span className={`status-badge ${statusBadge.class}`}>
            {statusBadge.text}
          </span>
        </div>
        <p className="project-description">{description}</p>
      </header>

      {/* Project Metadata */}
      <div className="project-metadata">
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="metadata-label">Reward</span>
            <span className="metadata-value">{formatAmount(reward)} ETH</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Employer</span>
            <span className="metadata-value">{shortenAddress(employer)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Your Rating</span>
            <span className="metadata-value">
              {freelancerRating !== undefined && freelancerRating !== null
                ? `${freelancerRating}/5 ⭐`
                : 'N/A'
              }
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Milestones</span>
            <span className="metadata-value">{milestones.length || '—'}</span>
          </div>
        </div>
      </div>

      {/* Project Actions */}
      <footer className="project-actions">
        <button
          className="btn-primary"
          onClick={handleViewMilestones}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner"></span>
              Loading...
            </>
          ) : (
            <>
              <span className="btn-icon">📋</span>
              {showMilestones ? "Hide Milestones" : "View Milestones"}
            </>
          )}
        </button>
      </footer>

      {/* Milestones Section */}
      {showMilestones && (
        <div className="milestones-section">
          <h4 className="milestones-title">Milestones</h4>
          <div className="milestones-list">
            {milestones.length > 0 ? (
              milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  selectedAccount={selectedAccount}
                />
              ))
            ) : (
              <p className="no-milestones">No milestones available.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default YourProjectCard;


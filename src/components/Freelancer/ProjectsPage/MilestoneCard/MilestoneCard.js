import React from 'react';
import './MilestoneCard.css';

function MilestoneCard({ milestone }) {
  return (
    <article className="milestone-card">
      <header className="milestone-card__header">
        <span className="milestone-card__id">Milestone #{milestone.id}</span>
        <span className="status-chip status-chip--submitted">Summary</span>
      </header>

      <div className="milestone-card__grid">
        <div className="milestone-card__field">
          <span className="milestone-card__label">Name</span>
          <span className="milestone-card__value">{milestone.name}</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Status</span>
          <span className="milestone-card__value">{milestone.completed ? 'Completed' : 'In Progress'}</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Description</span>
          <span className="milestone-card__value">{milestone.description}</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Time</span>
          <span className="milestone-card__value">{milestone.daycount} days</span>
        </div>
        <div className="milestone-card__field">
          <span className="milestone-card__label">Share</span>
          <span className="milestone-card__value">{milestone.percentage}%</span>
        </div>
      </div>
    </article>
  );
}

export default MilestoneCard;

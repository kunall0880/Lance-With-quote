import React, { useState } from 'react';
import Web3 from 'web3';
import { safeProposeQuotation } from '../../../services/web3';
import './QuotationForm.css';

const QuotationForm = ({ projectId, projectReward, freelancerAddress, freelancerRating, onSuccess }) => {
  const [quotationAmount, setQuotationAmount] = useState(projectReward ? parseFloat(projectReward).toString() : '');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const web3 = new Web3();
  const rewardAsNumber = parseFloat(projectReward);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(quotationAmount);
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid quotation amount');
      return;
    }

    if (!description || description.trim() === '') {
      setError('Please provide a description for your quotation');
      return;
    }

    setIsSubmitting(true);

    try {
      // Propose quotation using safe wrapper with full validation
      const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
      console.log('Proposing quotation with:', { projectId, amountInWei, description, freelancerAddress });
      
      // Use safeProposeQuotation which validates project ID before sending transaction
      const quotationReceipt = await safeProposeQuotation(
        projectId,
        amountInWei,
        description,
        freelancerAddress,
        freelancerRating
      );
      console.log('Quotation proposed successfully:', quotationReceipt);

      setSuccess('Quotation proposed successfully! Waiting for employer response.');
      setQuotationAmount(rewardAsNumber.toString());
      setDescription('');

      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err) {
      console.error('Error proposing quotation:', err);
      console.error('Full error object:', err);
      setError(`Error: ${err.message || 'Failed to propose quotation'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quotationAmountNum = parseFloat(quotationAmount) || 0;
  const budgetDifference = Math.abs(quotationAmountNum - rewardAsNumber).toFixed(2);
  const isBelowBudget = quotationAmountNum > 0 && quotationAmountNum < rewardAsNumber;
  const isAboveBudget = quotationAmountNum > 0 && quotationAmountNum > rewardAsNumber;

  return (
    <div className="quotation-form-container">
      <h3>Propose Your Quotation</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Budget (Reference): <span className="text-muted">{rewardAsNumber} ETH</span></label>
        </div>

        <div className="form-group">
          <label htmlFor="quotationAmount">Your Quotation Amount (ETH)</label>
          <input
            type="number"
            id="quotationAmount"
            value={quotationAmount}
            onChange={(e) => setQuotationAmount(e.target.value)}
            placeholder="Enter your proposed amount"
            step="0.01"
            min="0"
            disabled={isSubmitting}
          />
          <p className="amount-note">
            {isBelowBudget 
              ? `💚 Below budget by ${budgetDifference} ETH` 
              : isAboveBudget 
              ? `⚠️ Above budget by ${budgetDifference} ETH` 
              : ''}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="description">Quotation Description / Notes</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain your quotation, timeline, deliverables, etc."
            rows="5"
            disabled={isSubmitting}
          />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quotation'}
        </button>
      </form>
    </div>
  );
};

export default QuotationForm;

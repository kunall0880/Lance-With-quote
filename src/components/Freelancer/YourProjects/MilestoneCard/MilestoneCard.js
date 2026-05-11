import React, { useState } from 'react';
import Web3 from 'web3';
import { uploadFiletoIPFS } from '../../../../services/ipfs';
import { fetchReviewResponsesByMilestoneId, raiseDispute, uploadMilestoneProof } from '../../../../services/web3';
import ReviewResponseCard from './ReviewResponseCard/ReviewResponseCard';
import './MilestoneCard.css';

function MilestoneCard({ milestone, selectedAccount }) {
    const web3 = new Web3();

    const formatAmount = (value) => {
        if (value === undefined || value === null) return 'TBD';
        const rawValue = String(value);
        if (rawValue === '0' || rawValue === '') return 'TBD';

        // If the value looks like a large Wei amount, convert it to Ether.
        if (/^\d+$/.test(rawValue) && rawValue.length > 12) {
            try {
                return `${web3.utils.fromWei(rawValue, 'ether')} ETH`;
            } catch (error) {
                console.error('Amount conversion error:', error, rawValue);
            }
        }

        return `${rawValue} ETH`;
    };

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadResult, setUploadResult] = useState(null);
    const [reviewResponses, setReviewResponses] = useState([]);
    const [showResponses, setShowResponses] = useState(false);

    const getStatusString = (status) => {
        const statuses = ['Pending', 'Submitted', 'Approved', 'Disputed', 'Resolved'];
        return statuses[status] || 'Unknown';
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 0:
                return 'pending';
            case 1:
                return 'submitted';
            case 2:
                return 'approved';
            case 3:
                return 'disputed';
            case 4:
                return 'resolved';
            default:
                return 'unknown';
        }
    };

    const shortenAddress = (address) => {
        if (!address) return '—';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Please select a file to upload.');
            return;
        }

        try {
            const result = await uploadFiletoIPFS(selectedFile, milestone.id, selectedAccount);
            setUploadResult(result);
            console.log('Uploaded IPFS URL:', result.url);

            const submitResult = await uploadMilestoneProof(milestone.projectId, milestone.id, selectedAccount, result.url);
            if (submitResult.success) {
                alert('File uploaded and milestone submitted successfully!');
            } else {
                alert('File uploaded but failed to submit milestone: ' + submitResult.message);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file.');
        }
    };

    const handleRaiseDispute = async () => {
        try {
            const result = await raiseDispute(milestone.id, milestone.projectId, selectedAccount);
            if (result.success) {
                alert('Dispute raised successfully!');
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error raising dispute:', error);
            alert('Failed to raise dispute.');
        }
    };

    const handleToggleReviewResponses = async () => {
        if (!showResponses) {
            try {
                const responses = await fetchReviewResponsesByMilestoneId(milestone.id);
                setReviewResponses(responses);
            } catch (error) {
                console.error('Error fetching review responses:', error);
            }
        }
        setShowResponses(!showResponses);
    };

    return (
        <article className="milestone-card">
            <header className="milestone-card__header">
                <div>
                    <span className="milestone-card__id">Milestone #{milestone.id}</span>
                    <h3 className="milestone-card__title">{milestone.name || 'Untitled milestone'}</h3>
                </div>
                <span className={`status-chip status-chip--${getStatusClass(milestone.status)}`}>
                    {getStatusString(milestone.status)}
                </span>
            </header>

            <div className="milestone-card__grid">
                <div className="milestone-card__field">
                    <span className="milestone-card__label">Description</span>
                    <span className="milestone-card__value">{milestone.description || 'No description provided.'}</span>
                </div>
                <div className="milestone-card__field">
                    <span className="milestone-card__label">Deadline</span>
                    <span className="milestone-card__value">{milestone.daycount} days</span>
                </div>
                <div className="milestone-card__field">
                    <span className="milestone-card__label">Share</span>
                    <span className="milestone-card__value">{milestone.percentage}%</span>
                </div>
                <div className="milestone-card__field">
                    <span className="milestone-card__label">Amount</span>
                    <span className="milestone-card__value">{formatAmount(milestone.amount)}</span>
                </div>
                <div className="milestone-card__field">
                    <span className="milestone-card__label">Freelancer</span>
                    <span className="milestone-card__value">{shortenAddress(milestone.freelancer)}</span>
                </div>
                <div className="milestone-card__field">
                    <span className="milestone-card__label">Client</span>
                    <span className="milestone-card__value">{shortenAddress(milestone.client)}</span>
                </div>
            </div>

            <div className="milestone-card__section">
                <h4 className="section-title">Proof Upload</h4>
                <div className="milestone-card__actions">
                    <label className="file-input-label">
                        <span className="file-input-label__text">Choose proof file</span>
                        <input type="file" onChange={handleFileChange} className="file-input" />
                    </label>
                    <button className="button button--primary" onClick={handleUpload} disabled={!selectedFile}>
                        Upload & Submit
                    </button>
                    <button className="button button--secondary" onClick={handleToggleReviewResponses}>
                        {showResponses ? 'Hide Review Responses' : 'View Review Responses'}
                    </button>
                    {milestone.status === 1 && (selectedAccount === milestone.freelancer || selectedAccount === milestone.client) && (
                        <button className="button button--danger" onClick={handleRaiseDispute}>
                            Raise Dispute
                        </button>
                    )}
                </div>
                {uploadResult && (
                    <div className="milestone-card__result">
                        <span className="milestone-card__result-label">Uploaded to IPFS:</span>
                        <a href={uploadResult.url} target="_blank" rel="noreferrer" className="milestone-card__result-link">
                            {uploadResult.url}
                        </a>
                    </div>
                )}
            </div>

            {showResponses && (
                <section className="milestone-card__responses">
                    <div className="section-title-row">
                        <h4 className="section-title">Review Responses</h4>
                        <span className="section-subtitle">{reviewResponses.length} response{reviewResponses.length === 1 ? '' : 's'}</span>
                    </div>
                    {reviewResponses.length > 0 ? (
                        reviewResponses.map((response) => (
                            <ReviewResponseCard key={response.responseId} response={response} />
                        ))
                    ) : (
                        <p className="empty-state">No review responses have been submitted yet.</p>
                    )}
                </section>
            )}
        </article>
    );
}

export default MilestoneCard;

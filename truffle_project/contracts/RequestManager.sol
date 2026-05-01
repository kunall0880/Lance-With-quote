// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Projects.sol";

contract Escrow {
    address public freelancer;
    address public employer;
    address public requestManager;
    uint public amount;

    constructor(address _freelancer, address _employer, address _requestManager, uint _amount) payable {
        freelancer = _freelancer;
        employer = _employer;
        requestManager = _requestManager;
        amount = _amount;
    }

    function releaseFunds() external {
        require(msg.sender == employer || msg.sender == requestManager, "Only the employer or RequestManager can release funds");
        (bool success, ) = payable(freelancer).call{value: amount}("");
        require(success, "Transfer failed");
    }
}

contract RequestManager {
    Projects public projectsContract;

    enum RequestStatus { Pending, Accepted, Rejected }
    enum QuotationStatus { Pending, Proposed, Negotiating, Accepted, Rejected }

    struct Request {
        uint projectId;
        address freelancer;
        uint freelancerRating;
        RequestStatus status;
        Escrow escrowContract;
    }

    struct Quotation {
        uint projectId;
        address proposedBy;
        uint proposedAmount;
        string description;
        string negotiationNotes;
        QuotationStatus status;
        uint timestamp;
    }

    struct MilestoneReviewRequest {
        uint id;
        uint milestoneId;
        address freelancer;
        string cid;
        bool reviewed;
    }

    struct File {
        uint id;
        uint milestoneId;
        string name;
        string rid;
        string cid;
    }

    struct ReviewResponse{
        uint id;
        uint milestoneId;
        address freelancer;
        string response;
        bool accepted;
    }
    
    mapping(uint => ReviewResponse) public reviewResponses;
    uint public responseCount;

    // Mapping milestone ID to an array of files
    mapping(uint => File[]) public milestoneFiles;
    uint public fileCount;

    // Store all requests in a single mapping
    mapping(uint => Request) public requests;
    mapping(uint => uint) public projectToRequest; // projectId => requestId mapping
    uint public requestCount; // To keep track of the total number of requests

    mapping(uint => Quotation[]) public quotations; // projectId => array of quotations
    mapping(uint => address) public assignedFreelancer; // projectId => freelancer address

    mapping(uint => MilestoneReviewRequest) public milestoneReviewRequests;
    uint public milestoneReviewRequestCount;

    event RequestSent(uint requestId, uint projectId, address freelancer);
    event RequestAccepted(uint requestId, address freelancer, address escrowContract);
    event RequestRejected(uint requestId, address freelancer);
    event QuotationProposed(uint projectId, address proposedBy, uint amount);
    event QuotationCounterProposed(uint projectId, address proposedBy, uint amount, string notes);
    event QuotationAccepted(uint projectId, uint newAmount);
    event QuotationRejected(uint projectId);
    event MilestoneReviewRequestSent(uint requestId, uint milestoneId, string cid);
    event MilestoneAccepted(uint projectId, uint milestoneId, uint updatedRating);
    event MilestoneReviewRequestRejected(uint indexed reviewRequestId, string reason);
    event RejectionReasonAccepted(uint _reviewRequestId);
    event EscrowReleased(uint requestId, address escrowContract, uint amount);

    constructor(address _projectsContract) {
        projectsContract = Projects(_projectsContract);
    }

    function getProjectsContractAddress() public view returns (address) {
        return address(projectsContract);
    }

    function debugProjectCount() public view returns (uint) {
        return projectsContract.projectCount();
    }

    function sendRequest(uint _projectId, uint _freelancerRating) public {
        require(_projectId > 0 && _projectId <= projectsContract.projectCount(), "Invalid project ID");
        (,, , , Projects.Status status, , ) = projectsContract.getProject(_projectId);
        require(status == Projects.Status.Open, "Project is not open");

        // Create a new request
        requestCount++; // Increment request count to create a unique ID
        requests[requestCount] = Request({
            projectId: _projectId,
            freelancer: msg.sender,
            freelancerRating: _freelancerRating,
            status: RequestStatus.Pending,
            escrowContract: Escrow(address(0))
        });
        
        // Map projectId to requestId for easy lookup
        projectToRequest[_projectId] = requestCount;

        emit RequestSent(requestCount, _projectId, msg.sender);
    }

    function acceptRequest(uint _requestId) public payable {
        Request storage request = requests[_requestId];
        require(request.freelancer != address(0), "No request exists for this ID");
        require(request.status == RequestStatus.Pending, "Request is not pending");

        // Fetch project details
        (,, , uint projectReward, Projects.Status status, address employer, ) = projectsContract.getProject(request.projectId);
        require(msg.sender == employer, "Only the employer can accept the request");
        require(status == Projects.Status.Open, "Project must be open");

        // Create new escrow contract instance with freelancer and employer details
        request.escrowContract = new Escrow{value: projectReward}(request.freelancer, employer, address(this), projectReward);

        request.status = RequestStatus.Accepted;
        
        // Mark freelancer as assigned and close the project
        assignedFreelancer[request.projectId] = request.freelancer;
        projectsContract.closeProject(request.projectId);
        
        emit RequestAccepted(_requestId, request.freelancer, address(request.escrowContract));
    }

    function rejectRequest(uint _requestId) public {
        Request storage request = requests[_requestId];
        require(request.freelancer != address(0), "No request exists for this ID");
        require(request.status == RequestStatus.Pending, "Request already processed");

        request.status = RequestStatus.Rejected;
        emit RequestRejected(_requestId, request.freelancer);
    }

    

    function getRequest(uint _requestId) public view returns (Request memory) {
        require(requests[_requestId].freelancer != address(0), "No request exists for this ID");
        return requests[_requestId];
    }

    // New function to view all requests
    function viewAllRequests() public view returns (
        uint[] memory requestIds,
        uint[] memory projectIds,
        address[] memory freelancers,
        uint[] memory ratings,
        RequestStatus[] memory statuses,
        address[] memory escrowContracts
    ) {
        uint count = requestCount;

        // Initialize arrays based on the total request count
        requestIds = new uint[](count);
        projectIds = new uint[](count);
        freelancers = new address[](count);
        ratings = new uint[](count);
        statuses = new RequestStatus[](count);
        escrowContracts = new address[](count);

        // Populate the arrays with request details
        for (uint i = 1; i <= requestCount; i++) {
            Request storage request = requests[i];
            requestIds[i - 1] = i;
            projectIds[i - 1] = request.projectId;
            freelancers[i - 1] = request.freelancer;
            ratings[i - 1] = request.freelancerRating;
            statuses[i - 1] = request.status;
            escrowContracts[i - 1] = address(request.escrowContract);
        }

        return (requestIds, projectIds, freelancers, ratings, statuses, escrowContracts);
    }


    function viewAllReviewResponses() public view returns (
        uint[] memory responseIds,
        uint[] memory milestoneIds,
        address[] memory freelancers,
        string[] memory responses,
        bool[] memory acceptedStatuses
    ) {
        uint count = responseCount;

        // Initialize arrays based on the total response count
        responseIds = new uint[](count);
        milestoneIds = new uint[](count);
        freelancers = new address[](count);
        responses = new string[](count);
        acceptedStatuses = new bool[](count);

        // Populate the arrays with response details
        for (uint i = 1; i <= count; i++) {
            ReviewResponse storage reviewResponse = reviewResponses[i];
            responseIds[i - 1] = reviewResponse.id;
            milestoneIds[i - 1] = reviewResponse.milestoneId;
            freelancers[i - 1] = reviewResponse.freelancer;
            responses[i - 1] = reviewResponse.response;
            acceptedStatuses[i - 1] = reviewResponse.accepted;
        }

        return (responseIds, milestoneIds, freelancers, responses, acceptedStatuses);
    }


    // function acceptMilestone(uint _milestoneId, uint _actualDaysTaken, uint _delayPenalty, uint _requestId) public payable {
    //     Request memory request = getRequest(_requestId); // Retrieve the request using requestId

    //     // Ensure projectId is valid
    //     require(request.projectId > 0 && request.projectId <= projectsContract.projectCount(), "Project does not exist");

    //     // Retrieve the project details using the getProject function
    //     (, , , uint reward, , address employer) = projectsContract.getProject(request.projectId);
    //     require(msg.sender == employer, "Only the employer can accept milestones");

    //     // Ensure milestoneId is valid
    //     (
    //         uint[] memory ids,
    //         uint[] memory projectIds,
    //         string[] memory names,
    //         string[] memory descriptions,
    //         uint[] memory daycounts,
    //         uint[] memory percentages,
    //         bool[] memory completions,
    //         string[] memory proofFileHashes
    //     ) = projectsContract.getMilestones(request.projectId);

    //     // Check if the milestone exists and is within bounds
    //     require(_milestoneId > 0 && _milestoneId <= ids.length, "Milestone does not exist");
        
    //     // Fetch milestone data by using _milestoneId as an index
    //     uint milestoneIndex = _milestoneId - 1;
    //     require(!completions[milestoneIndex], "Milestone already completed");
    //     require(bytes(proofFileHashes[milestoneIndex]).length > 0, "Proof file not uploaded");

    //     // Mark the milestone as completed
    //     projectsContract.completeMilestone(request.projectId, _milestoneId);

    //     // Calculate and update freelancer rating based on the provided formula
    //     uint currentRating = projectsContract.getFreelancerRating(request.freelancer);
    //     uint rewardWeight = (percentages[milestoneIndex] * reward) / 100;
    //     int ratingChange = int((5 * 100 * rewardWeight * daycounts[milestoneIndex]) / (reward * _actualDaysTaken));

    //     // Cap the increment at +0.2 if positive
    //     if (ratingChange > 20) {
    //         ratingChange = 20;
    //     }

    //     uint newRating = uint(int(currentRating) + ratingChange);

    //     // Ensure new rating doesn't exceed 5.0 (500 basis points)
    //     if (newRating > 500) {
    //         newRating = 500;
    //     }

    //     // Update the freelancer's rating
    //     projectsContract.setFreelancerRating(request.freelancer, newRating);

    //     // Release milestone payment from the escrow with the specified penalty
    //     uint milestonePercentage = percentages[milestoneIndex];
    //     request.escrowContract.releaseMilestonePayment(milestonePercentage, _delayPenalty);

    //     emit MilestoneAccepted(request.projectId, _milestoneId, newRating);
    // }


    function viewRequestsByEmployer() public view returns (
            uint[] memory requestIds,
            uint[] memory projectIds,
            address[] memory freelancers,
            uint[] memory ratings,
            RequestStatus[] memory statuses,
            address[] memory escrowContracts
        ) {
            uint count = 0;

            // Count requests that belong to projects owned by the employer
            for (uint i = 1; i <= requestCount; i++) {
                uint projectId = requests[i].projectId;
                (, , , , , address employer, ) = projectsContract.getProject(projectId);
                if (employer == msg.sender) {
                    count++;
                }
            }

            // Initialize arrays based on the count of matching requests
            requestIds = new uint[](count);
            projectIds = new uint[](count);
            freelancers = new address[](count);
            ratings = new uint[](count);
            statuses = new RequestStatus[](count);
            escrowContracts = new address[](count);

            uint index = 0;

            // Populate the arrays with matching request details
            for (uint i = 1; i <= requestCount; i++) {
                uint projectId = requests[i].projectId;
                (, , , , , address employer, ) = projectsContract.getProject(projectId);
                if (employer == msg.sender) {
                    Request storage request = requests[i];
                    requestIds[index] = i;
                    projectIds[index] = request.projectId;
                    freelancers[index] = request.freelancer;
                    ratings[index] = request.freelancerRating;
                    statuses[index] = request.status;
                    escrowContracts[index] = address(request.escrowContract);
                    index++;
                }
            }

            return (requestIds, projectIds, freelancers, ratings, statuses, escrowContracts);
    }

    function sendMilestoneReviewRequest(uint _milestoneId, string calldata _cid, address _freelancer) public {
        // Create a new milestone review request
        milestoneReviewRequestCount++; // Increment count for unique ID
        milestoneReviewRequests[milestoneReviewRequestCount] = MilestoneReviewRequest({
            id: milestoneReviewRequestCount,
            milestoneId: _milestoneId,
            freelancer: _freelancer,
            cid: _cid,
            reviewed: false // Initially, the request is not reviewed
        });

        emit MilestoneReviewRequestSent(milestoneReviewRequestCount, _milestoneId, _cid); // Emit event
    }

    function viewAllMilestoneReviewRequests() public view returns (
        uint[] memory requestIds,
        uint[] memory milestoneIds,
        address[] memory freelancers,
        string[] memory cids,
        bool[] memory reviewedStatuses
    ) {
        uint count = milestoneReviewRequestCount;

        // Initialize arrays based on the total count of review requests
        requestIds = new uint[](count);
        milestoneIds = new uint[](count);
        freelancers = new address[](count);
        cids = new string[](count);
        reviewedStatuses = new bool[](count);

        // Populate the arrays with review request details
        for (uint i = 1; i <= milestoneReviewRequestCount; i++) {
            MilestoneReviewRequest storage reviewRequest = milestoneReviewRequests[i];
            requestIds[i - 1] = reviewRequest.id;
            milestoneIds[i - 1] = reviewRequest.milestoneId;
            freelancers[i - 1] = reviewRequest.freelancer;
            cids[i - 1] = reviewRequest.cid;
            reviewedStatuses[i - 1] = reviewRequest.reviewed;
        }

        return (requestIds, milestoneIds, freelancers, cids, reviewedStatuses);
    }


    function getEscrowAccountFromReviewRequest(uint _reviewRequestId, uint _projectId) public view returns (Escrow) {
        // Fetch the MilestoneReviewRequest using the provided ID
        MilestoneReviewRequest storage reviewRequest = milestoneReviewRequests[_reviewRequestId];

        // Ensure the review request exists
        require(reviewRequest.id != 0, "Review request does not exist");
        
        // Find the corresponding request based on the project ID and freelancer address
        for (uint i = 1; i <= requestCount; i++) {
            Request storage request = requests[i];

            // Check if the request matches the provided projectId and the freelancer address from the review request
            if (request.projectId == _projectId && request.freelancer == reviewRequest.freelancer && request.status == RequestStatus.Accepted) {
                return request.escrowContract; // Return the escrow contract associated with the request
            }
        }

        // If no matching request was found, revert with an error message
        revert("No matching request found for this review request");
    }

    function acceptMilestoneReviewRequest(uint _reviewRequestId, uint _projId) public payable {
        // Fetch the  request using the ID
        MilestoneReviewRequest storage reviewRequest = milestoneReviewRequests[_reviewRequestId];
        require(!reviewRequest.reviewed, "Review request already accepted");

        // Get the milestone ID from the  request
        uint milestoneId = reviewRequest.milestoneId;

        // Retrieve the associated milestones for the project
        (
            uint[] memory ids,
            uint[] memory _projectIds,
            string[] memory names,
            string[] memory descriptions,
            uint[] memory daycounts,
            uint[] memory percentages,
            Projects.MilestoneStatus[] memory statuses,
            address[] memory freelancers,
            address[] memory clients,
            uint[] memory amounts,
            string[] memory proofFileHashes
        ) = projectsContract.getMilestones(_projId);

        // Initialize variables to store the milestone data once we find it
        bool milestoneFound = false;
        string memory milestoneName;
        string memory milestoneDescription;
        uint milestoneDaycount;
        uint milestonePercentage;
        Projects.MilestoneStatus milestoneStatus;
        address milestoneFreelancer;
        address milestoneClient;
        uint milestoneAmount;
        string memory milestoneProofFileHash;

        // Fetch project details and validate the caller is the employer
        (, , , , Projects.Status _status, address employer, ) = projectsContract.getProject(_projId);
        _projectIds.length;
        _status;
        require(msg.sender == employer, "Only the employer can accept milestone review requests");

        // Search for the milestone with the specified milestoneId
        for (uint i = 0; i < ids.length; i++) {
            if (ids[i] == milestoneId) {
                milestoneFound = true;
                milestoneName = names[i];
                milestoneDescription = descriptions[i];
                milestoneDaycount = daycounts[i];
                milestonePercentage = percentages[i];
                milestoneStatus = statuses[i];
                milestoneFreelancer = freelancers[i];
                milestoneClient = clients[i];
                milestoneAmount = amounts[i];
                milestoneProofFileHash = proofFileHashes[i];
                break;
            }
        }

        require(milestoneFound, "Milestone does not exist");

        reviewRequest.reviewed = true;

        // Mark the milestone completed in the Projects contract
        projectsContract.completeMilestone(_projId, milestoneId);

        // Get freelancer's address from the request
        address freelancer = reviewRequest.freelancer;

        // Update freelancer rating based on the milestone percentage
        uint currentRating = projectsContract.getFreelancerRating(freelancer);
        // uint rewardWeight = projReward / 100;
        uint newRating = currentRating + (5 * milestonePercentage / 100);

        // Ensure the new rating does not exceed 500
        if (newRating > 500) {
            newRating = 500;
        }

        // Set the new rating for the freelancer
        projectsContract.setFreelancerRating(freelancer, newRating);

        // If all milestones are now approved, release escrow funds to the freelancer
        bool allMilestonesApproved = true;
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i] != Projects.MilestoneStatus.Approved) {
                allMilestonesApproved = false;
                break;
            }
        }

        if (allMilestonesApproved) {
            Escrow escrow = getEscrowAccountFromReviewRequest(_reviewRequestId, _projId);
            uint escrowAmount = escrow.amount();
            escrow.releaseFunds();
            emit EscrowReleased(_reviewRequestId, address(escrow), escrowAmount);
        }

        uint _milestoneId = reviewRequest.milestoneId;
        address _freelancer = reviewRequest.freelancer;

        responseCount++;
        reviewResponses[responseCount] = ReviewResponse({
            id: responseCount,
            milestoneId: _milestoneId,
            freelancer: _freelancer,
            response: "",
            accepted: true
        });
    }
    //     require(projEmployer == msg.sender, "Only the employer can accept milestones");

    //     // Mark the review request as accepted
    //     reviewRequest.reviewed = true;

    //     // Get freelancer's address from the request
    //     address freelancer = reviewRequest.freelancer;

    //     // Update freelancer rating based on the milestone percentage
    //     uint currentRating = projectsContract.getFreelancerRating(freelancer);
    //     uint rewardWeight = projReward / 100;
    //     uint newRating = currentRating + (5 * milestonePercentage / rewardWeight);

    //     // Ensure the new rating does not exceed 500
    //     if (newRating > 500) {
    //         newRating = 500;
    //     }

    //     // Set the new rating for the freelancer
    //     projectsContract.setFreelancerRating(freelancer, newRating);

    //     // Find the request with the matching projectId and freelancer
    //     uint requestIndex;
    //     bool foundRequest = false;

    //     for (uint i = 0; i < requestCount; i++) {
    //         if (requests[i].projectId == _projId && requests[i].freelancer == freelancer && requests[i].status == RequestStatus.Accepted) {
    //             requestIndex = i;
    //             foundRequest = true;
    //             break;
    //         }
    //     }
    //     require(foundRequest, "Associated request not found");

    //     // Release the milestone payment from escrow using the found request
    //     requests[requestIndex].escrowContract.releaseMilestonePayment(milestonePercentage);

    //     // Emit an event to record the milestone acceptance
    //     emit MilestoneAccepted(projId, milestoneId, newRating);
    // }

    // function acceptMilestoneReviewRequest(uint _reviewRequestId, uint _projId) public payable {
    //     // Fetch the request using the ID
    //     MilestoneReviewRequest storage reviewRequest = milestoneReviewRequests[_reviewRequestId];
    //     require(reviewRequest.id != 0, "Review request does not exist");
    //     require(!reviewRequest.reviewed, "Review request already accepted");

    //     // Get the milestone ID from the request
    //     uint milestoneId = reviewRequest.milestoneId;

    //     // Retrieve the associated milestones for the project
    //     (
    //         uint[] memory ids,
    //         ,  // projectIds not used
    //         ,  // names not used
    //         ,  // descriptions not used
    //         uint[] memory daycounts,
    //         uint[] memory percentages,
    //         bool[] memory completions,
    //         string[] memory proofFileHashes
    //     ) = projectsContract.getMilestones(_projId);

    //     // Verify that the milestone exists and get its index
    //     uint milestoneIndex;
    //     bool milestoneFound = false;
    //     for (uint i = 0; i < ids.length; i++) {
    //         if (ids[i] == milestoneId) {
    //             milestoneIndex = i;
    //             milestoneFound = true;
    //             break;
    //         }
    //     }
    //     require(milestoneFound, "Milestone does not exist");
    //     require(!completions[milestoneIndex], "Milestone already completed");
    //     require(bytes(proofFileHashes[milestoneIndex]).length > 0, "Proof file not uploaded");

    //     // Get project details
    //     (, , , uint projReward, , address projEmployer) = projectsContract.getProject(_projId);
    //     require(msg.sender == projEmployer, "Only the employer can accept milestones");

    //     // Mark the milestone as completed in the Projects contract
    //     projectsContract.completeMilestone(_projId, milestoneId);

    //     // Mark the review request as accepted
    //     reviewRequest.reviewed = true;

    //     // Get freelancer's address from the request
    //     address freelancer = reviewRequest.freelancer;

    //     // Update freelancer rating
    //     uint currentRating = projectsContract.getFreelancerRating(freelancer);
    //     uint milestonePercentage = percentages[milestoneIndex];
        
    //     // Calculate rating increase based on milestone percentage and project reward
    //     uint ratingIncrease = (5 * milestonePercentage * daycounts[milestoneIndex]) / 100;
    //     uint newRating = currentRating + ratingIncrease;
        
    //     // Cap the rating at 500 (5.0)
    //     if (newRating > 500) {
    //         newRating = 500;
    //     }

    //     // Update the freelancer's rating
    //     projectsContract.setFreelancerRating(freelancer, newRating);

    //     // Find the associated request for the escrow
    //     uint requestId;
    //     bool foundRequest = false;
    //     for (uint i = 1; i <= requestCount; i++) {
    //         if (requests[i].projectId == _projId && 
    //             requests[i].freelancer == freelancer && 
    //             requests[i].status == RequestStatus.Accepted) {
    //             requestId = i;
    //             foundRequest = true;
    //             break;
    //         }
    //     }
    //     require(foundRequest, "Associated request not found");
    //     require(address(requests[requestId].escrowContract) != address(0), "Escrow contract not found");

    //     // Release the milestone payment from escrow
    //     requests[requestId].escrowContract.releaseMilestonePayment(milestonePercentage);

    //     // Emit event
    //     emit MilestoneAccepted(_projId, milestoneId, newRating);
    // }




    function rejectMilestoneReviewRequest(uint _reviewRequestId, string calldata _reason)  public {
        MilestoneReviewRequest storage reviewRequest = milestoneReviewRequests[_reviewRequestId];
        require(!reviewRequest.reviewed, "Review request already processed");
        reviewRequest.reviewed = true;

        uint _milestoneId = reviewRequest.milestoneId;
        address _freelancer = reviewRequest.freelancer;

        responseCount++;
        // request.escrowContract = new ReviewResponse{value: projectReward}(request.freelancer, employer);
        reviewResponses[responseCount] = ReviewResponse({
            id: responseCount,
            milestoneId: _milestoneId,
            freelancer: _freelancer,
            response: _reason,
            accepted: false
        });

        emit MilestoneReviewRequestRejected(_reviewRequestId, _reason);
    }

    function acceptRejectionReason(uint _reviewRequestId) public {
        // Fetch the request using the ID
        MilestoneReviewRequest storage reviewRequest = milestoneReviewRequests[_reviewRequestId];
        
        // Check if the request exists and if it is not already reviewed
        require(reviewRequest.freelancer == msg.sender, "Only the freelancer can accept the rejection reason");
        require(!reviewRequest.reviewed, "Review request already reviewed");

        // Accept the rejection reason and mark the request as reviewed
        reviewRequest.reviewed = true;

        // Emit an event for this action (optional)
        emit RejectionReasonAccepted(_reviewRequestId);
    }


    function addFile(
        uint _milestoneId, 
        string memory _name, 
        string memory _rid, 
        string memory _cid
    ) public {
        // Create a new File struct with a unique ID and add it to the milestoneFiles map
        File memory newFile = File({
            id: fileCount, // unique global ID for each file
            milestoneId: _milestoneId,
            name: _name,
            rid: _rid,
            cid: _cid
        });
        
        milestoneFiles[_milestoneId].push(newFile); // Add file to the array for the specific milestone
        fileCount++; // Increment the global file count
    }

    function viewAllFilesForMilestone(uint _milestoneId) 
        public 
        view 
        returns (
            uint[] memory ids,
            uint[] memory milestoneIds,
            string[] memory names,
            string[] memory rids,
            string[] memory cids
        ) 
    {
        uint count = fileCount; // Assuming 'fileCount' keeps track of the total files added

        // Initialize arrays based on the total file count for the specified milestone
        ids = new uint[](count);
        milestoneIds = new uint[](count);
        names = new string[](count);
        rids = new string[](count);
        cids = new string[](count);

        // Populate the arrays with file details for the given milestone
        uint index = 0;
        for (uint i = 0; i < count; i++) {
            if (milestoneFiles[_milestoneId][i].milestoneId == _milestoneId) {
                File storage file = milestoneFiles[_milestoneId][i];
                ids[index] = file.id;
                milestoneIds[index] = file.milestoneId;
                names[index] = file.name;
                rids[index] = file.rid;
                cids[index] = file.cid;
                index++;
            }
        }

        return (ids, milestoneIds, names, rids, cids);
    }

    // ===== NEW FUNCTIONS FOR ADDITIONAL FEATURES =====

    /**
     * Send a request draft from freelancer to employer (client)
     */
    /**
     * Quotation Functions
     */
    
    function proposeQuotation(uint _projectId, uint _proposedAmount, string memory _description) public {
        require(_projectId > 0 && _projectId <= projectsContract.projectCount(), "Invalid project ID");
        require(_proposedAmount > 0, "Amount must be greater than 0");
        require(bytes(_description).length > 0, "Description cannot be empty");
        
        uint requestId = projectToRequest[_projectId];
        require(requestId > 0, "No request exists for this project");
        
        (,,,, Projects.Status status, address employer, ) = projectsContract.getProject(_projectId);
        require(status == Projects.Status.Open, "Project is not open for quotations");
        
        Request storage request = requests[requestId];
        // Can be proposed by freelancer (requesting the project) or employer (counter-offer)
        require(msg.sender == request.freelancer || msg.sender == employer, "Only freelancer or employer can propose quotation");

        Quotation memory newQuotation = Quotation({
            projectId: _projectId,
            proposedBy: msg.sender,
            proposedAmount: _proposedAmount,
            description: _description,
            negotiationNotes: "",
            status: QuotationStatus.Proposed,
            timestamp: block.timestamp
        });

        quotations[_projectId].push(newQuotation);
        emit QuotationProposed(_projectId, msg.sender, _proposedAmount);
    }

    function counterPropose(uint _projectId, uint _newAmount, string memory _notes) public {
        require(_projectId > 0 && _projectId <= projectsContract.projectCount(), "Invalid project ID");
        require(_newAmount > 0, "Amount must be greater than 0");
        require(quotations[_projectId].length > 0, "No quotations exist for this project");
        
        uint requestId = projectToRequest[_projectId];
        require(requestId > 0, "No request exists for this project");
        
        (,,,, Projects.Status status, address employer, ) = projectsContract.getProject(_projectId);
        require(status == Projects.Status.Open, "Project is not open for negotiation");
        
        Request storage request = requests[requestId];
        Quotation[] storage projQuotations = quotations[_projectId];
        uint lastIdx = projQuotations.length - 1;
        Quotation storage lastQuotation = projQuotations[lastIdx];
        
        // Counter offer must come from the other party
        if (lastQuotation.proposedBy == request.freelancer) {
            require(msg.sender == employer, "Only employer can counter-offer on freelancer's proposal");
        } else {
            require(msg.sender == request.freelancer, "Only freelancer can counter-offer on employer's proposal");
        }
        
        lastQuotation.status = QuotationStatus.Negotiating;
        lastQuotation.proposedAmount = _newAmount;
        lastQuotation.negotiationNotes = _notes;
        
        emit QuotationCounterProposed(_projectId, msg.sender, _newAmount, _notes);
    }

    function acceptQuotation(uint _projectId, uint _quotationIndex) public payable {
        require(_projectId > 0 && _projectId <= projectsContract.projectCount(), "Invalid project ID");
        require(_quotationIndex < quotations[_projectId].length, "Invalid quotation index");
        
        uint requestId = projectToRequest[_projectId];
        require(requestId > 0, "No request exists for this project");
        
        (,,,, Projects.Status status, address employer, ) = projectsContract.getProject(_projectId);
        require(status == Projects.Status.Open, "Project is not open");
        require(msg.sender == employer, "Only employer can accept quotation");
        
        Request storage request = requests[requestId];
        Quotation storage quotation = quotations[_projectId][_quotationIndex];
        require(quotation.status == QuotationStatus.Proposed || quotation.status == QuotationStatus.Negotiating, "Quotation cannot be accepted");
        require(msg.value == quotation.proposedAmount, "Sent amount must match proposed amount");
        
        quotation.status = QuotationStatus.Accepted;
        
        // Create escrow with new amount
        Escrow escrow = new Escrow{value: quotation.proposedAmount}(request.freelancer, employer, address(this), quotation.proposedAmount);
        request.escrowContract = escrow;
        request.status = RequestStatus.Accepted;
        
        assignedFreelancer[_projectId] = request.freelancer;
        projectsContract.closeProject(_projectId);
        
        emit QuotationAccepted(_projectId, quotation.proposedAmount);
    }

    function rejectQuotation(uint _projectId, uint _quotationIndex) public {
        require(_projectId > 0 && _projectId <= projectsContract.projectCount(), "Invalid project ID");
        require(_quotationIndex < quotations[_projectId].length, "Invalid quotation index");
        
        (,,,, Projects.Status status, address employer, ) = projectsContract.getProject(_projectId);
        require(status == Projects.Status.Open, "Project is not open");
        require(msg.sender == employer, "Only employer can reject quotation");
        
        Quotation storage quotation = quotations[_projectId][_quotationIndex];
        quotation.status = QuotationStatus.Rejected;
        
        emit QuotationRejected(_projectId);
    }

    function getQuotations(uint _projectId) public view returns (Quotation[] memory) {
        return quotations[_projectId];
    }

    function getLatestQuotation(uint _projectId) public view returns (Quotation memory) {
        require(quotations[_projectId].length > 0, "No quotations for this project");
        return quotations[_projectId][quotations[_projectId].length - 1];
    }

    function isProjectAssigned(uint _projectId) public view returns (bool) {
        return assignedFreelancer[_projectId] != address(0);
    }
}


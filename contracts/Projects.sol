// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

contract Projects {
    
    enum Status { Closed, Open }

    enum MilestoneStatus { Pending, InProgress, Completed, Rejected }

    struct Project {
        uint id;
        string name;
        string description;
        uint reward;
        Status status;
        address employer;
        address assignedFreelancer;
    }

    struct Milestone {
        uint id;
        uint projectId;
        string name;
        string description;
        uint daycount;
        uint percentage;
        MilestoneStatus status;
        address freelancer;
        address client;
        uint amount;
        string proofFileHash;
    }

    mapping(uint => Project) public projects;
    mapping(uint => Milestone[]) public milestones;

    uint public projectCount;
    uint public milestoneCount;

    event ProjectAdded(uint id, string name, address employer);
    event MilestoneAdded(uint projectId, uint milestoneId, string name, uint percentage);

    function addProject(string memory _name, string memory _description, uint _reward) public {
        projectCount++;
        projects[projectCount] = Project({
            id: projectCount,
            name: _name,
            description: _description,
            reward: _reward,
            status: Status.Open,
            employer: msg.sender,
            assignedFreelancer: address(0)
        });

        emit ProjectAdded(projectCount, _name, msg.sender);
    }

    function addMilestone(uint _projectId, string memory _name, string memory _description, uint _daycount, uint _percentage) public {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");
        require(msg.sender == projects[_projectId].employer, "Only the employer can add milestones");
        require(_percentage > 0 && _percentage <= 100, "Invalid percentage");

        milestoneCount++;
        milestones[_projectId].push(Milestone({
            id: milestoneCount,
            projectId: _projectId,
            name: _name,
            description: _description,
            daycount: _daycount,
            percentage: _percentage,
            status: MilestoneStatus.Pending,
            freelancer: address(0),
            client: projects[_projectId].employer,
            amount: 0,
            proofFileHash: ""
        }));

        emit MilestoneAdded(_projectId, milestoneCount, _name, _percentage);
    }

    function getProject(uint _id) public view returns (uint, string memory, string memory, uint, Status, address, address) {
        require(_id > 0 && _id <= projectCount, "Project does not exist");
        Project memory proj = projects[_id];
        return (proj.id, proj.name, proj.description, proj.reward, proj.status, proj.employer, proj.assignedFreelancer);
    }

    function viewProjects() public view returns (
        uint[] memory ids, 
        string[] memory names, 
        string[] memory descriptions, 
        uint[] memory rewards, 
        Status[] memory statuses, 
        address[] memory employers,
        address[] memory assignedFreelancers
    ) {
        ids = new uint[](projectCount);
        names = new string[](projectCount);
        descriptions = new string[](projectCount);
        rewards = new uint[](projectCount);
        statuses = new Status[](projectCount);
        employers = new address[](projectCount);
        assignedFreelancers = new address[](projectCount);

        for (uint i = 1; i <= projectCount; i++) {
            Project storage proj = projects[i];
            ids[i - 1] = proj.id;
            names[i - 1] = proj.name;
            descriptions[i - 1] = proj.description;
            rewards[i - 1] = proj.reward;
            statuses[i - 1] = proj.status;
            employers[i - 1] = proj.employer;
            assignedFreelancers[i - 1] = proj.assignedFreelancer;
        }

        return (ids, names, descriptions, rewards, statuses, employers, assignedFreelancers);
    }

    function viewOpenProjects() public view returns (
        uint[] memory ids, 
        string[] memory names, 
        string[] memory descriptions, 
        uint[] memory rewards, 
        Status[] memory statuses, 
        address[] memory employers,
        address[] memory assignedFreelancers
    ) {
        uint openCount = 0;
        for (uint i = 1; i <= projectCount; i++) {
            if (projects[i].status == Status.Open) {
                openCount++;
            }
        }

        ids = new uint[](openCount);
        names = new string[](openCount);
        descriptions = new string[](openCount);
        rewards = new uint[](openCount);
        statuses = new Status[](openCount);
        employers = new address[](openCount);
        assignedFreelancers = new address[](openCount);

        uint index = 0;
        for (uint i = 1; i <= projectCount; i++) {
            if (projects[i].status == Status.Open) {
                Project storage proj = projects[i];
                ids[index] = proj.id;
                names[index] = proj.name;
                descriptions[index] = proj.description;
                rewards[index] = proj.reward;
                statuses[index] = proj.status;
                employers[index] = proj.employer;
                assignedFreelancers[index] = proj.assignedFreelancer;
                index++;
            }
        }

        return (ids, names, descriptions, rewards, statuses, employers, assignedFreelancers);
    }

function getMilestones(uint _projectId) public view returns (
    uint[] memory ids,
    uint[] memory projectIds,
    string[] memory names,
    string[] memory descriptions,
    uint[] memory daycounts,
    uint[] memory percentages,
    MilestoneStatus[] memory statuses,
    address[] memory freelancers,
    address[] memory clients,
    uint[] memory amounts,
    string[] memory proofFileHashes
) {
    require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");
    uint milestoneLength = milestones[_projectId].length;

    ids = new uint[](milestoneLength);
    projectIds = new uint[](milestoneLength);
    names = new string[](milestoneLength);
    descriptions = new string[](milestoneLength);
    daycounts = new uint[](milestoneLength);
    percentages = new uint[](milestoneLength);
    statuses = new MilestoneStatus[](milestoneLength);
    freelancers = new address[](milestoneLength);
    clients = new address[](milestoneLength);
    amounts = new uint[](milestoneLength);
    proofFileHashes = new string[](milestoneLength);

    for (uint i = 0; i < milestoneLength; i++) {
        Milestone storage milestone = milestones[_projectId][i];
        ids[i] = milestone.id;
        projectIds[i] = _projectId;
        names[i] = milestone.name;
        descriptions[i] = milestone.description;
        daycounts[i] = milestone.daycount;
        percentages[i] = milestone.percentage;
        statuses[i] = milestone.status;
        freelancers[i] = milestone.freelancer;
        clients[i] = milestone.client;
        amounts[i] = milestone.amount;
        proofFileHashes[i] = milestone.proofFileHash;
    }
}


    function closeProject(uint _id) public {
        require(_id > 0 && _id <= projectCount, "Project does not exist");
        Project storage proj = projects[_id];
        require(msg.sender == proj.employer, "Only the employer can close this project");
        proj.status = Status.Closed;
    }

    function completeMilestone(uint _projectId, uint _milestoneId) public {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");
        require(msg.sender == projects[_projectId].employer, "Only the employer can mark milestones as completed");

        Milestone[] storage projectMilestones = milestones[_projectId];
        bool found = false;

        for (uint i = 0; i < projectMilestones.length; i++) {
            if (projectMilestones[i].id == _milestoneId) {
                projectMilestones[i].status = MilestoneStatus.Completed;
                found = true;
                break;
            }
        }

        require(found, "Milestone does not exist in this project");
    }
}

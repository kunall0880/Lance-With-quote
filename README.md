# **Freelance: A decentralised freelancing platform**

We have tried to make a **blockchain-based decentralised web application (DApp)** that allows freelancers and recruiters (clients) to connect on projects with built-in escrow. The recruiter (client) can put their project ideas and set the guidelines for the same. The freelancer can browse through the available projects on the platform and apply for the ones they are interested in. The freelancer will have to upload their files as a proof of work for each milestone that is set by the client.

# Freelance: A Decentralised Freelancing Platform

This is a blockchain-based decentralised DApp that connects freelancers and clients with
built-in escrow, automated ratings, and decentralized arbitration.

 
The existing platforms don't have an **automated rating system**. Our platform automates the rating system so as to **prevent ratings being abused by malicious actors**.
There also does not exist a comprehensive solution which automates the entire workflow and integrates it with **decentralized arbitration** as we have done. 
The files are also uploaded on **IPFS** making them available as an **immutable proof** for the arbitrators. We have also **automated the payment of funds** after acceptance of proof of work for each milestone via **escrow contracts**.

## Implementation details

This repository contains a complete local DApp workflow:

- **React frontend** with a login page, role selection, client dashboard, and freelancer dashboard.
- **MetaMask wallet integration** for account selection and role-based navigation.
- **Project posting and milestone management** for clients, including reward split and approval flow.
- **Freelancer quotation requests and milestone submissions** with proof upload support.
- **Escrow-style contract interactions** managed by Ethereum smart contracts and local Ganache deployment.
- **File upload backend** in `server/index.js` using Express, Multer, and AWS SDK for 4everland/IPFS-compatible storage.
- **Contract artifacts** in `src/contracts/` used by the frontend to connect to deployed smart contracts.
- **Truffle deployment** inside `truffle_project/` for local and optional Sepolia networks.

## Workflow:

- Our website begins with asking the user to login/sign up as a client or freelancer.
  
### Client Side:
- The client dashboard displays details about the client's **Etherium (MetaMask)** account. The client can either add or view projects. For adding a project, the client must fix the reward amount.
- Client can then split up the work of each project into different milestones. Each milestone specifies the percentage of reward to be transacted upon completion of that milestone by the freelancer.
- The client can also view all the pending requests that the freelancers might have sent and can either decline or accept. The request contains important details like the freelancers address and rating.
- If accepted, a new **escrow account** is created, and the total reward is transferred from the client's account to the escrow account. All the future milestone payments are done from this escrow account.

### Freelancer Side:
- The freelancer can view all the projects that are available. Each project contains the necessary details, along with the option of applying for the project and viewing the milestones. Once accepted, the freelancer can start uploading the necessary files as proof for each milestone. Each file is stored on **IPFS** through a **dedicated gateway** (QuickNode Service), and a **CID (Content Identifier)** is generated for the same.
  
- The client views the proof files submitted by the freelancer for a particular milestone. If the client accepts the submission, the rating of the freelancer will get incremented, and the reward allotted for this milestone will be credited to the freelancer's account. If the client rejects the submission, the freelancer can either accept the rejection and work on it again (rating of freelancer decreases) or call for an **arbitration service (through Kleros)**.

The web application works smoothly on localhost (utilizing Ganache Etherum accounts). The contracts have also been deployed on Sepolia public testnet, through an Etherum RPC Endpoint. 


## Features

1. **Client Project Posting**: Clients can create project requests with:
   - Project name and description
   - Payment amount
   - Milestones and payments for each milestone

2. **Freelancer File Submission**: Freelancers view available projects, select one to work on, and submit files at each milestone.

3. **Automated Payment and Rating System**: 
   - **Case 1**: If the client accepts the submitted files, payment is released automatically, and ratings are updated.
   - **Case 2**: If the client accepts with delayed milestones, the payment is reduced, and the freelancer's rating decreases slightly.
   - **Case 3**: If the client rejects the submission, the freelancer has the option to either revise the files or raise a dispute.
       - **Subcase 1**: Freelancer agrees to revise the work and resubmits.
       - **Subcase 2**: Freelancer raises a dispute; Kleros appoints an anonymous arbitrator to resolve the issue, determining the fund distribution.

4. **Dispute Resolution via Kleros**: When disputes arise, the Kleros arbitration system ensures fair decision-making.

5. **Rating System**: Ratings are calculated as a weighted average of all transaction outcomes, considering factors like transaction success or delay.

## Technology Stack

- **Ethereum (Sepolia test network)**: Smart contract deployment
- **Kleros**: Decentralized arbitration for disputes
- **IPFS**: Decentralized file storage
- **React**: Frontend for the user interface
- **Ethers.js**: Interact with the Ethereum network and contracts

## Prerequisites

To run this project, ensure you have the following installed:
- **Node.js** and **npm**: Download from [Node.js Official Website](https://nodejs.org/).
- **MetaMask**: Browser wallet for Ethereum interaction.
- **QuickNode Account**: Ethereum and IPFS provider, available at [QuickNode](https://www.quicknode.com/).
- **Ganache Account**: App for test accounts and network.

## Quick Start Guide (5 Minutes)

If you want to **get the app running immediately**, follow these steps:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Ganache** (Terminal 1):
   ```bash
   npm run ganache
   ```
   This runs a local blockchain at `http://127.0.0.1:7545` with 10 test accounts.

3. **Deploy contracts** (Terminal 2):
   ```bash
   npm run migrate:dev
   ```
   This automatically copies contract artifacts to `src/contracts/` (required for the app to work).

4. **Configure MetaMask**:
   - Add Network: `Ganache` with RPC `http://127.0.0.1:7545`, Chain ID `1337`
   - Import a test account using its private key from Ganache

5. **Run the app** (Terminal 3):
   ```bash
   npm start
   ```
   Opens at `http://localhost:3000`

6. **Test it**:
   - Sign in as **Client** or **Freelancer**
   - Create projects, submit work, and test the escrow system
   - Check browser console if you see any errors

**Troubleshooting:** If contracts aren't found, ensure:
- MetaMask is on Ganache network (Chain ID 1337)
- Artifacts were copied to `src/contracts/`
- Reload the browser after contract deployment

---

## Installation and Setup

### Quick Start (Ganache Local Development)

1. **Clone & Install**:
   ```bash
   git clone https://github.com/kunall0880/Freelance-.git
   cd Freelance
   npm install
   ```

2. **Start Ganache** (Terminal 1):
   ```bash
   npm run ganache
   ```
   Runs a local blockchain at `127.0.0.1:7545` with 10 test accounts (100 ETH each).

3. **Deploy Smart Contracts** (Terminal 2):
   ```bash
   cd truffle_project
   truffle migrate --network development --reset
   ```
   Output shows:
   ```
   Deploying 'Projects'
      ... deployed at 0x560f7702093C56280F06AA56d0C7E1034DD6BfE9
   Deploying 'RequestManager'
      ... deployed at 0x1FB4b1457279A7181cEd5B90B1AF11046008ACdE
   ```

4. **⚠️ CRITICAL: Copy Contract Artifacts After Every Deploy**
   
   The React app **must** use fresh compiled ABIs. Run from `Freelance` root:
   
   **After `npm run migrate:dev`, the artifact copy step runs automatically.**
   
   If you want to run it manually, use:
   
   ```powershell
   npm run copy-artifacts
   ```
   
   Or manually:
   ```powershell
   Copy-Item "truffle_project\build\contracts\Projects.json" "src\contracts\Projects.json" -Force
   Copy-Item "truffle_project\build\contracts\RequestManager.json" "src\contracts\RequestManager.json" -Force
   ```
   
   **macOS/Linux:**
   ```bash
   cp truffle_project/build/contracts/Projects.json src/contracts/
   cp truffle_project/build/contracts/RequestManager.json src/contracts/
   ```
   
   **⚠️ Without this step, you'll see: `AbiError: Parameter decoding error...`**

5. **Configure MetaMask for Ganache**:
   - Click MetaMask → Network Selector → **Add Network**.
   - Fill in:
     ```
     Network name: Ganache
     RPC URL: http://127.0.0.1:7545
     Chain ID: 1337
     Currency: ETH
     ```
   - Save and switch to Ganache.
   - Import a test account: MetaMask → **Add Account** → **Import** → paste private key from Ganache.

6. **Install MetaMask**:
   Download from [MetaMask website](https://metamask.io/).

6. **Configure MetaMask**

   - Open MetaMask and click the network selector at the top.
   - Choose **Add network** → **Add a custom network**.
   - Fill in the values:
     - Network name: `Ganache`
     - RPC URL: `http://127.0.0.1:7545`
     - Chain ID: `1337` (check your Ganache output if different)
     - Currency symbol: `ETH`
   - Save and **select Ganache** as the active network.
   - Import one of the accounts listed in Ganache using its private key.

   **Important:** if MetaMask is pointed at any other network (e.g. Sepolia or
   Base), the app will prompt for gas and fail to locate the contracts. Always
   switch to the Ganache network while developing locally.

7. **Run the Frontend**

   Install dependencies and start React (from `Freelance` root):

   ```bash
   npm install
   npm start
   ```

   The app will open at `http://localhost:3000`. Connect MetaMask when
   prompted; the network ID and contract addresses are logged to the browser
   console for debugging.

8. **Test the DApp**

   - Sign in as **Client** or **Freelancer**.
   - Use the client UI to create projects and add milestones.
   - Transactions execute instantly on Ganache with no gas cost.
   - If you don't see your projects, check that:
     1. MetaMask is on Ganache (chain ID 1337).
     2. Contract artifacts were copied to `src/contracts/`.
     3. Browser console shows no ABI errors.

---

## Deployment on Sepolia Testnet

For public testnet deployment (optional):

1. **Fund Your Account**:
   Visit [sepoliafaucet.com](https://sepoliafaucet.com/) and claim Sepolia ETH.

2. **Update `.env`**:
   ```env
   MNEMONIC="your twelve-word phrase"
   SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
   ```

3. **Deploy to Sepolia**:
   ```bash
   cd truffle_project
   truffle migrate --network sepolia --reset
   ```

4. **Copy Artifacts** (same as Ganache step 4):
   ```powershell
   npm run copy-artifacts
   ```
   
   Or manually:
   ```powershell
   Copy-Item "truffle_project\build\contracts\Projects.json" "..\src\contracts\Projects.json" -Force
   Copy-Item "truffle_project\build\contracts\RequestManager.json" "..\src\contracts\RequestManager.json" -Force
   ```

5. **Add Sepolia to MetaMask**:
   - Network name: `Sepolia`
   - RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
   - Chain ID: `11155111`
   - Currency: `ETH`

6. **Run the app** and test on Sepolia.

---

## Additional Scripts

The `package.json` in the root of `Freelance` includes a few helpful commands:

```json
{
  "scripts": {
    "ganache": "ganache -p 7545",
    "migrate:dev": "truffle migrate --network development --reset",
    "test:dev": "truffle test --network development"
  }
}
```

Use `npm run ganache` to launch the local chain, `npm run migrate:dev` to
redeploy and `npm run test:dev` to execute the Solidity test suite locally.

## Environment Variables

The project uses a `.env` file (Gitignored) to store sensitive values. For
local development you only need an optional mnemonic. Two variables can
override contract addresses when connecting to other networks:

```env
REACT_APP_PROJECTS_CONTRACT_ADDRESS=0x...
REACT_APP_REQUEST_MANAGER_ADDRESS=0x...
```

These are read by `src/services/web3.js` and take precedence over the artifact
lookup.

## Troubleshooting

### ✅ Current Status - What's Working on Ganache

After deployment, the following features work on your local Ganache network:

| Feature | Status | Notes |
|---------|--------|-------|
| **App Launch** | ✅ | No AbiError, app loads cleanly |
| **Projects Contract** | ✅ | Deployed at address in `.env` |
| **View All Projects** | ✅ | Freelancers can browse available projects |
| **Create Projects** | ✅ | Clients can post new projects with milestones |
| **Freelancer Profiles** | ✅ | View freelancer ratings and details |
| **Quotation System** | ❌ | RequestManager not deployed on Ganache |
| **Dispute Resolution** | ❌ | RequestManager not deployed on Ganache |
| **Auto-payment via Escrow** | ⚠️ | Projects contract ready; full escrow requires RequestManager |

---

- **"AbiError: Parameter decoding error" or projects/milestones not loading**
  - **Cause:** Stale or mismatched contract artifacts in `src/contracts/`.
  - **Fix:** 
    1. Re-run migrations: `truffle migrate --network development --reset`
    2. **Copy fresh artifacts** (see step 4 above)
    3. Reload the browser (`F5`)

- **Contracts not found / "Unable to determine Projects contract address"**
  - Ensure MetaMask is on the correct network:
    - **Ganache:** Chain ID 1337, RPC `http://127.0.0.1:7545`
    - **Sepolia:** Chain ID 11155111
  - If switched, reload the page.
  - Check browser console for network logs.

- **MetaMask prompts for gas but transaction fails**
  - MetaMask is connected to the wrong network. Switch to Ganache or Sepolia.
  - Verify chain ID in the MetaMask network settings.

- **Projects created but can't view them**
  - Confirm MetaMask account matches the one used to create projects.
  - Open browser console and look for any `Error fetching user projects` messages.
  - Verify contract artifacts were copied after the latest deployment.
    Ganache.
  - Confirm the JSON artifact you copied contains the `networks` block with
    the correct chain ID and address. Redeploy and recopy if necessary.
  - Check the browser console for the log messages added by `getDeployedAddress`.

- **RequestManager features unavailable (quotations, disputes, requests) on Ganache**
  - **Cause:** RequestManager contract bytecode (27,626 bytes) exceeds Ganache's 24KB hard limit (24,576 bytes).
  - **Current Status:** 
    - ✅ **Projects.sol deployed successfully** and working on Ganache
    - ❌ **RequestManager.sol cannot deploy** on Ganache (bytecode too large)
  - **Frontend Behavior:** The app gracefully handles the missing RequestManager with a helpful error message.
  - **What You Can Do Now on Ganache (Projects Contract Only):**
    - ✅ Client can post projects with milestones and rewards
    - ✅ Freelancer can view all available projects
    - ✅ View freelancer profiles and ratings
    - ✅ Test project creation and milestone setup
    - ❌ Freelancer cannot propose quotations (needs RequestManager)
    - ❌ Cannot resolve disputes (needs RequestManager)
    - ❌ Cannot use the full escrow + quotation workflow
  - **Error Message:** When freelancers try to propose a quotation, they'll see:
    ```
    "RequestManager contract is not deployed on this network. The quotation system 
     requires RequestManager to be deployed. Please deploy RequestManager to a testnet 
     like Sepolia or Mainnet where the 24KB bytecode limit does not apply."
    ```
  - **Solutions:**
    1. **For full testing:** Deploy to **Sepolia testnet** instead (supports large contracts)
       - Update `truffle-config.js` with Sepolia RPC details
       - Run: `truffle migrate --network sepolia --reset`
       - Update `.env` with Sepolia contract addresses
    2. **For Ganache-only development:** Use the Projects-only workflow (current state)
       - Test client project posting and freelancer browsing
       - Good for UI/UX testing
    3. **For production:** Consider splitting RequestManager into multiple smaller contracts using proxy patterns

- **Ganache CLI not recognized**
  - Use `npm install` inside `Freelance` to add `ganache` binary. The script
    `npm run ganache` should then work.
  - You can also install `ganache` globally: `npm install -g ganache`.

- **Chain ID mismatch (5777 vs 1337)**
  - Update `truffle-config.js` to match the `chainId` reported by Ganache, or
    run Ganache with `--chainId 1337`.

- **MetaMask refuses transaction from localhost**
  - Make sure the request origin (`http://localhost:3000`) is allowed in
    MetaMask settings under "Connected sites" and you have unlocked the
    imported account.

## Deploying to a Testnet or Mainnet

When you're ready to move off Ganache, configure a network entry in
`truffle-config.js` with an HDWallet provider and appropriate RPC URL. Set the
environment variables `MNEMONIC` and, for example, `SEPOLIA_RPC_URL` or
`INFURA_API_KEY`. The frontend will then pick up addresses via the artifacts
(or env overrides if provided).

---

## Gitignore

The project already includes a `.gitignore` file to keep sensitive or
machine-specific files out of version control. Here's a sample you can
reference or extend:

```
# React build output
/node_modules/
/build/
/dist/

# local env files
.env

# Truffle build artifacts (optional if you copy to src/contracts)
/truffle_project/build/contracts/

# IDE/editor directories
.vscode/
.idea/

# log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db
```

Make sure your own `.env` never gets committed; it contains your mnemonic
and RPC URLs. You can add additional entries such as `*.secret` or other
private data.

## Links

- [Truffle documentation](https://www.truffleframework.com/docs/)
- [Ganache CLI](https://www.trufflesuite.com/ganache)
- [MetaMask custom RPC guide](https://metamask.io/faqs/#c6)

## References

This project is based on the original
[Freelance](https://github.com/kunall0880/Freelance-) repository by @kunall0880.
The current setup focuses on **local development with Ganache** to avoid testnet
gas fees and enable rapid iteration.

**Key Changes for Local Development:**
- Dynamic contract address resolution from build artifacts
- Ganache network configuration (chain ID 1337)
- Automated npm scripts for `ganache`, `migrate:dev`, and `test:dev`
- Enhanced troubleshooting and MetaMask setup guidance

For the complete feature set and original design, see the
[original repository](https://github.com/kunall0880/Freelance-).

Happy hacking! Feel free to file issues or pull requests in this repo if you
want to refine the setup or add automation.  

## Running the Application

### 🎯 Quick Summary - What's Ready Now

Your **Projects contract is deployed and working on Ganache**! You can now:

✅ **Create projects** as a client with custom milestones and rewards  
✅ **Browse projects** as a freelancer  
✅ **View freelancer profiles** and ratings  
✅ **Test the UI/UX** for the marketplace functionality  

⚠️ **RequestManager features are not available on Ganache** (quotations, disputes) due to bytecode size limits. See [Troubleshooting](#troubleshooting) for details and alternatives.

---

### Prerequisites are Met - Now Start the App

After following the **Quick Start Guide** above, your app should be running. If not, verify:

1. **All terminals are running**:
   - Terminal 1: Ganache (`npm run ganache`)
   - Terminal 2: Contracts deployed (`npm run migrate:dev`)
   - Terminal 3: React app (`npm start`)

2. **MetaMask is configured**:
   - Connected to Ganache (Chain ID 1337)
   - RPC URL: `http://127.0.0.1:7545`
   - At least one test account imported

3. **Visit the app**:
   ```
   http://localhost:3000
   ```

4. **Login and start**:
   - Connect MetaMask when prompted
   - Choose role (Client or Freelancer)
   - Browse or post projects
   - Escrow transactions execute instantly on Ganache (no gas fees)

### If You See Errors

**"AbiError: Parameter decoding error" or contracts not found**:
- Run: `npm run copy-artifacts`
- Reload the browser (`F5`)
- Check browser console for network logs

**MetaMask won't connect**:
- Switch to Ganache network
- Verify Chain ID is 1337
- Reload the page

**"ganache: command not found"**:
- Run: `npm install` (from project root)
- Or: `npm install -g ganache`


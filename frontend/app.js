// DEMO MODE STATE
let isDemoMode = false;
let demoProfile = {
    name: "Demo User",
    bio: "This is a local demo profile for testing UI."
};

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const contractIdInput = document.getElementById('contractId');
const connectionStatus = document.getElementById('connectionStatus');
const mainAppContent = document.getElementById('mainAppContent');

const profileForm = document.getElementById('profileForm');
const nameInput = document.getElementById('nameInput');
const bioInput = document.getElementById('bioInput');
const saveBtn = document.getElementById('saveBtn');
const saveLoader = document.getElementById('saveLoader');
const saveStatus = document.getElementById('saveStatus');

const displayName = document.getElementById('displayName');
const displayBio = document.getElementById('displayBio'); // Fixed typo from DisplayBio
const avatarInitials = document.getElementById('avatarInitials');
const refreshBtn = document.getElementById('refreshBtn');
const refreshLoader = document.getElementById('refreshLoader');

const searchAppContent = document.getElementById('searchAppContent');
const searchAddressInput = document.getElementById('searchAddressInput');
const searchBtn = document.getElementById('searchBtn');
const searchResult = document.getElementById('searchResult');
const searchAvatar = document.getElementById('searchAvatar');
const searchDisplayName = document.getElementById('searchDisplayName');
const searchDisplayBio = document.getElementById('searchDisplayBio');
const searchStatus = document.getElementById('searchStatus');

let contractId = '';
let userAddress = '';

// Stellar Settings
let server;
let networkPassphrase;

// Initialize Stellar RPC
function initStellar() {
    server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
    networkPassphrase = StellarSdk.Networks.TESTNET;
}

// Connect to contract & Wallet
connectBtn.addEventListener('click', async () => {
    contractId = contractIdInput.value.trim();

    if (!contractId) {
        showStatus(connectionStatus, 'Please enter a Contract ID.', 'error');
        return;
    }

    if (contractId.toLowerCase() === 'demo') {
        isDemoMode = true;
        userAddress = 'DEMO_WALLET_ADDR';
        showStatus(connectionStatus, 'Connected in DEMO mode.', 'success');
        
        setTimeout(() => {
            document.querySelector('.setup-section').classList.add('hidden');
            mainAppContent.classList.remove('hidden');
            searchAppContent.classList.remove('hidden');
            fetchProfile();
        }, 1000);
        return;
    }

    // REAL CONTRACT FLOW
    isDemoMode = false;
    initStellar();

    connectBtn.disabled = true;
    showStatus(connectionStatus, 'Connecting to Freighter...', '');

    try {
        if (!window.freighterApi) {
            throw new Error("Freighter wallet not found!");
        }

        const isConnected = await window.freighterApi.isConnected();
        if (!isConnected) {
            throw new Error("Please install and unlock Freighter!");
        }

        const isAllowed = await window.freighterApi.isAllowed();
        if (!isAllowed) {
            await window.freighterApi.setAllowed();
        }

        userAddress = await window.freighterApi.getPublicKey();
        
        showStatus(connectionStatus, `Connected Wallet: ${userAddress.substring(0,6)}...${userAddress.slice(-4)}`, 'success');
        
        setTimeout(() => {
            document.querySelector('.setup-section').classList.add('hidden');
            mainAppContent.classList.remove('hidden');
            searchAppContent.classList.remove('hidden');
            fetchProfile();
        }, 1500);

    } catch (err) {
        showStatus(connectionStatus, err.message || "Failed to connect wallet", 'error');
        connectBtn.disabled = false;
    }
});

// Update Profile
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const bio = bioInput.value.trim();

    if (!name || !bio) return;

    saveBtn.disabled = true;
    saveLoader.classList.remove('hidden');
    showStatus(saveStatus, 'Saving to blockchain...', '');

    if (isDemoMode) {
        setTimeout(() => {
            demoProfile.name = name;
            demoProfile.bio = bio;
            
            saveBtn.disabled = false;
            saveLoader.classList.add('hidden');
            showStatus(saveStatus, 'Profile saved successfully!', 'success');
            
            nameInput.value = '';
            bioInput.value = '';
            fetchProfile();
        }, 1500);
        return;
    }

    // REAL BLOCKCHAIN SAVE
    try {
        const contract = new StellarSdk.Contract(contractId);
        
        // Fetch sequence number
        const account = await server.getAccount(userAddress);
        
        // Prepare arguments
        const args = [
            StellarSdk.nativeToScVal(userAddress, { type: "address" }),
            StellarSdk.nativeToScVal(name, { type: "string" }),
            StellarSdk.nativeToScVal(bio, { type: "string" })
        ];

        // Build base transaction
        const tx = new StellarSdk.TransactionBuilder(account, { fee: "100", networkPassphrase })
            .addOperation(contract.call("set_profile", ...args))
            .setTimeout(30)
            .build();

        showStatus(saveStatus, 'Simulating transaction...', '');
        
        // Simulate to get cost & auth
        const simRes = await server.simulateTransaction(tx);
        
        if (StellarSdk.rpc.Api.isSimulationError(simRes)) {
            throw new Error("Simulation failed. Check contract ID and network.");
        }

        // Assemble with simulation data
        const assembledTx = StellarSdk.assembleTransaction(tx, simRes).build();
        
        showStatus(saveStatus, 'Please sign transaction in Freighter...', '');

        // Sign
        const signedXdr = await window.freighterApi.signTransaction(assembledTx.toXDR(), "TESTNET");
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

        showStatus(saveStatus, 'Submitting to network...', '');

        // Submit
        const sendRes = await server.sendTransaction(signedTx);
        if (sendRes.status === "PENDING") {
            // Poll for completion
            let getTxRes = await server.getTransaction(sendRes.hash);
            let attempts = 0;
            while (getTxRes.status === "NOT_FOUND" && attempts < 10) {
                await new Promise(r => setTimeout(r, 2000));
                getTxRes = await server.getTransaction(sendRes.hash);
                attempts++;
            }
            if (getTxRes.status === "SUCCESS") {
                showStatus(saveStatus, 'Profile saved to blockchain!', 'success');
                nameInput.value = '';
                bioInput.value = '';
                fetchProfile();
            } else {
                throw new Error("Transaction failed on network.");
            }
        } else {
            throw new Error("Failed to submit transaction.");
        }

    } catch (err) {
        showStatus(saveStatus, err.message || "Failed to save profile", 'error');
        console.error(err);
    } finally {
        saveBtn.disabled = false;
        saveLoader.classList.add('hidden');
    }
});

// Fetch Profile
refreshBtn.addEventListener('click', fetchProfile);

async function fetchProfile() {
    refreshBtn.disabled = true;
    refreshLoader.classList.remove('hidden');
    
    if (isDemoMode) {
        setTimeout(() => {
            updateUI(demoProfile.name, demoProfile.bio);
            refreshBtn.disabled = false;
            refreshLoader.classList.add('hidden');
        }, 800);
        return;
    }

    // REAL BLOCKCHAIN FETCH
    try {
        const contract = new StellarSdk.Contract(contractId);
        
        // Construct args
        const args = [
            StellarSdk.nativeToScVal(userAddress, { type: "address" })
        ];

        // Read-only calls don't strictly need a valid sequence number for simulation
        const account = new StellarSdk.Account(userAddress, "0");
        
        const tx = new StellarSdk.TransactionBuilder(account, { fee: "100", networkPassphrase })
            .addOperation(contract.call("get_profile", ...args))
            .setTimeout(30)
            .build();

        const simRes = await server.simulateTransaction(tx);
        
        if (StellarSdk.rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
            // Returns Tuple (String, String) -> parsing natively into an array
            const nativeTuple = StellarSdk.scValToNative(simRes.result.retval);
            if (Array.isArray(nativeTuple) && nativeTuple.length === 2) {
                updateUI(nativeTuple[0], nativeTuple[1]);
            } else {
                updateUI("Unknown", "Profile format unexpected.");
            }
        } else {
            updateUI("Unknown", "No profile found or error.");
        }
    } catch (err) {
        console.error(err);
        updateUI("Error", "Could not fetch profile.");
    } finally {
        refreshBtn.disabled = false;
        refreshLoader.classList.add('hidden');
    }
}

function updateUI(name, bio) {
    document.getElementById('displayName').textContent = name;
    
    // Fix: App originally had displaying logic for 'DisplayBio' which was fixed to displayBio
    const bioEl = document.getElementById('displayBio');
    if(bioEl) bioEl.textContent = bio;
    else document.getElementById('DisplayBio').textContent = bio; // Fallback to old ID if not updated
    
    if (name && name !== "Unknown" && name !== "Error") {
        avatarInitials.textContent = name.substring(0, 2).toUpperCase();
    } else {
        avatarInitials.textContent = "?";
    }
}

// Search Profile
searchBtn.addEventListener('click', async () => {
    const targetAddress = searchAddressInput.value.trim();
    if (!targetAddress) return;

    searchBtn.disabled = true;
    showStatus(searchStatus, 'Searching blockchain...', '');
    searchResult.classList.add('hidden');

    if (isDemoMode) {
        setTimeout(() => {
            if (targetAddress.toLowerCase() === 'demo') {
                updateSearchUI(demoProfile.name, demoProfile.bio);
            } else {
                updateSearchUI("Not Found", "No profile exists for this address in demo mode.");
            }
            searchBtn.disabled = false;
        }, 800);
        return;
    }

    try {
        const contract = new StellarSdk.Contract(contractId);
        
        // Construct args
        const args = [
            StellarSdk.nativeToScVal(targetAddress, { type: "address" })
        ];

        // Valid Stellar Account formatting fallback for parsing error-free
        let accountObj;
        try {
            accountObj = new StellarSdk.Account(targetAddress, "0");
        } catch(e) {
            throw new Error("Invalid format for Stellar Address (G...)");
        }

        const tx = new StellarSdk.TransactionBuilder(accountObj, { fee: "100", networkPassphrase })
            .addOperation(contract.call("get_profile", ...args))
            .setTimeout(30)
            .build();

        const simRes = await server.simulateTransaction(tx);
        
        if (StellarSdk.rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
            const nativeTuple = StellarSdk.scValToNative(simRes.result.retval);
            if (Array.isArray(nativeTuple) && nativeTuple.length === 2) {
                updateSearchUI(nativeTuple[0], nativeTuple[1]);
            } else {
                updateSearchUI("Unknown", "Profile format unexpected.");
            }
        } else {
            updateSearchUI("Not Found", "No profile data available for this address.");
        }
    } catch (err) {
        console.error(err);
        updateSearchUI("Error", err.message || "Invalid address or network error.");
    } finally {
        searchBtn.disabled = false;
    }
});

function updateSearchUI(name, bio) {
    searchResult.classList.remove('hidden');
    searchDisplayName.textContent = name;
    searchDisplayBio.textContent = bio;
    
    if (name && name !== "Unknown" && name !== "Error" && name !== "Not Found") {
        searchAvatar.textContent = name.substring(0, 2).toUpperCase();
    } else {
        searchAvatar.textContent = "?";
    }
    showStatus(searchStatus, '', '');
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status-message';
    if (type) {
        element.classList.add(type);
    }
    
    // Clear success messages after 4 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = '';
                element.className = 'status-message';
            }
        }, 4000);
    }
}

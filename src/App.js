import { AppConfig, UserSession, AuthDetails, showConnect, openSTXTransfer } from "@stacks/connect";
import { useState, useEffect } from "react";
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { makeSTXTokenTransfer } from '@stacks/transactions';

function App() {
    const [message, setMessage] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [currentMessage, setCurrentMessage] = useState("");
    const [userData, setUserData] = useState(undefined);
    const [walletAddress, setWalletAddress] = useState("");

    const appConfig = new AppConfig(["store_write"]);
    const userSession = new UserSession({ appConfig });

    const appDetails = {
        name: "ChainVerifier",
        icon: window.location.origin + '/favicon.ico'
    };

    const connectWallet = () => {
        showConnect({ appDetails, onFinish: () => window.location.reload(), userSession, });
    };

    useEffect(() => {
        if (userSession.isSignInPending()) {
            userSession.handlePendingSignIn().then((userData) => {
                setUserData(userData);
            });
        } else if (userSession.isUserSignedIn()) {
            const userData = userSession.loadUserData();
            setUserData(userData);
            setWalletAddress(userData.profile.stxAddress);
        }
    }, []);

    async function createProof() {
        const network = new StacksMainnet();
        const userSession = new UserSession();

        const fileInput = document.getElementById('file-upload');
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function (e) {
            const hash = await window.crypto.subtle.digest('SHA-256', e.target.result);
            if (hash) { 
              const hashArray = Array.from(new Uint8Array(hash));
              const memo = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');  
            } else {
              alert('SHA-256 hash could not be computed');
            } 
            const hashArray = Array.from(new Uint8Array(hash));
            const memo = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            openSTXTransfer({
                recipient: 'SP000000000000000000002Q6VF78',
                amount: '1000000',
                memo: memo,
                network: new StacksMainnet(), // for mainnet, `new StacksMainnet()`
                appDetails: {
                  name: 'ChainVerifier',
                  icon: window.location.origin + '/favicon.ico',
                },
                onFinish: data => {
                  console.log('Stacks Transaction:', data.stacksTransaction);
                  console.log('Transaction ID:', data.txId);
                  console.log('Raw transaction:', data.txRaw);
                },
              });
        };

        reader.readAsArrayBuffer(file);
    }

    async function getTransaction(txId) {
        const response = await fetch(`https://stacks-node-api.mainnet.stacks.co/extended/v1/tx/${txId}`);
        const data = await response.json();
        return data;
    }

    async function getMemoField(blockHeight, txId) {
        const burnAddress = '1111111111111111111114oLvT2';
        const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${burnAddress}/stx_inbound?height=${blockHeight}`);
        const data = await response.json();

        if (!data.results) {
            alert('The entered transaction ID was invalid');
            return null;
        }

        const transaction = data.results.find(tx => tx.tx_id === txId);
        return transaction ? transaction.memo : null;
    }

    async function verifyProof() {
        const fileInput = document.getElementById('verify-file');
        const txIdInput = document.getElementById('tx-id');

        const file = fileInput.files[0];
        const txId = txIdInput.value;

        if (!txId) {
            alert('Please enter a transaction ID');
            return;
        }

        const reader = new FileReader();

        reader.onload = async function (e) {
            const arrayBuffer = e.target.result;
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const tx = await getTransaction(txId);
            const memoHash = await getMemoField(tx.block_height, txId);

            if (memoHash && memoHash === hashHex) {
                document.getElementById('status-section').innerText = 'File is verified';
            } else {
                document.getElementById('status-section').innerText = 'File is not verified';
            }
        }
        reader.readAsArrayBuffer(file);
    }

    return (
        <div className="flex flex-col justify-center items-center h-screen gap-8">
            <button className="p-4 bg-indigo-500 rounded text-white" onClick={connectWallet} >
                Connect Wallet
            </button>
            <p>Wallet Address: {walletAddress && walletAddress.testnet}</p>
            <div id="wallet-status" className={userSession.isUserSignedIn() ? "wallet-status connected" : "wallet-status not-connected"}>
                {userSession.isUserSignedIn() ? "Connected" : "Not Connected"}
            </div>
            <h1 className="text-6xl font-black">ChainVerifier</h1>
            <h2>Create a New Proof of Existence</h2>
            <div className="upload-section">
                <input type="file" id="file-upload" />
                <button id="create-proof" onClick={createProof}>Create Proof of Existence</button>
            </div>
            <h2>Verify a Proof of Existence</h2>
            <div className="verify-section">
                <input type="file" id="verify-file" />
                <input type="text" id="tx-id" placeholder="Enter Transaction ID" />
                <button id="verify-proof" onClick={verifyProof}>Verify Proof of Existence</button>
            </div>
            <div id="status-section"></div>
        </div>
    );
}

export default App;
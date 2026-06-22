import React, { createContext, useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../constants";
import toast from "react-hot-toast";

export interface Web3ContextType {
  // Wallet State
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;

  // Contract Instance
  contract: ethers.Contract | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;

  // Methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: string) => Promise<void>;

  // Network Info
  chainId: number | null;
  networkName: string | null;
}

export const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: React.ReactNode;
}

const CHAIN_ID = 11155111; // Sepolia Testnet  |
const NETWORK_NAME = "Sepolia";

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);

  /**
   * Initialize provider and check for existing wallet connection
   */
  const initializeProvider = useCallback(async () => {
    if (!window.ethereum) {
      console.warn("MetaMask not installed");
      return;
    }

    try {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);

      // Get network info
      const network = await newProvider.getNetwork();
      setChainId(Number(network.chainId));
      setNetworkName(network.name);

      // Check if already connected
      const accounts = await newProvider.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
        const newSigner = await newProvider.getSigner();
        setSigner(newSigner);
        initializeContract(newSigner);
      }
    } catch (error) {
      console.error("Provider initialization failed:", error);
    }
  }, []);

  /**
   * Initialize the DAO contract with signer
   */
  const initializeContract = useCallback(
    (signerInstance: ethers.Signer) => {
      try {
        const daoContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signerInstance
        );
        setContract(daoContract);
      } catch (error) {
        console.error("Contract initialization failed:", error);
      }
    },
    []
  );

  /**
   * Connect wallet via MetaMask
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed. Please install it to continue.");
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Reinitialize provider with signer
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const userAddress = await newSigner.getAddress();

      // Verify network is Sepolia
      const network = await newProvider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        toast.error(`Please switch to ${NETWORK_NAME} network in MetaMask`);
        return;
      }

      setAccount(userAddress);
      setProvider(newProvider);
      setSigner(newSigner);
      setChainId(Number(network.chainId));
      setNetworkName(network.name);

      initializeContract(newSigner);
      toast.success(`Wallet connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
    } catch (error: any) {
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        toast.error("Connection rejected by user");
      } else {
        console.error("Connection error:", error);
        toast.error("Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [initializeContract]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setContract(null);
    setSigner(null);
    toast.success("Wallet disconnected");
  }, []);

  /**
   * Switch network
   */
  const switchNetwork = useCallback(async (targetChainId: string) => {
    if (!window.ethereum) {
      toast.error("MetaMask not available");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });

      toast.success("Network switched successfully");
      // Re-initialize after network switch
      await initializeProvider();
    } catch (error: any) {
      if (error.code === 4902) {
        toast.error("Network not found in MetaMask");
      } else {
        console.error("Network switch error:", error);
        toast.error("Failed to switch network");
      }
    }
  }, [initializeProvider]);

  /**
   * Listen for account changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        // Reinitialize contract with new account
        initializeProvider();
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setChainId(parseInt(chainIdHex, 16));
      // Re-initialize on network change
      initializeProvider();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [initializeProvider, disconnectWallet]);

  /**
   * Initial setup
   */
  useEffect(() => {
    initializeProvider();
  }, [initializeProvider]);

  const value: Web3ContextType = {
    account,
    isConnected: !!account,
    isConnecting,
    isWrongNetwork: !!account && chainId !== CHAIN_ID,
    contract,
    provider,
    signer,
    chainId,
    networkName,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

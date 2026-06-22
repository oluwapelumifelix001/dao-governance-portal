import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./useWeb3";

export interface UseContractReadOptions {
  skip?: boolean;
  refetchInterval?: number;
  onError?: (error: Error) => void;
}

/**
 * Custom deep comparison helper to check if two values are equal,
 * handling BigInts, arrays, and objects.
 */
const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "bigint" && typeof b === "bigint") return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!isDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
};

/**
 * Hook for reading contract data
 * Handles loading, error states, and automatic refetching
 * 
 * @param functionName - Name of the contract function to call
 * @param args - Arguments to pass to the function
 * @param options - Configuration options
 * @returns { data, isLoading, error, refetch }
 */
export const useContractRead = <T = any,>(
  functionName: string,
  args: any[] = [],
  options: UseContractReadOptions = {}
) => {
  const { contract } = useWeb3();
  const { skip = false, refetchInterval = 0, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  // Stabilize args array to prevent infinite re-renders from inline arrays (e.g. [account])
  const argsRef = useRef<any[]>(args);
  if (!isDeepEqual(argsRef.current, args)) {
    argsRef.current = args;
  }
  const stableArgs = argsRef.current;

  // Stabilize onError using a ref to prevent recreating fetchData if an inline function is passed
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  /**
   * Fetch data from contract
   */
  const fetchData = useCallback(async () => {
    if (skip || !contract) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Verify and normalize contract address
      try {
        const target = contract.target;
        const rawAddress = typeof target === "string" ? target : await contract.getAddress();
        ethers.getAddress(rawAddress);
      } catch (err: any) {
        throw new Error(`Invalid contract address: ${err.message}`);
      }

      // 2. Verify and normalize address arguments passed to read functions
      const processedArgs: any[] = [];
      for (const arg of stableArgs) {
        if (typeof arg === "string" && (arg.startsWith("0x") || arg.length === 42)) {
          // Check if it is a valid format (hex string with 40 characters after 0x)
          if (!/^0x[a-fA-F0-9]{40}$/.test(arg)) {
            throw new Error(`Invalid address parameter format: "${arg}"`);
          }
          try {
            // Normalize and checksum the address using Ethers v6 getAddress
            processedArgs.push(ethers.getAddress(arg));
          } catch (err: any) {
            throw new Error(`Invalid address checksum: "${arg}". ${err.message}`);
          }
        } else {
          processedArgs.push(arg);
        }
      }

      const contractFunction = (contract as any)[functionName];

      if (!contractFunction) {
        throw new Error(`Function ${functionName} not found on contract`);
      }

      const result = await contractFunction(...processedArgs);
      setData(result);
    } catch (err: any) {
      const parsedError = new Error(err.message || "Failed to fetch contract data");
      setError(parsedError);

      if (onErrorRef.current) {
        onErrorRef.current(parsedError);
      } else {
        console.error(`Error fetching ${functionName}:`, err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contract, functionName, stableArgs, skip]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Refetch at interval
   * If there is a validation or runtime error, we stop the refetching to prevent CPU-intensive loops.
   */
  useEffect(() => {
    if (refetchInterval <= 0 || skip || error) return;

    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval, skip, error]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

/**
 * Specialized hook for fetching user balance
 */
export const useUserBalance = (account: string | null, refetchInterval = 10000) => {
  return useContractRead(
    "userBalances",
    account ? [account] : [],
    {
      skip: !account,
      refetchInterval,
      onError: (error) => {
        console.error("Failed to fetch user balance:", error);
      },
    }
  );
};

/**
 * Specialized hook for fetching all proposals
 */
export const useAllProposals = (refetchInterval = 15000) => {
  const { isConnected } = useWeb3();
  return useContractRead("getAllProposals", [], {
    skip: !isConnected,
    refetchInterval,
    onError: (error) => {
      console.error("Failed to fetch proposals:", error);
    },
  });
};

/**
 * Specialized hook for fetching single proposal details
 */
export const useProposalDetails = (proposalId: number | null, refetchInterval = 15000) => {
  return useContractRead(
    "getProposalDetails",
    proposalId !== null ? [proposalId] : [],
    {
      skip: proposalId === null,
      refetchInterval,
      onError: (error) => {
        console.error(`Failed to fetch proposal ${proposalId}:`, error);
      },
    }
  );
};

/**
 * Specialized hook for checking if user voted
 */
export const useHasVoted = (account: string | null, proposalId: number | null) => {
  return useContractRead(
    "hasVoted",
    account && proposalId !== null ? [account, proposalId] : [],
    {
      skip: !account || proposalId === null,
      refetchInterval: 5000,
      onError: (error) => {
        console.error(`Failed to check vote status:`, error);
      },
    }
  );
};

/**
 * Specialized hook for fetching proposal duration
 */
export const useProposalDuration = () => {
  const { isConnected } = useWeb3();
  return useContractRead("proposalDuration", [], {
    skip: !isConnected,
  });
};

/**
 * Specialized hook for fetching total proposals count
 */
export const useTotalProposalsCount = (refetchInterval = 15000) => {
  const { isConnected } = useWeb3();
  return useContractRead("totalProposalsCount", [], {
    skip: !isConnected,
    refetchInterval,
  });
};

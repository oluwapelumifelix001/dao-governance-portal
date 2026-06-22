import { useState, useCallback } from "react";
import { useWeb3 } from "./useWeb3";
import toast from "react-hot-toast";

export interface TransactionOptions {
  gasMultiplier?: number; // Multiplier for gas limit (default: 1.2x)
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

export interface WriteContractOptions extends TransactionOptions {
  functionName: string;
  args?: any[];
}

/**
 * Hook for writing to contract (state-changing transactions)
 * Handles gas estimation, loading states, confirmations, and error handling
 * 
 * @param options - Configuration options
 * @returns { write, isLoading, isConfirming, data, error, reset }
 */
export const useContractWrite = (options: TransactionOptions = {}) => {
  const { contract, account } = useWeb3();
  const { gasMultiplier = 1.2, onSuccess, onError, showToast = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Execute contract function
   */
  const write = useCallback(
    async (functionName: string, args: any[] = []) => {
      if (!contract || !account) {
        const err = new Error("Wallet not connected or contract not initialized");
        setError(err);
        if (showToast) toast.error("Wallet not connected");
        return;
      }

      setIsLoading(true);
      setError(null);
      setData(null);

      const toastId = showToast ? toast.loading("Preparing transaction...") : undefined;

      try {
        const contractFunction = (contract as any)[functionName];

        if (!contractFunction) {
          throw new Error(`Function ${functionName} not found on contract`);
        }

        // Estimate gas
        if (showToast && toastId) {
          toast.loading("Estimating gas...", { id: toastId });
        }

        let gasLimit: bigint;
        try {
          const gasEstimate = await contractFunction.estimateGas(...args);
          gasLimit = (gasEstimate * BigInt(Math.floor(gasMultiplier * 100))) / BigInt(100);
        } catch (gasError: any) {
          // If estimation fails, use a reasonable default
          console.warn("Gas estimation failed, using default:", gasError);
          gasLimit = BigInt(500000);
        }

        // Execute transaction
        if (showToast && toastId) {
          toast.loading("Sending transaction...", { id: toastId });
        }

        const tx = await contractFunction(...args, { gasLimit });
        const txHash = tx.hash;
        setData(txHash);

        if (showToast && toastId) {
          toast.loading("Waiting for confirmation...", { id: toastId });
        }

        // Wait for confirmation
        setIsConfirming(true);
        const receipt = await tx.wait();

        if (showToast && toastId) {
          toast.success("Transaction confirmed!", { id: toastId });
        }

        if (onSuccess) {
          onSuccess(txHash);
        }

        return {
          transactionHash: txHash,
          receipt,
        };
      } catch (err: any) {
        const error = new Error(extractErrorMessage(err));
        setError(error);

        if (showToast && toastId) {
          toast.error(error.message, { id: toastId });
        }

        if (onError) {
          onError(error);
        }

        console.error(`Error executing ${functionName}:`, err);
      } finally {
        setIsLoading(false);
        setIsConfirming(false);
      }
    },
    [contract, account, gasMultiplier, onSuccess, onError, showToast]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setIsConfirming(false);
    setData(null);
    setError(null);
  }, []);

  return {
    write,
    isLoading,
    isConfirming,
    data,
    error,
    reset,
  };
};

/**
 * Specialized hook for creating proposals
 */
export const useCreateProposal = (onSuccess?: (txHash: string) => void) => {
  const { write, ...rest } = useContractWrite({
    onSuccess,
    showToast: true,
  });

  const createProposal = useCallback(
    async (description: string) => {
      if (!description.trim()) {
        toast.error("Proposal description cannot be empty");
        return;
      }

      return write("propose", [description]);
    },
    [write]
  );

  return {
    createProposal,
    ...rest,
  };
};

/**
 * Specialized hook for voting
 */
export const useCastVote = (onSuccess?: (txHash: string) => void) => {
  const { write, ...rest } = useContractWrite({
    onSuccess,
    showToast: true,
  });

  const vote = useCallback(
    async (proposalId: number, support: boolean) => {
      return write("vote", [proposalId, support]);
    },
    [write]
  );

  return {
    vote,
    ...rest,
  };
};

/**
 * Specialized hook for executing proposals
 */
export const useExecuteProposal = (onSuccess?: (txHash: string) => void) => {
  const { write, ...rest } = useContractWrite({
    onSuccess,
    showToast: true,
  });

  const execute = useCallback(
    async (proposalId: number) => {
      return write("execute", [proposalId]);
    },
    [write]
  );

  return {
    execute,
    ...rest,
  };
};

/**
 * Specialized hook for distributing tokens (owner only)
 */
export const useDistributeTokens = (onSuccess?: (txHash: string) => void) => {
  const { write, ...rest } = useContractWrite({
    onSuccess,
    showToast: true,
  });

  const distribute = useCallback(
    async (recipient: string, amount: string) => {
      if (!recipient || !amount) {
        toast.error("Recipient and amount are required");
        return;
      }

      return write("distributeTokens", [recipient, amount]);
    },
    [write]
  );

  return {
    distribute,
    ...rest,
  };
};

/**
 * Specialized hook for transferring tokens
 */
export const useTransferTokens = (onSuccess?: (txHash: string) => void) => {
  const { write, ...rest } = useContractWrite({
    onSuccess,
    showToast: true,
  });

  const transfer = useCallback(
    async (recipient: string, amount: string) => {
      if (!recipient || !amount) {
        toast.error("Recipient and amount are required");
        return;
      }

      return write("transferTokens", [recipient, amount]);
    },
    [write]
  );

  return {
    transfer,
    ...rest,
  };
};

/**
 * Extract error message from various error types
 */
function extractErrorMessage(err: any): string {
  if (err.code === "ACTION_REJECTED" || err.code === 4001) {
    return "Transaction rejected by user";
  }

  if (err.reason && typeof err.reason === "string") {
    // Handle revert reason
    const match = err.reason.match(/'([^']+)'/);
    if (match) {
      return `Contract Revert: ${match[1]}`;
    }
    return `Contract Revert: ${err.reason}`;
  }

  if (err.message) {
    // Clean up common error messages
    if (err.message.includes("insufficient funds")) {
      return "Insufficient balance for gas";
    }
    if (err.message.includes("nonce has already been used")) {
      return "Transaction nonce already used - please try again";
    }
    if (err.message.includes("undersized data")) {
      return "Invalid transaction data";
    }

    return err.message;
  }

  return "An unknown error occurred";
}

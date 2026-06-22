import { useContext } from "react";
import { Web3Context } from "./Web3Context";
import type { Web3ContextType } from "./Web3Context";

/**
 * Hook to access Web3 context
 * Must be used within Web3Provider
 */
export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);

  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }

  return context;
};

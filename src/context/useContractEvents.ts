import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./useWeb3";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../constants";

export interface ContractEvent {
  name: string;
  args: any;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

/**
 * Hook for listening to contract events
 * Handles event filtering, deduplication, and cleanup
 * 
 * @param eventName - Name of the event to listen to
 * @param onEvent - Callback when event is received
 * @param maxEvents - Maximum number of events to keep in history
 * @returns { events, isListening, clear }
 */
export const useContractEvents = (
  eventName: string,
  onEvent?: (event: ContractEvent) => void,
  maxEvents: number = 50
) => {
  const { provider } = useWeb3();
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  /**
   * Clear event history
   */
  const clear = useCallback(() => {
    setEvents([]);
  }, []);

  /**
   * Setup event listener
   */
  useEffect(() => {
    if (!provider) {
      setIsListening(false);
      return;
    }

    setIsListening(true);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const handleEvent = (...args: any[]) => {
      const eventData = args[args.length - 1]; // Last argument is the event object

      const newEvent: ContractEvent = {
        name: eventName,
        args: Object.assign({}, ...args.slice(0, -1).map((_, i) => ({ [i]: _ }))),
        transactionHash: eventData?.transactionHash || "",
        blockNumber: eventData?.blockNumber || 0,
        timestamp: Math.floor(Date.now() / 1000),
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, maxEvents));

      if (onEvent) {
        onEvent(newEvent);
      }
    };

    try {
      contract.on(eventName, handleEvent);

      return () => {
        contract.off(eventName, handleEvent);
      };
    } catch (error) {
      console.error(`Error listening to event ${eventName}:`, error);
      setIsListening(false);
    }
  }, [provider, eventName, onEvent, maxEvents]);

  return {
    events,
    isListening,
    clear,
  };
};

/**
 * Specialized hook for listening to VoteCast events
 */
export const useVoteCastEvents = (onVote?: (event: ContractEvent) => void) => {
  return useContractEvents("VoteCast", onVote, 100);
};

/**
 * Specialized hook for listening to ProposalExecuted events
 */
export const useProposalExecutedEvents = (
  onExecute?: (event: ContractEvent) => void
) => {
  return useContractEvents("ProposalExecuted", onExecute, 50);
};

/**
 * Hook for listening to multiple events
 */
export const useMultipleContractEvents = (
  eventNames: string[],
  onEvent?: (eventName: string, event: ContractEvent) => void
) => {
  const { provider } = useWeb3();
  const [allEvents, setAllEvents] = useState<{ [key: string]: ContractEvent[] }>({});
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!provider || eventNames.length === 0) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const listeners: { [key: string]: Function } = {};

    eventNames.forEach((eventName) => {
      const handleEvent = (...args: any[]) => {
        const eventData = args[args.length - 1];

        const newEvent: ContractEvent = {
          name: eventName,
          args: Object.assign({}, ...args.slice(0, -1).map((_, i) => ({ [i]: _ }))),
          transactionHash: eventData?.transactionHash || "",
          blockNumber: eventData?.blockNumber || 0,
          timestamp: Math.floor(Date.now() / 1000),
        };

        setAllEvents((prev) => ({
          ...prev,
          [eventName]: [newEvent, ...(prev[eventName] || [])].slice(0, 50),
        }));

        if (onEvent) {
          onEvent(eventName, newEvent);
        }
      };

      listeners[eventName] = handleEvent;
      contract.on(eventName, handleEvent);
    });

    return () => {
      Object.entries(listeners).forEach(([eventName, handler]) => {
        contract.off(eventName, handler as any);
      });
    };
  }, [provider, eventNames, onEvent]);

  const clear = useCallback(() => {
    setAllEvents({});
  }, []);

  return {
    allEvents,
    isListening,
    clear,
  };
};

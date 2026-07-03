import { ethers } from "ethers";
import contractJson from "./Daosimulator.json";

// Your live Sepolia contract address

export const CONTRACT_ADDRESS = ethers.getAddress("0x8Fe4913993829a299e71FF7ACCE67f1f1eDa1091");
export const CONTRACT_ABI = contractJson.abi;
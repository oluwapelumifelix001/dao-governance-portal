import { ethers } from "ethers";
import contractJson from "./Daosimulator.json";

// Your live Sepolia contract address
export const CONTRACT_ADDRESS = ethers.getAddress("0x5981aDcf0B4Fb9948dAa05a5069293385d434382");
export const CONTRACT_ABI = contractJson.abi;
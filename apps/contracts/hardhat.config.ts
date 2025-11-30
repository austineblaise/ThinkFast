import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    celo_sepolia: {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      chainId: 11142220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },

  etherscan: {
    apiKey: {
      celo: CELOSCAN_API_KEY,
      celo_sepolia: CELOSCAN_API_KEY,
    },
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
      {
        network: "celo_sepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api-celo-sepolia.blockscout.com/api",
          browserURL: "https://celo-sepolia.blockscout.com",
        },
      },
    ],
  },
};

export default config;

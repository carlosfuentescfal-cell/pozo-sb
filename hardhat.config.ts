import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: "0.8.28",
  networks: {
    fuji: {
      type: "http",
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [configVariable("FUJI_PRIVATE_KEY")],
    },
  },
});

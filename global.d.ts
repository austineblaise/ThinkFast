// type-extensions.d.ts (Create this file)

import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ethers: typeof import("ethers");
  }
}
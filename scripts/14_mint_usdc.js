// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const config = require("../config");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const netConfig = config[hre.network.name];
  const usdc_t = await hre.ethers.getContractAt("USDC_t", netConfig.USDC);

  const amount = 100_000_000_000_000;
  const depositData = hre.ethers.utils.defaultAbiCoder.encode(["uint256"], [amount]);
  console.log(depositData);
  const tx = await usdc_t.deposit(netConfig.admin, depositData);
  await tx.wait();

  console.log("Minted 100_000_000 USDC to: ", netConfig.admin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
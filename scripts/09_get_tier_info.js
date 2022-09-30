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
  const saleConfig = netConfig.saleConfig;
  const tiersParam = saleConfig.tiersParam;

  const Sale = await hre.ethers.getContractFactory("BttcPadSale");
  const sale = await Sale.attach(saleConfig.contractAddress);

  await Promise.all(
    tiersParam.map((_, index) => async () => {
      const tierInfo = await sale.tierIdToTier(tierIndex);
      console.log(`Tier info for ${index}: `, tierInfo);
    })
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

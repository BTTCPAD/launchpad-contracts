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
  const saleParam = saleConfig.saleParam;

  console.log(saleConfig.contractAddress);

  const Sale = await hre.ethers.getContractFactory("BttcPadSale");
  const sale = await Sale.attach(saleConfig.contractAddress);

  const tx = await sale.setSaleParams(
    saleParam._token,
    saleParam._saleOwner,
    saleParam._tokenPriceInUSDC,
    saleParam._amountOfTokensToSell,
    saleParam._firstRoundStart,
    saleParam._firstRoundEnd,
    saleParam._secondRoundStart,
    saleParam._secondRoundEnd,
    saleParam._firstRoundMinDeposit,
    saleParam._secondRoundMinDeposit,
    saleParam._secondRoundMaxDeposit,
    saleParam._tokensUnlockTime
  );

  await tx.wait();
  console.log("Sale params set successfully");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

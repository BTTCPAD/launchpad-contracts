// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const contractAddres = "0x0D7f52EB270aA6c99D2456000ffB1974C3Ae9010";
const saleParams = {
  tokenAddress: "0x791BB207c8A82C1059D1292D284749Bd28eA1c13",
  saleOwner: "0x284c98652c9bF896E080832fAe015D01C0022a43",
  tokenPriceInUSDC: "250000", // 0.25 USDC
  amountOfTokensToSell: "5000000000000000000000000", // 5M
  saleStart: 1659139200, // 2022-07-30 00:00:00 UTC
  saleEnd: 1660435200, // 2022-08-14 00:00:00 UTC
  tokensUnlockTime: 1660521600, // 2022-08-15 00:00:00 UTC
  minimumTokenDeposit: 50000000, // 50 USDC
};

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Sale = await hre.ethers.getContractFactory("BttcPadSale");
  const sale = await Sale.attach(contractAddres);

  await sale.setSaleParams(
    saleParams.tokenAddress,
    saleParams.saleOwner,
    saleParams.tokenPriceInUSDC,
    saleParams.amountOfTokensToSell,
    saleParams.saleStart,
    saleParams.saleEnd,
    saleParams.tokensUnlockTime,
    saleParams.minimumTokenDeposit
  );

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

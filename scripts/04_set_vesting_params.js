// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const contractAddres = "0x0D7f52EB270aA6c99D2456000ffB1974C3Ae9010";
const vestingParams = [
  {
    unlockTime: 1660521600, // 2022-08-15 00:00:00 UTC
    percent: 30,
  },
  {
    unlockTime: 1660543200, // 2022-08-15 06:00:00 UTC
    percent: 70,
  },
];

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

  const unlockTimes = vestingParams.map((item) => item.unlockTime);
  const percents = vestingParams.map((item) => item.percent);

  await sale.setVestingParams(unlockTimes, percents);

  console.log("Vesting params set successfully");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

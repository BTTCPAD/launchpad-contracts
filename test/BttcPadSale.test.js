const { expect } = require("chai");
const { ethers, web3 } = require("hardhat");

const amountToSell = "5000000000000000000000000"; // 5M

const getBlockTimestamp = async () => {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  const timestampBefore = blockBefore.timestamp;
  return timestampBefore + 1;
};

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("BTTCPadSale", function () {
  let deployer, saleOwner, buyer1, buyer2, buyer3, buyer4, buyer5;
  let usdc, btp, staking, sale;
  let currentTimestamp;

  beforeEach(async () => {
    [deployer, saleOwner, buyer1, buyer2, buyer3, buyer4, buyer5] =
      await ethers.getSigners();

    const USDC = await ethers.getContractFactory("USDC_t");
    usdc = await USDC.deploy("USD Coin_TRON", "USDC_t", 6, deployer.address);
    await usdc.deployed();
    // console.log("USDC deployed at: ", usdc.address);

    const BTP = await ethers.getContractFactory("ERC20Token");
    btp = await BTP.deploy();
    await btp.deployed();
    // console.log("BTP deployed at: ", btp.address);

    const Staking = await ethers.getContractFactory("AllocationStaking");
    staking = await Staking.deploy();
    await staking.deployed();
    // console.log("Allocation Staking deployed at: ", staking.address);

    await staking.setStakingToken(btp.address);

    const SalesFactory = await ethers.getContractFactory("SalesFactory");
    const salesFactory = await SalesFactory.deploy(
      deployer.address,
      staking.address
    );
    await salesFactory.deployed();
    // console.log("Sales Factory deployed at: ", salesFactory.address);

    await salesFactory.deploySale();
    const saleAddress = await salesFactory.getLastDeployedSale();

    const BttcPadSale = await ethers.getContractFactory("BttcPadSale");
    sale = BttcPadSale.attach(saleAddress);
    // console.log("Sale Address: ", sale.address);

    await sale.setUSDCTokenAddress(usdc.address);
  });

  describe("Set Sale Params", () => {
    beforeEach(async () => {
      currentTimestamp = await getBlockTimestamp();
    });

    it("Should succeed with proper params", async () => {
      // set sale params
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );
    });

    it("Should fail when sale is already created", async () => {
      // set sale params
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await expect(
        sale.setSaleParams(
          btp.address,
          saleOwner.address,
          "250000", // 0.25 USDC
          amountToSell, // 5M
          currentTimestamp,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 24 * 60 * 60,
          50000000, // 50 USDC
          50000000, // 50 USDC
          500000000, // 500 USDC
          currentTimestamp + 24 * 60 * 60
        )
      ).to.be.revertedWith("Sale already created");
    });

    it("Should fail when inputs are not valid", async () => {
      await expect(
        sale.setSaleParams(
          btp.address,
          saleOwner.address,
          0, // invalid price
          amountToSell, // 5M
          currentTimestamp,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 24 * 60 * 60,
          50000000, // 50 USDC
          50000000, // 50 USDC
          500000000, // 500 USDC
          currentTimestamp + 24 * 60 * 60
        )
      ).to.be.revertedWith("Token price should be greater than 0");

      await expect(
        sale.setSaleParams(
          btp.address,
          saleOwner.address,
          250000, // invalid price
          0, // 5M
          currentTimestamp,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 24 * 60 * 60,
          50000000, // 50 USDC
          50000000, // 50 USDC
          500000000, // 500 USDC
          currentTimestamp + 24 * 60 * 60
        )
      ).to.be.revertedWith("Amount to sell should be greater than 0");

      await expect(
        sale.setSaleParams(
          btp.address,
          saleOwner.address,
          "250000", // 0.25 USDC
          amountToSell, // 5M
          currentTimestamp,
          currentTimestamp - 12 * 60 * 60,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 24 * 60 * 60,
          50000000, // 50 USDC
          50000000, // 50 USDC
          500000000, // 500 USDC
          currentTimestamp + 24 * 60 * 60
        )
      ).to.be.revertedWith("First round end time should be in the future");

      await expect(
        sale.setSaleParams(
          btp.address,
          saleOwner.address,
          "250000", // 0.25 USDC
          amountToSell, // 5M
          currentTimestamp,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 12 * 60 * 60,
          currentTimestamp + 24 * 60 * 60,
          50000000, // 50 USDC
          50000000, // 50 USDC
          500000000, // 500 USDC
          currentTimestamp - 24 * 60 * 60
        )
      ).to.be.revertedWith("Token unlock time should be in the future");
    });
  });

  describe("Set Vesting Params", () => {
    beforeEach(async () => {
      currentTimestamp = await getBlockTimestamp();
    });

    it("Should succeed with valid params", async () => {
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await sale.setVestingParams(
        [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
        [30, 70]
      );
    });

    it("Should fail if params are already set", async () => {
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await sale.setVestingParams(
        [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
        [30, 70]
      );

      await expect(
        sale.setVestingParams(
          [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
          [30, 70]
        )
      ).to.be.revertedWith("Vesting params are already set");
    });

    it("Should fail if inputs do not have same length", async () => {
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await expect(
        sale.setVestingParams(
          [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
          [30, 70, 100]
        )
      ).to.be.revertedWith("Parameters should have same length");
    });

    it("Should fail if percentages does not add up to 100", async () => {
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await expect(
        sale.setVestingParams(
          [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
          [30, 50]
        )
      ).to.be.revertedWith("Percent distribution issue");
    });

    it("Should fail if sale is not created", async () => {
      await expect(
        sale.setVestingParams(
          [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
          [30, 50]
        )
      ).to.be.revertedWith("Sale params are not set");
    });
  });

  describe("Set Registration TIme", () => {
    beforeEach(async () => {
      currentTimestamp = await getBlockTimestamp();
    });

    it("Should fail if sale is not created", async () => {
      await expect(
        sale.setRegistrationTime(currentTimestamp + 10, currentTimestamp + 60)
      ).to.be.revertedWith("Sale params are not set");
    });

    it("Should fail if inputs are not valid", async () => {
      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await expect(
        sale.setRegistrationTime(currentTimestamp - 10, currentTimestamp + 60)
      ).to.be.revertedWith(
        "Registration start time should be after current time"
      );

      await expect(
        sale.setRegistrationTime(currentTimestamp + 20, currentTimestamp + 10)
      ).to.be.revertedWith("Registration end time should be after start time");

      await expect(
        sale.setRegistrationTime(
          currentTimestamp + 10,
          currentTimestamp + 12 * 60 * 60
        )
      ).to.be.revertedWith("Registration end time should be before sale end");
    });
  });

  describe("Register for Sale", () => {
    beforeEach(async () => {
      currentTimestamp = await getBlockTimestamp();

      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await sale.setVestingParams(
        [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
        [30, 70]
      );

      await sale.setRegistrationTime(
        currentTimestamp + 2,
        currentTimestamp + 10
      );

      // await btp.transfer(saleOwner.address, amountToSell);
      // await btp.connect(saleOwner).approve(sale.address, amountToSell);
      // await sale.connect(saleOwner).depositTokens();
    });

    it("Should fail if not enough tokens are staked", async () => {
      await sale.addTiers(
        [50, 30],
        [
          "100000000000000000000", // 100 tokens 000000000000000000
          "1000000000000000000000", // 1000 tokens
        ],
        [true, false]
      );

      await expect(sale.connect(buyer1).registerForSale()).to.be.revertedWith(
        "Need to stake minimum for current sale"
      );
    });

    it("Should suceed if enough tokens are staked", async () => {
      await sale.setRegistrationTime(
        currentTimestamp + 3,
        currentTimestamp + 60
      );

      await sale.addTiers(
        [50, 30],
        [
          "100000000000000000000", // 100 tokens
          "1000000000000000000000", // 1000 tokens
        ],
        [true, false]
      );

      await btp.transfer(buyer1.address, "100000000000000000000"); // 100 BTP
      await btp
        .connect(buyer1)
        .approve(staking.address, "100000000000000000000");
      await staking.connect(buyer1).deposit("100000000000000000000");
      await sale.connect(buyer1).registerForSale();

      await btp.transfer(buyer2.address, "200000000000000000000"); // 100 BTP
      await btp
        .connect(buyer2)
        .approve(staking.address, "200000000000000000000");
      await staking.connect(buyer2).deposit("200000000000000000000");
      await sale.connect(buyer2).registerForSale();

      await btp.transfer(buyer3.address, "1500000000000000000000"); // 100 BTP
      await btp
        .connect(buyer3)
        .approve(staking.address, "1500000000000000000000");
      await staking.connect(buyer3).deposit("1500000000000000000000");
      await sale.connect(buyer3).registerForSale();

      expect((await sale.registration()).numberOfRegistrants).to.equal(3);
      expect(await sale.getLotteryWallets(0)).to.equal(2);
      expect(await sale.getLotteryWallets(1)).to.equal(0);
    });

    it("Should fail if already registered", async () => {
      await sale.addTiers(
        [50, 30],
        [
          "100000000000000000000", // 100 tokens
          "1000000000000000000000", // 1000 tokens
        ],
        [true, false]
      );

      await btp.transfer(buyer1.address, "100000000000000000000"); // 100 BTP
      await btp
        .connect(buyer1)
        .approve(staking.address, "100000000000000000000");
      await staking.connect(buyer1).deposit("100000000000000000000");
      await sale.connect(buyer1).registerForSale();
      await expect(sale.connect(buyer1).registerForSale()).to.be.revertedWith(
        "You are registered"
      );
    });

    // Commented as it takes time
    // it("Should fail if registration is closed", async () => {
    //   await sale.addTiers(
    //     [50, 30],
    //     [
    //       "100000000000000000000", // 100 tokens
    //       "1000000000000000000000", // 1000 tokens
    //     ],
    //     [true, false]
    //   );

    //   await btp.transfer(buyer1.address, "100000000000000000000"); // 100 BTP
    //   await btp
    //     .connect(buyer1)
    //     .approve(staking.address, "100000000000000000000");
    //   await staking.connect(buyer1).deposit("100000000000000000000");
    //   await timeout(10000);
    //   await expect(sale.connect(buyer1).registerForSale()).to.be.revertedWith(
    //     "Register is closed"
    //   );
    // });
  });

  describe("Participate", () => {
    beforeEach(async () => {
      currentTimestamp = await getBlockTimestamp();

      await sale.setSaleParams(
        btp.address,
        saleOwner.address,
        "250000", // 0.25 USDC
        amountToSell, // 5M
        currentTimestamp,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 12 * 60 * 60,
        currentTimestamp + 24 * 60 * 60,
        50000000, // 50 USDC
        50000000, // 50 USDC
        500000000, // 500 USDC
        currentTimestamp + 24 * 60 * 60
      );

      await sale.setVestingParams(
        [currentTimestamp + 12 * 60 * 60, currentTimestamp + 24 * 60 * 60],
        [30, 70]
      );

      await sale.setRegistrationTime(
        currentTimestamp + 2,
        currentTimestamp + 15
      );

      await sale.addTiers(
        [50, 30],
        [
          "100000000000000000000", // 100 tokens
          "1000000000000000000000", // 1000 tokens
        ],
        [true, false]
      );

      await btp.transfer(buyer1.address, "100000000000000000000"); // 100 BTP
      await btp
        .connect(buyer1)
        .approve(staking.address, "100000000000000000000");
      await staking.connect(buyer1).deposit("100000000000000000000");
      await sale.connect(buyer1).registerForSale();

      await btp.transfer(buyer2.address, "200000000000000000000"); // 200 BTP
      await btp
        .connect(buyer2)
        .approve(staking.address, "200000000000000000000");
      await staking.connect(buyer2).deposit("200000000000000000000");
      await sale.connect(buyer2).registerForSale();

      await btp.transfer(buyer3.address, "1500000000000000000000"); // 1500 BTP
      await btp
        .connect(buyer3)
        .approve(staking.address, "1500000000000000000000");
      await staking.connect(buyer3).deposit("1500000000000000000000");
      await sale.connect(buyer3).registerForSale();
    });

    it("Should fail if amount is less than minimum", async () => {
      await expect(sale.participate("10000000")).to.be.revertedWith(
        "Can't deposit less than minimum"
      );
    });

    it("Should fail if not whitelisted", async () => {
      await expect(sale.participate("100000000")).to.be.revertedWith(
        "User must be in white list"
      );
    });

    it("Should fail if whitelisted but not allowed", async () => {
      await expect(
        sale.connect(buyer1).participate("100000000")
      ).to.be.revertedWith("You can't access sale");
    });

    it("Should succeed if whitelisted for non-lottery tier", async () => {
      await usdc.deposit(
        buyer3.address,
        ethers.utils.solidityPack(["uint256"], [5000000000])
      );
      await usdc.connect(buyer3).approve(sale.address, 100000000);
      await sale.connect(buyer3).participate("100000000");

      const tier = await sale.tierIdToTier(1);
      expect(tier.participants).to.be.eq(1);
      expect(tier.USDCDeposited).to.be.eq("100000000");
      expect(await sale.numOfParticipants()).to.be.eq(1);
    });

    it("Should succeed if whitelisted for lottery tier and allowed", async () => {
      await usdc.deposit(
        buyer1.address,
        ethers.utils.solidityPack(["uint256"], [5000000000])
      );
      await usdc.connect(buyer1).approve(sale.address, 100000000);

      await usdc.deposit(
        buyer2.address,
        ethers.utils.solidityPack(["uint256"], [5000000000])
      );
      await usdc.connect(buyer2).approve(sale.address, 200000000);

      await timeout(5);
      await sale.runLottery(0, 2);
      await sale.connect(buyer1).participate("100000000");
      await sale.connect(buyer2).participate("200000000");

      const tier = await sale.tierIdToTier(0);
      expect(tier.participants).to.be.eq(2);
      expect(tier.USDCDeposited).to.be.eq("300000000");
      expect(await sale.numOfParticipants()).to.be.eq(2);
    });

    it("Should fail if already participated", async () => {
      await usdc.deposit(
        buyer3.address,
        ethers.utils.solidityPack(["uint256"], [5000000000])
      );
      await usdc.connect(buyer3).approve(sale.address, 100000000);
      await sale.connect(buyer3).participate("100000000");
      await expect(
        sale.connect(buyer3).participate("100000000")
      ).to.be.revertedWith("Participate only once");
    });
  });

  describe("Calculate and withdraw", () => {
    let saleToken;
    beforeEach(async () => {
      const depositUSDC = async (account, amount) => {
        await usdc.deposit(
          account.address,
          ethers.utils.solidityPack(["uint256"], [amount])
        );
        await usdc.connect(account).approve(sale.address, amount);
      };

      const depositAndStakeBTP = async (account, amount) => {
        await btp.transfer(account.address, amount); // 100 BTP
        await btp.connect(account).approve(staking.address, amount);
        await staking.connect(account).deposit(amount);
      };

      const ERC20Token = await ethers.getContractFactory("ERC20Token");
      saleToken = await ERC20Token.deploy();
      await saleToken.deployed();

      await depositUSDC(buyer1, "1000000000"); // 1000 USC each
      await depositUSDC(buyer2, "1000000000");
      await depositUSDC(buyer3, "1000000000");
      await depositUSDC(buyer4, "1000000000");
      await depositUSDC(buyer5, "1000000000");

      await depositAndStakeBTP(buyer1, "100000000000000000000"); // 100 BTP
      await depositAndStakeBTP(buyer2, "200000000000000000000"); // 200 BTP
      await depositAndStakeBTP(buyer3, "300000000000000000000"); // 300 BTP
      await depositAndStakeBTP(buyer4, "1000000000000000000000"); // 1000 BTP
      await depositAndStakeBTP(buyer5, "2000000000000000000000"); // 2000 BTP

      currentTimestamp = await getBlockTimestamp();

      // set sale params
      await sale.setSaleParams(
        saleToken.address,
        saleOwner.address,
        "1000000", // 1 USDC
        "2000000000000000000000", // 2000 tokens
        currentTimestamp,
        currentTimestamp + 17,
        currentTimestamp + 18,
        currentTimestamp + 24,
        100000000, // 100 USDC
        100000000, // 100 USDC
        1000000000, // 1000 USDC
        currentTimestamp + 24
      );

      await sale.setVestingParams(
        [currentTimestamp + 24, currentTimestamp + 27],
        [40, 60]
      );

      await sale.setRegistrationTime(
        currentTimestamp + 5,
        currentTimestamp + 11
      );

      await sale.addTiers(
        [60, 40],
        [
          "100000000000000000000", // 100 BTP
          "1000000000000000000000", // 1000 BTP
        ],
        [true, false]
      );

      await saleToken.transfer(saleOwner.address, "2000000000000000000000");
      await saleToken
        .connect(saleOwner)
        .approve(sale.address, "2000000000000000000000");
      await sale.connect(saleOwner).depositTokens();
    });

    it("Sale amount should match", async function () {
      await sale.connect(buyer1).registerForSale();
      await sale.connect(buyer2).registerForSale();
      await sale.connect(buyer3).registerForSale();
      await sale.connect(buyer4).registerForSale();
      await sale.connect(buyer5).registerForSale();

      // await timeout(3000);
      await sale.runLottery(0, 3);

      await sale.connect(buyer1).participate("100000000"); // 100
      await sale.connect(buyer2).participate("200000000"); // 200
      await sale.connect(buyer3).participate("500000000"); // 500
      await sale.connect(buyer4).participate("200000000"); // 200
      await sale.connect(buyer5).participate("700000000"); // 400

      await sale.calculateFirstRoundSale();

      expect(await sale.tokensRemaining()).to.eq(web3.utils.toWei("400"));

      await sale.connect(buyer1).buy("100000000"); // 100 + 100
      await expect(sale.connect(buyer4).buy("400000000")).to.be.revertedWith(
        "Not enough tokens remaining"
      );
      await sale.connect(buyer5).buy("100000000"); // 400 + 100
      await sale.connect(buyer1).buy("100000000"); // 100 + 100 + 100

      await expect(sale.connect(buyer1).withdrawTokens(0)).to.be.revertedWith(
        "Tokens cann`t be withdrawn"
      );
      await timeout(1000);
      await sale.connect(buyer1).withdrawTokens(0);
      await expect(sale.connect(buyer1).withdrawTokens(1)).to.be.revertedWith(
        "Portion not unlocked"
      );
      expect(await saleToken.balanceOf(buyer1.address)).to.eq(
        web3.utils.toWei("120")
      ); // 300 * 0.4

      await sale.connect(buyer3).withdrawTokens(0);
      expect(await saleToken.balanceOf(buyer3.address)).to.eq(
        web3.utils.toWei("200")
      ); // 500 * 0.4

      await sale.connect(buyer5).withdrawTokens(0);
      expect(await saleToken.balanceOf(buyer5.address)).to.eq(
        web3.utils.toWei("200")
      ); // 500 * 0.4

      expect(await sale.tokensRemaining()).to.eq(web3.utils.toWei("100"));

      await sale.connect(buyer1).withdrawTokens(0);
      expect(await saleToken.balanceOf(buyer1.address)).to.eq(
        web3.utils.toWei("120")
      ); // 300 * 0.4

      expect(await usdc.balanceOf(buyer1.address)).to.eq("700000000");
      expect(await usdc.balanceOf(buyer2.address)).to.eq("800000000");
      expect(await usdc.balanceOf(buyer3.address)).to.eq("500000000");
      expect(await usdc.balanceOf(buyer4.address)).to.eq("800000000");
      expect(await usdc.balanceOf(buyer5.address)).to.eq("500000000");

      await sale.connect(buyer1).withdrawTokens(1);
      expect(await saleToken.balanceOf(buyer1.address)).to.eq(
        web3.utils.toWei("300")
      );

      await sale.connect(buyer3).withdrawTokens(1);
      expect(await saleToken.balanceOf(buyer3.address)).to.eq(
        web3.utils.toWei("500")
      );

      await sale.connect(buyer5).withdrawTokens(1);
      expect(await saleToken.balanceOf(buyer5.address)).to.eq(
        web3.utils.toWei("500")
      );
    });
  });
});

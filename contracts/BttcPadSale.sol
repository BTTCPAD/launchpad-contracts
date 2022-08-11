// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ISalesFactory.sol";
import "./IAllocationStaking.sol";

import "hardhat/console.sol";

interface IERC20Extented is IERC20 {
    function decimals() external view returns (uint8);
}

contract BttcPadSale {
    using SafeERC20 for IERC20Extented;

    IAllocationStaking public allocationStakingContract;
    ISalesFactory public factory;
    IERC20Extented public USDCToken =
        IERC20Extented(0xC0e296da19bBdcf960291C7AEf02c9F24D6fA1fd);

    struct FirstRound {
        uint256 startTime;
        uint256 endTime;
        uint256 minDeposit;
    }

    struct SecondRound {
        uint256 startTime;
        uint256 endTime;
        uint256 minDeposit;
        uint256 maxDeposit;
    }

    struct Sale {
        IERC20Extented token;
        bool isCreated;
        bool earningsWithdrawn;
        bool leftoverWithdrawn;
        address saleOwner;
        uint256 tokenPriceInUSDC;
        uint256 amountOfTokensToSell;
        uint256 totalUSDCRaised;
        uint256 tokensUnlockTime;
        FirstRound firstRound;
        SecondRound secondRound;
        bool isFirstRoundCalculated;
    }

    struct Participation {
        uint256 amountPaid;
        uint256 timeParticipated;
        uint256 tierId;
        bool isTokenLeftWithdrawn;
        bool[] isPortionWithdrawn;
    }

    struct Buy {
        uint256 amountPaid;
        bool isTokenLeftWithdrawn;
        bool[] isPortionWithdrawn;
    }

    struct Tier {
        uint256 participants;
        uint256 tierWeight;
        uint256 USDCDeposited;
        uint256 minToStake;
        uint256 maxToStake;
        bool isLottery;
        address[] lotteryWallets;
    }

    struct WhitelistUser {
        address userAddress;
        uint256 userTierId;
        bool isAllowed;
    }

    struct Registration {
        uint256 registrationTimeStarts;
        uint256 registrationTimeEnds;
        uint256 numberOfRegistrants;
    }

    Sale public sale;
    Registration public registration;

    address public admin;

    bool tokensDeposited;

    uint256 public numOfParticipants;
    mapping(address => Participation) public userToParticipation;
    mapping(address => bool) public isParticipated;
    uint256 tokensRemaining;

    uint256 public numOfBuyers;
    mapping(address => Buy) public userToBuy;
    mapping(address => bool) public isBuyer;

    mapping(address => WhitelistUser) public whitelist;

    uint256[] public vestingPortionsUnlockTime;
    uint256[] public vestingPercentPerPortion;

    Tier[] public tierIdToTier;
    uint256 public totalTierWeight;

    modifier onlySaleOwner() {
        require(msg.sender == sale.saleOwner, "OnlySaleOwner");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    constructor(address _admin, address _allocationStaking) {
        require(_admin != address(0));
        require(_allocationStaking != address(0));
        admin = _admin;
        factory = ISalesFactory(msg.sender);
        allocationStakingContract = IAllocationStaking(_allocationStaking);
    }

    function setVestingParams(
        uint256[] memory _unlockingTimes,
        uint256[] memory _percents
    ) external onlyAdmin {
        require(
            vestingPercentPerPortion.length == 0 &&
                vestingPortionsUnlockTime.length == 0,
            "Vesting params are already set"
        );
        require(
            _unlockingTimes.length == _percents.length,
            "Parameters should have same length"
        );
        require(sale.isCreated, "Sale params are not set");

        uint256 sum;

        for (uint256 i = 0; i < _unlockingTimes.length; i++) {
            vestingPortionsUnlockTime.push(_unlockingTimes[i]);
            vestingPercentPerPortion.push(_percents[i]);
            sum += _percents[i];
        }

        require(sum == 100, "Percent distribution issue");
    }

    function setSaleParams(
        address _token,
        address _saleOwner,
        uint256 _tokenPriceInUSDC,
        uint256 _amountOfTokensToSell,
        uint256 _firstRoundStart,
        uint256 _firstRoundEnd,
        uint256 _secondRoundStart,
        uint256 _secondRoundEnd,
        uint256 _firstRoundMinDeposit,
        uint256 _secondRoundMinDeposit,
        uint256 _secondRoundMaxDeposit,
        uint256 _tokensUnlockTime
    ) external onlyAdmin {
        require(!sale.isCreated, "Sale already created");
        require(_saleOwner != address(0), "owner can`t be 0");
        require(_tokenPriceInUSDC != 0, "Token price should be greater than 0");
        require(
            _amountOfTokensToSell != 0,
            "Amount to sell should be greater than 0"
        );
        require(
            _firstRoundEnd > block.timestamp,
            "First round end time should be in the future"
        );
        require(
            _tokensUnlockTime > block.timestamp,
            "Token unlock time should be in the future"
        );

        sale.token = IERC20Extented(_token);
        sale.isCreated = true;
        sale.saleOwner = _saleOwner;
        sale.tokenPriceInUSDC = _tokenPriceInUSDC;
        sale.amountOfTokensToSell = _amountOfTokensToSell;
        sale.tokensUnlockTime = _tokensUnlockTime;
        sale.firstRound = FirstRound({
            startTime: _firstRoundStart,
            endTime: _firstRoundEnd,
            minDeposit: _firstRoundMinDeposit
        });
        sale.secondRound = SecondRound({
            startTime: _secondRoundStart,
            endTime: _secondRoundEnd,
            minDeposit: _secondRoundMinDeposit,
            maxDeposit: _secondRoundMaxDeposit
        });
    }

    function setRegistrationTime(
        uint256 _registrationTimeStarts,
        uint256 _registrationTimeEnds
    ) external onlyAdmin {
        require(sale.isCreated, "Sale params are not set");
        require(
            _registrationTimeStarts >= block.timestamp,
            "Registration start time should be after current time"
        );
        require(
            _registrationTimeEnds > _registrationTimeStarts,
            "Registration end time should be after start time"
        );
        require(
            _registrationTimeEnds < sale.firstRound.endTime,
            "Registration end time should be before sale end"
        );

        registration.registrationTimeStarts = _registrationTimeStarts;
        registration.registrationTimeEnds = _registrationTimeEnds;
    }

    function registerForSale() public {
        uint256 stakeAmount = allocationStakingContract.deposited(msg.sender);

        require(tierIdToTier.length > 0, "Need to set Tiers");
        require(
            tierIdToTier[0].minToStake <= stakeAmount,
            "Need to stake minimum for current sale"
        );
        require(
            whitelist[msg.sender].userAddress != msg.sender,
            "You are registered"
        );
        require(
            block.timestamp >= registration.registrationTimeStarts &&
                block.timestamp <= registration.registrationTimeEnds,
            "Register is closed"
        );

        for (uint256 i = 0; i < tierIdToTier.length; i++) {
            Tier storage t = tierIdToTier[i];
            if (t.minToStake <= stakeAmount && t.maxToStake > stakeAmount) {
                WhitelistUser memory u = WhitelistUser({
                    userAddress: msg.sender,
                    userTierId: i,
                    isAllowed: true
                });

                if (t.isLottery) {
                    t.lotteryWallets.push(msg.sender);
                    u.isAllowed = false;
                }

                whitelist[msg.sender] = u;
                registration.numberOfRegistrants++;
                break;
            }
        }
    }

    function updateTokenPriceInUSDC(uint256 price) external onlyAdmin {
        require(price > 0, "Price == 0");
        require(sale.firstRound.startTime > block.timestamp, "Sale started");
        sale.tokenPriceInUSDC = price;
    }

    function setWhitelistUsers(address[] calldata users, uint256 tierId)
        public
        payable
        onlyAdmin
    {
        for (uint256 i = 0; i < users.length; i++) {
            WhitelistUser memory u = WhitelistUser({
                userAddress: users[i],
                userTierId: tierId,
                isAllowed: true
            });
            whitelist[users[i]] = u;
        }
    }

    function addTiers(
        uint256[] calldata tierWeights,
        uint256[] calldata tierPoints,
        bool[] calldata isLottery
    ) public onlyAdmin {
        require(tierWeights.length > 0, "Need 1 tier");
        require(
            tierWeights.length == tierPoints.length,
            "Need to be same length"
        );
        require(
            tierWeights.length == isLottery.length,
            "Need to be same length"
        );

        for (uint256 i = 0; i < tierWeights.length; i++) {
            require(tierWeights[i] > 0, "Weight should be greater than 0");

            totalTierWeight = totalTierWeight + tierWeights[i];

            uint256 maxToStake = tierPoints.length - 1 > i
                ? tierPoints[i + 1]
                : 2**256 - 1;

            Tier memory t = Tier({
                participants: 0,
                tierWeight: tierWeights[i],
                USDCDeposited: 0,
                minToStake: tierPoints[i],
                maxToStake: maxToStake,
                isLottery: isLottery[i],
                lotteryWallets: new address[](0)
            });
            tierIdToTier.push(t);
        }
    }

    function depositTokens() external onlySaleOwner {
        require(!tokensDeposited, "Deposit only once");
        tokensDeposited = true;
        sale.token.safeTransferFrom(
            msg.sender,
            address(this),
            sale.amountOfTokensToSell
        );
    }

    function participate(uint256 amount) external payable {
        require(sale.isCreated, "Sale not created");
        require(
            block.timestamp >= sale.firstRound.startTime &&
                block.timestamp <= sale.firstRound.endTime,
            "First round is not active"
        );
        require(!isParticipated[msg.sender], "Participate only once");

        require(msg.sender == tx.origin, "Only direct calls");

        require(amount > 0, "Can't buy 0 tokens");
        require(
            (amount / (10**USDCToken.decimals())) % 2 == 0,
            "Amount need to be divide by 2"
        );
        require(
            amount >= sale.firstRound.minDeposit,
            "Can't deposit less than minimum"
        );

        require(
            whitelist[msg.sender].userAddress != address(0),
            "User must be in white list"
        );
        require(whitelist[msg.sender].isAllowed, "You can't access sale");

        uint256 _tierId = whitelist[msg.sender].userTierId;
        sale.totalUSDCRaised = sale.totalUSDCRaised + amount;

        bool[] memory _isPortionWithdrawn = new bool[](
            vestingPortionsUnlockTime.length
        );

        Participation memory p = Participation({
            amountPaid: amount,
            timeParticipated: block.timestamp,
            tierId: _tierId,
            isTokenLeftWithdrawn: false,
            isPortionWithdrawn: _isPortionWithdrawn
        });

        Tier storage t = tierIdToTier[_tierId];

        t.participants = t.participants + 1;
        t.USDCDeposited = t.USDCDeposited + amount;
        userToParticipation[msg.sender] = p;
        isParticipated[msg.sender] = true;
        numOfParticipants++;

        USDCToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function buy(uint256 amount) external payable {
        require(sale.isFirstRoundCalculated, "First round not calculated yet");
        require(
            block.timestamp >= sale.secondRound.startTime &&
                block.timestamp <= sale.secondRound.endTime,
            "Second round is not active"
        );
        require(msg.sender == tx.origin, "Only direct calls");
        require(amount > 0, "Can't buy 0 tokens");
        require(
            (amount / (10**USDCToken.decimals())) % 2 == 0,
            "Amount need to be divide by 2"
        );

        require(
            amount >= sale.secondRound.minDeposit,
            "Can't deposit less than minimum"
        );

        uint256 tokenAmount = (amount / sale.tokenPriceInUSDC) *
            10**sale.token.decimals();

        require(tokenAmount <= tokensRemaining, "Not enough tokens remaining");

        if (isBuyer[msg.sender]) {
            Buy storage b = userToBuy[msg.sender];

            require(
                b.amountPaid + amount < sale.secondRound.maxDeposit,
                "Can't deposit more than maximum"
            );

            b.amountPaid = b.amountPaid + amount;
        } else {
            require(
                amount < sale.secondRound.maxDeposit,
                "Can't deposit more than maximum"
            );

            bool[] memory _isPortionWithdrawn = new bool[](
                vestingPortionsUnlockTime.length
            );

            Buy memory b = Buy({
                amountPaid: amount,
                isTokenLeftWithdrawn: false,
                isPortionWithdrawn: _isPortionWithdrawn
            });

            userToBuy[msg.sender] = b;
            isBuyer[msg.sender] = true;
            numOfBuyers++;
        }

        sale.totalUSDCRaised = sale.totalUSDCRaised + amount;
        tokensRemaining = tokensRemaining - tokenAmount;

        USDCToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdrawTokens(uint256 portionId) external {
        require(
            block.timestamp >= sale.tokensUnlockTime,
            "Tokens cann`t be withdrawn"
        );
        require(
            portionId < vestingPercentPerPortion.length,
            "Invalid portion ID"
        );
        require(
            vestingPortionsUnlockTime[portionId] <= block.timestamp,
            "Portion not unlocked"
        );

        uint256 amountToWithdraw = 0;

        if (isParticipated[msg.sender]) {
            Participation storage p = userToParticipation[msg.sender];

            if (!p.isTokenLeftWithdrawn) {
                withdrawLeftoverForUser(msg.sender);
                p.isTokenLeftWithdrawn = true;
            }

            if (!p.isPortionWithdrawn[portionId]) {
                p.isPortionWithdrawn[portionId] = true;
                uint256 amountFirstRound = calculateAmountWithdrawing(
                    msg.sender,
                    vestingPercentPerPortion[portionId]
                );
                amountToWithdraw = amountToWithdraw + amountFirstRound;
            }
        }

        if (isBuyer[msg.sender]) {
            Buy storage b = userToBuy[msg.sender];
            if (!b.isPortionWithdrawn[portionId]) {
                b.isPortionWithdrawn[portionId] = true;
                uint256 amountSecondRound = ((b.amountPaid /
                    sale.tokenPriceInUSDC) *
                    10**sale.token.decimals() *
                    vestingPercentPerPortion[portionId]) / 100;
                amountToWithdraw = amountToWithdraw + amountSecondRound;
            }
        }

        if (amountToWithdraw > 0) {
            sale.token.safeTransfer(msg.sender, amountToWithdraw);
        }
    }

    function withdrawLeftoverForUser(address userAddress) internal {
        Participation memory p = userToParticipation[userAddress];

        uint256 tokensForUser = calculateAmountWithdrawing(userAddress, 100);

        uint256 leftover = p.amountPaid -
            (tokensForUser * sale.tokenPriceInUSDC) /
            10**sale.token.decimals();

        if (leftover > 0) {
            USDCToken.safeTransfer(msg.sender, leftover);
        }
    }

    function withdrawMultiplePortions(uint256[] calldata portionIds) external {
        uint256 totalToWithdraw = 0;

        if (isParticipated[msg.sender]) {
            Participation storage p = userToParticipation[msg.sender];

            if (!p.isTokenLeftWithdrawn) {
                withdrawLeftoverForUser(msg.sender);
                p.isTokenLeftWithdrawn = true;
            }

            for (uint256 i = 0; i < portionIds.length; i++) {
                uint256 portionId = portionIds[i];
                require(portionId < vestingPercentPerPortion.length);

                if (
                    !p.isPortionWithdrawn[portionId] &&
                    vestingPortionsUnlockTime[portionId] <= block.timestamp
                ) {
                    p.isPortionWithdrawn[portionId] = true;
                    uint256 amountWithdrawing = calculateAmountWithdrawing(
                        msg.sender,
                        vestingPercentPerPortion[portionId]
                    );
                    totalToWithdraw = totalToWithdraw + amountWithdrawing;
                }
            }
        }

        if (isBuyer[msg.sender]) {
            Buy storage b = userToBuy[msg.sender];

            for (uint256 i = 0; i < portionIds.length; i++) {
                uint256 portionId = portionIds[i];
                require(portionId < vestingPercentPerPortion.length);

                if (
                    !b.isPortionWithdrawn[portionId] &&
                    vestingPortionsUnlockTime[portionId] <= block.timestamp
                ) {
                    b.isPortionWithdrawn[portionId] = true;
                    uint256 amountWithdrawing = ((b.amountPaid /
                        sale.tokenPriceInUSDC) *
                        10**sale.token.decimals() *
                        vestingPercentPerPortion[portionId]) / 100;
                    totalToWithdraw = totalToWithdraw + amountWithdrawing;
                }
            }
        }

        if (totalToWithdraw > 0) {
            sale.token.safeTransfer(msg.sender, totalToWithdraw);
        }
    }

    function withdrawEarnings() external onlySaleOwner {
        withdrawEarningsInternal();
    }

    function withdrawLeftover() external onlySaleOwner {
        withdrawLeftoverInternal();
    }

    function withdrawEarningsInternal() internal {
        require(
            block.timestamp >= sale.secondRound.endTime,
            "Sale not finished"
        );
        require(!sale.earningsWithdrawn, "Earnings already withdrawn");
        require(sale.isFirstRoundCalculated, "First round not caculated yet");
        sale.earningsWithdrawn = true;
        uint256 totalProfit = ((sale.amountOfTokensToSell - tokensRemaining) *
            sale.tokenPriceInUSDC) / 10**sale.token.decimals();
        USDCToken.safeTransfer(msg.sender, totalProfit);
    }

    function withdrawLeftoverInternal() internal {
        require(
            block.timestamp >= sale.secondRound.endTime,
            "Sale not finished"
        );
        require(!sale.leftoverWithdrawn, "Leftover already withdrawn");
        require(sale.isFirstRoundCalculated, "First round not caculated yet");
        sale.leftoverWithdrawn = true;
        if (tokensRemaining > 0) {
            sale.token.safeTransfer(msg.sender, tokensRemaining);
        }
    }

    function calculateFirstRoundSale() public onlyAdmin {
        require(
            block.timestamp > sale.firstRound.endTime,
            "First round is not finished"
        );
        require(!sale.isFirstRoundCalculated, "Already calculated");

        uint256 totalTokensSold = 0;

        for (uint256 i = 0; i < tierIdToTier.length; i++) {
            Tier memory t = tierIdToTier[i];

            uint256 tokensPerTier = (t.tierWeight * sale.amountOfTokensToSell) /
                totalTierWeight;

            if (
                (tokensPerTier * sale.tokenPriceInUSDC) /
                    10**sale.token.decimals() <=
                t.USDCDeposited
            ) {
                totalTokensSold = totalTokensSold + tokensPerTier;
            } else {
                totalTokensSold =
                    totalTokensSold +
                    (t.USDCDeposited / sale.tokenPriceInUSDC) *
                    10**sale.token.decimals();
            }
        }

        tokensRemaining = sale.amountOfTokensToSell - totalTokensSold;
        sale.isFirstRoundCalculated = true;
    }

    function isWhitelisted() external view returns (bool) {
        return (whitelist[msg.sender].userAddress == msg.sender);
    }

    function getVestingInfo()
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        return (vestingPortionsUnlockTime, vestingPercentPerPortion);
    }

    function calculateAmountWithdrawing(
        address userAddress,
        uint256 tokenPercent
    ) internal view returns (uint256) {
        Participation memory p = userToParticipation[userAddress];
        Tier memory t = tierIdToTier[uint256(p.tierId)];

        uint256 tokensForUser = 0;
        uint256 tokensPerTier = (t.tierWeight * sale.amountOfTokensToSell) /
            totalTierWeight;
        uint256 maximunTokensForUser = (tokensPerTier * tokenPercent) /
            t.participants /
            100;
        uint256 userTokenWish = ((p.amountPaid / sale.tokenPriceInUSDC) *
            (10**sale.token.decimals()) *
            tokenPercent) / 100;

        if (maximunTokensForUser >= userTokenWish) {
            tokensForUser = userTokenWish;
        } else {
            tokensForUser = maximunTokensForUser;
        }

        return (tokensForUser);
    }

    function calculateAmountWithdrawingPortionPub(
        address userAddress,
        uint256 tokenPercent
    ) public view returns (uint256) {
        Participation memory p = userToParticipation[userAddress];
        Tier memory t = tierIdToTier[uint256(p.tierId)];

        uint256 tokensPerTier = (t.tierWeight * sale.amountOfTokensToSell) /
            totalTierWeight;
        uint256 tokensForUser = (tokensPerTier * tokenPercent) /
            t.participants /
            100;
        return (tokensForUser);
    }

    function random(uint256 number) private view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp + number,
                        block.difficulty + number,
                        msg.sender
                    )
                )
            ) % number;
    }

    function remove(uint256 tierId, uint256 index) private {
        Tier storage tier = tierIdToTier[tierId];
        tier.lotteryWallets[index] = tier.lotteryWallets[
            tier.lotteryWallets.length - 1
        ];
        tier.lotteryWallets.pop();
    }

    function runLottery(uint256 tierId, uint256 numberOfWinners)
        public
        onlyAdmin
    {
        Tier storage tier = tierIdToTier[tierId];

        require(tier.isLottery, "Lottery is not available for this tier");
        require(
            numberOfWinners <= tier.lotteryWallets.length,
            "Too many winners"
        );
        require(
            block.timestamp > registration.registrationTimeEnds,
            "Lottery should run after registration ends"
        );

        for (uint256 i = 0; i < numberOfWinners; i++) {
            uint256 rand = random(tier.lotteryWallets.length);
            WhitelistUser memory u = whitelist[tier.lotteryWallets[rand]];
            u.isAllowed = true;
            whitelist[tier.lotteryWallets[rand]] = u;
            remove(tierId, rand);
        }
    }

    // DEV
    function setUSDCTokenAddress(address _address) public onlyAdmin {
        USDCToken = IERC20Extented(_address);
    }

    function getLotteryWallets(uint256 tierId) public view returns (uint256) {
        return tierIdToTier[tierId].lotteryWallets.length;
    }
}

// const BTTCPAD = require("./BTTCPAD.json");
// const BTTCPAD_Test_Registration = require("./BTTCPAD_Test_Registration.json");
// const BTTCPAD_Test_FirstRound = require("./donau_sales/BTTCPAD_Test_FirstRound.json");
// const currentSale = require("./donau_sales/TBED_3_4_5.json");
// const currentSale = require("./donau_sales/Test_1019_1.json");
const currentSale = require("./donau_sales/MCK_2.json");

const admin = "0xDc8bAAb2B29aE7A494882108bF924eb4C3f8DAA5";
const BTP = "0x1286Ae70D5e5F795A6f6Ba140a04A6E07cAb1FAB";
const USDC = "0xeb2347A838cF4B351bF95dc56fB874D108E0Ac39";
const factory = "0x6AF5D67e5c245A5a29A7A1be65D8516ada1061aa";
const staking = "0x400b025297349Fd2d289c4fda32821ddE39d0d88";

module.exports = {
  admin,
  BTP,
  USDC,
  factory,
  staking,
  saleConfig: currentSale,
};

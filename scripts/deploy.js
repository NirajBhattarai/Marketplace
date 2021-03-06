// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  

  const ExchangeV4 = await hre.ethers.getContractFactory("ExchangeV4");
  const exchangeV4 = await ExchangeV4.deploy();

  await exchangeV4.deployed();

  console.log("ExchangeV4 with 1 ETH deployed to:", exchangeV4.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

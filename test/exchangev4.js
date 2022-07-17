const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let ExchangeV4;
let deployedMarketplace;
let TestNft;
let deployedTestNft;

let totalTokenToBeDistributed = (200000000 * 10 ** 18).toLocaleString(
  "fullwide",
  {
    useGrouping: false
  }
);

describe("NFTMarketPlace", function () {
  beforeEach(async () => {
    ExchangeV4 = await ethers.getContractFactory("ExchangeV4");
    deployedMarketplace = await ExchangeV4.deploy();
    TestNft = await ethers.getContractFactory("TestNft");
    deployedTestNft = await TestNft.deploy();
  });

  it("Change Owner of MarketPlace", async function () {
    const [owner, addr1] = await ethers.getSigners();
    let exchangeOwner = await deployedMarketplace.owner();
    expect(owner.address).equal(exchangeOwner);

    await deployedMarketplace.transferOwnership(addr1.address);
    exchangeOwner = await deployedMarketplace.owner();
    expect(addr1.address).equal(exchangeOwner);
  });

  it("Fill Sell Order When nft Owner sign to sell", async function () {
    
    // Todo Write testcase to fillSellOrder Method
  });

});

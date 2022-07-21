const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { utils, constants } = require("ethers");

let totalTokenToBeDistributed = (200000000 * 10 ** 18).toLocaleString(
  "fullwide",
  {
    useGrouping: false
  }
);

describe("NFTMarketPlace", function () {
  let marketplace;
  let testNFT;
  let erc20;
  let secondERC20;
  let cancellationRegistry;
  let exchangeRegistry;
  let paymentERC20Registry;
  let owner, addr1, maker;
  const initialBalance = utils.parseEther('10000');
  let simpleERC20Params = {
    name: "Tether",
    symbol: "USDT",
  };

  let secondERC20Params = {
    name: "USD Coin",
    symbol: "USDC",
  }
  const sellOrderTypes = {
    SellOrder: [
      { name: "seller", type: "address" },
      { name: "contractAddress", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "expiration", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "createdAtBlockNumber", type: "uint256" },
      { name: "paymentERC20", type: "address" }
    ]
  };

  beforeEach(async function() {
    [owner, addr1, maker] = await ethers.getSigners();
    const ExchangeV4 = await ethers.getContractFactory("ExchangeV4");
    marketplace = await ExchangeV4.deploy();
    await marketplace.deployed();
  });

  it("Change Owner of MarketPlace", async function () {
    let exchangeOwner = await marketplace.owner();
    expect(owner.address).equal(exchangeOwner);
    
    await marketplace.transferOwnership(addr1.address);
    exchangeOwner = await marketplace.owner();
    expect(addr1.address).equal(exchangeOwner);
  });

  describe("Fill Sell Order When nft Owner sign to sell", function () {
    beforeEach(async function() {
      const TestNft = await ethers.getContractFactory("TestNft");
      testNFT = await TestNft.deploy();
      await testNFT.deployed();
      await testNFT.mintToken(owner.address);

      const ERC20 = await ethers.getContractFactory("SimpleERC20");
      erc20 = await ERC20.deploy(...Object.values(simpleERC20Params));
      await erc20.deployed();

      secondERC20 = await ERC20.deploy(...Object.values(secondERC20Params));
      await secondERC20.deployed();

      const CancellationRegistry = await ethers.getContractFactory("CancellationRegistry");
      cancellationRegistry = await CancellationRegistry.deploy();
      await cancellationRegistry.deployed();

      const ExchangeRegistry = await ethers.getContractFactory("ExchangeRegistry");
      exchangeRegistry = await ExchangeRegistry.deploy();
      await exchangeRegistry.deployed();

      const PaymentERC20Registry = await ethers.getContractFactory("PaymentERC20Registry");
      paymentERC20Registry = await PaymentERC20Registry.deploy();
      await paymentERC20Registry.deployed();

      await marketplace.setMakerWallet(
        maker.address
      );
      await marketplace.setRegistryContracts(
        exchangeRegistry.address,
        cancellationRegistry.address,
        paymentERC20Registry.address
      );
    })

    it("Check ETH amount of the transaction", async function () {
      // Todo Write testcase to fillSellOrder Method
      // SellOrder(,address paymentERC20)
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1658338153,
        expiration: 1658938153,
        price: 5,
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: constants.AddressZero
      }
      const signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await expect(marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        0,
        1658338153,
        1658938153,
        5,
        1,
        currentBlockNumber,
        constants.AddressZero,
        signature,
        addr1.address
      )).to.be.revertedWith("Transaction doesn't have the required ETH amount.");
    });

    it("Check ERC20 token approval by Registry", async function () {
      // Todo Write testcase to fillSellOrder Method
      // SellOrder(,address paymentERC20)
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1658338153,
        expiration: 1658938153,
        price: utils.parseEther('10'),
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: erc20.address
      }
      const signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await expect(marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        0,
        1658338153,
        1658938153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Payment ERC20 is not approved.");
    });

    it("Check ERC20 token balance of buyer", async function () {
      // Todo Write testcase to fillSellOrder Method
      // SellOrder(,address paymentERC20)
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1658338153,
        expiration: 1658938153,
        price: utils.parseEther('10'),
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: erc20.address
      }
      const signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await paymentERC20Registry.addApprovedERC20(erc20.address);
      await expect(marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        0,
        1658338153,
        1658938153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Buyer has an insufficient balance of the ERC20.");
    });
  
    it("Check ERC20 token approval from buyer to exchange", async function () {
      // Todo Write testcase to fillSellOrder Method
      // SellOrder(,address paymentERC20)
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1658338153,
        expiration: 1658938153,
        price: utils.parseEther('10'),
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: erc20.address
      }
      const signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await paymentERC20Registry.addApprovedERC20(erc20.address);
      await erc20.mint(addr1.address, initialBalance);
      await expect(marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        0,
        1658338153,
        1658938153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Exchange is not approved to handle a sufficient amount of the ERC20.");
    });

    it("Check signature validation", async function () {
      // Todo Write testcase to fillSellOrder Method
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1658338153,
        expiration: 1658938153,
        price: utils.parseEther('10'),
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: erc20.address
      }
      const signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await paymentERC20Registry.addApprovedERC20(erc20.address);
      await erc20.mint(addr1.address, initialBalance);
      await erc20.connect(addr1).approve(marketplace.address, initialBalance);
      await expect(marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        1,
        1658338153,
        1658938153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Signature is not valid for SellOrder.");
    });

    it("Check signature validation", async function () {
      // Todo Write testcase to fillSellOrder Method

      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1658338153,
        expiration: 1658938153,
        price: utils.parseEther('10'),
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: erc20.address
      }
      const signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await paymentERC20Registry.addApprovedERC20(erc20.address);
      await erc20.mint(addr1.address, initialBalance);
      await erc20.connect(addr1).approve(marketplace.address, initialBalance);
      await expect(marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        1,
        1658338153,
        1658938153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Signature is not valid for SellOrder.");
    });
  })
});

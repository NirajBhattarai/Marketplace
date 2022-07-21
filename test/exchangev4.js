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
  let currentTime;

  beforeEach(async function() {
    [owner, addr1, maker] = await ethers.getSigners();
    const ExchangeV4 = await ethers.getContractFactory("ExchangeV4");
    marketplace = await ExchangeV4.deploy();
    await marketplace.deployed();
    currentTime = Math.floor(Date.now() / 1000) - 100;
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
      currentTime = Math.floor(Date.now() / 1000) - 100;
    })

    it("Check ETH amount of the transaction", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
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
        currentTime,
        currentTime + 10 ** 6,
        5,
        1,
        currentBlockNumber,
        constants.AddressZero,
        signature,
        addr1.address
      )).to.be.revertedWith("Transaction doesn't have the required ETH amount.");
    });

    it("Check ERC20 token approval by Registry", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
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
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Payment ERC20 is not approved.");
    });

    it("Check ERC20 token balance of buyer", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
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
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Buyer has an insufficient balance of the ERC20.");
    });
  
    it("Check ERC20 token approval from buyer to exchange", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
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
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Exchange is not approved to handle a sufficient amount of the ERC20.");
    });

    it("Check signature validation", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
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
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("Signature is not valid for SellOrder.");
    });

    it("Check cancelled order", async function () {
      await cancellationRegistry.addRegistrant(owner.address);
      await cancellationRegistry.cancelPreviousSellOrders(
        owner.address,
        testNFT.address,
        0
      );

      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
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
        0,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("This order has been cancelled.");
    });

    it("Check sell order time - future start time", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime + 10 ** 6,
        expiration: 1669638153,
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
        0,
        currentTime + 10 ** 6,
        1669638153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("SellOrder start time is in the future.");
    });

    it("Check sell order time - expired time", async function () {
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: 1657338153,
        expiration: 1657838153,
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
        0,
        1657338153,
        1657838153,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("This sell order has expired.");
    });

    it("Check NFT allowance", async function () {
      await cancellationRegistry.addRegistrant(marketplace.address);
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
        
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
        0,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("The Exchange is not approved to operate this NFT");
    });

    it("Check NFT Contract validation", async function () {
      await cancellationRegistry.addRegistrant(marketplace.address);
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: secondERC20.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
        
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
      await testNFT.setApprovalForAll(marketplace.address, true);
      await expect(marketplace.fillSellOrder(
        owner.address,
        secondERC20.address,
        0,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      )).to.be.revertedWith("We don't recognize the NFT as either an ERC721 or ERC1155.");
    });
  
    it("Successful NFT Transfer", async function () {
      await cancellationRegistry.addRegistrant(marketplace.address);
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      const sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
        
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
      await testNFT.setApprovalForAll(marketplace.address, true);
      const prevBalance = await erc20.balanceOf(addr1.address);
      await marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        0,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      );
      const predictBalance = ethers.BigNumber.from(prevBalance).sub(utils.parseEther('10'));
      expect(await erc20.balanceOf(addr1.address)).to.equal(predictBalance);
    });

    it("Irregular NFT Transfer - multiple times", async function () {
      await cancellationRegistry.addRegistrant(marketplace.address);
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      let sellOrder = {
        seller: owner.address,
        contractAddress: testNFT.address,
        tokenId: 0,
        startTime: currentTime,
        expiration: currentTime + 10 ** 6,
        
        price: utils.parseEther('10'),
        quantity: 1,
        createdAtBlockNumber: currentBlockNumber,
        paymentERC20: erc20.address
      }
      let signature = await owner._signTypedData(
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
      await testNFT.setApprovalForAll(marketplace.address, true);
      await testNFT.mintToken(owner.address);
      await testNFT.mintToken(owner.address);
      const prevBalance = await erc20.balanceOf(addr1.address);
      await marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        0,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      );
      sellOrder.tokenId = 1;
      signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        1,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      );
      sellOrder.tokenId = 2;
      signature = await owner._signTypedData(
        {
          name: "Pocket Of Quarters",
          version: "4"
        },
        sellOrderTypes,
        sellOrder
      );
      await marketplace.fillSellOrder(
        owner.address,
        testNFT.address,
        2,
        currentTime,
        currentTime + 10 ** 6,
        utils.parseEther('10'),
        1,
        currentBlockNumber,
        erc20.address,
        signature,
        addr1.address
      );
      const predictBalance = ethers.BigNumber.from(prevBalance).sub(utils.parseEther('30'));
      expect(await erc20.balanceOf(addr1.address)).to.equal(predictBalance);
    });
  })
});

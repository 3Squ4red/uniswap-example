const { expect } = require("chai");
const { ethers } = require("hardhat");

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const DAI_DECIMALS = 18;
const SwapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const ercAbi = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() public payable",
  "function approve(address spender, uint256 amount) returns (bool)",
];

describe("SimpleSwap", function () {
  it("Should provide a caller with more DAI than they started with after a swap", async function () {
    /* Deploy the SimpleSwap contract */
    console.log("Deploying SimpleSwap...");
    const simpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await simpleSwapFactory.deploy(SwapRouterAddress);
    await simpleSwap.deployed();
    console.log(`SimpleSwap deployed at ${simpleSwap.address}`);

    /* Connect to weth9 and wrap some eth  */
    console.log("\nGetting 10 WETH...");
    let signers = await hre.ethers.getSigners();
    const WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signers[0]);
    const deposit = await WETH.deposit({
      value: hre.ethers.utils.parseEther("10"),
    });
    await deposit.wait();
    console.log(`Got 10 WETH into account ${signers[0].address}`);
    console.log(`Got 10 WETH into account ${signers[0].address}`);

    /* Check Initial DAI Balance */
    console.log(
      `\nChecking initial DAI and WETH balance of ${signers[0].address}...`
    );
    const DAI = new hre.ethers.Contract(DAI_ADDRESS, ercAbi, signers[0]);
    let beforeWETHBalance = await WETH.balanceOf(signers[0].address);
    beforeWETHBalance = Number(
      hre.ethers.utils.formatUnits(beforeWETHBalance, DAI_DECIMALS)
    );
    let beforeDAIBalance = await DAI.balanceOf(signers[0].address);
    beforeDAIBalance = Number(
      hre.ethers.utils.formatUnits(beforeDAIBalance, DAI_DECIMALS)
    );
    console.log(`Initial WETH balance: ${beforeWETHBalance}`);
    console.log(`Initial DAI balance: ${beforeDAIBalance}`);

    /* Approve the swapper contract to spend weth9 for me */
    console.log("\nApproving SimpleSwap to spend my 10 WETH...");
    await WETH.approve(simpleSwap.address, hre.ethers.utils.parseEther("10"));
    console.log("Approved");

    /* Execute the swap */
    console.log("\nSwapping 5 WETH for DAI...");
    const amountIn = hre.ethers.utils.parseEther("5");
    const swap = await simpleSwap.swapWETHForDAI(amountIn);
    swap.wait();
    console.log("Swap done!!!");

    /* Check DAI end balance */
    console.log(
      `\nChecking final DAI and WETH balance of ${signers[0].address}...`
    );
    let afterWETHBalance = await WETH.balanceOf(signers[0].address);
    afterWETHBalance = Number(
      hre.ethers.utils.formatUnits(afterWETHBalance, DAI_DECIMALS)
    );
    let afterDAIBalance = await DAI.balanceOf(signers[0].address);
    afterDAIBalance = Number(
      hre.ethers.utils.formatUnits(afterDAIBalance, DAI_DECIMALS)
    );
    console.log(`Final WETH balance: ${afterWETHBalance}`);
    console.log(
      `Final DAI balance: ${afterDAIBalance}\n\tWETH difference: ${
        beforeWETHBalance - afterWETHBalance
      }\n\tDAI difference: ${afterDAIBalance - beforeDAIBalance}\n`
    );

    /* Test that we now have more DAI than when we started */
    expect(afterWETHBalance).is.lessThan(beforeWETHBalance);
    expect(afterDAIBalance).is.greaterThan(beforeDAIBalance);
  });
});

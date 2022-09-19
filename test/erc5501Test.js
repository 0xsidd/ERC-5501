const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC55501", function () {
  let erc5501;
  let signers;
  let zero_address = "0x0000000000000000000000000000000000000000";

  async function initialization(){
    await erc5501.connect(signers[0]).safeMint(signers[0].address);
    await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,true);
  }

  beforeEach(async()=>{
    signers = await ethers.getSigners();
    const ERC55501 = await ethers.getContractFactory("ERC5501");
    erc5501 = await ERC55501.connect(signers[0]).deploy("MyToken","MTK");
    await erc5501.deployed();
  });

  describe("ERC55501 functions",async()=>{
    describe("safemint",async()=>{
      it("should mint tokens to given address",async()=>{
        await erc5501.connect(signers[0]).safeMint(signers[0].address);
        expect(await erc5501.balanceOf(signers[0].address)).to.equal(1);
      });
    });

    describe("setUser",async()=>{
      it("Should return user of NFT",async()=>{
        await initialization();
        expect(await erc5501.userOf(1)).to.equal(signers[1].address);
      });
      it("Should rent nft with isBorrowed flag true",async()=>{
        await initialization()
        expect(await erc5501.userOf(1)).to.equal(signers[1].address);
      });
      it("Should rent nft with isBorrowed flag false",async()=>{
        await erc5501.connect(signers[0]).safeMint(signers[0].address);
        await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,false);
        expect(await erc5501.userOf(1)).to.equal(signers[1].address);
      });
      it("Should set user after borrow expire",async()=>{
        await erc5501.connect(signers[0]).safeMint(signers[0].address);
        await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,false);
        await network.provider.send("evm_increaseTime", [500]);
        await network.provider.send("evm_mine");
        await erc5501.connect(signers[0]).setUser(1,signers[2].address,100,false);
        await expect(await erc5501.userOf(1)).to.equal(signers[2].address);
      });
      it("User is reset if NFT is not borrowed and transferred", async function () {
        await erc5501.connect(signers[0]).safeMint(signers[0].address);
        await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,false);
        erc5501["safeTransferFrom(address,address,uint256)"](signers[0].address,signers[2].address,1);
        await expect(await erc5501.ownerOf(1)).to.equal(signers[2].address);
        await expect(erc5501.userOf(1)).to.be.revertedWith('ERC5501: user does not exist for this token');
      });

      it("User is not reset if NFT is borrowed and transferred", async function () {
        await erc5501.connect(signers[0]).safeMint(signers[0].address);
        await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,true);
        erc5501["safeTransferFrom(address,address,uint256)"](signers[0].address,signers[2].address,1);
        await expect(await erc5501.ownerOf(1)).to.equal(signers[2].address);
        await expect(await erc5501.userOf(1)).to.equal(signers[1].address);
      });

      it("Should terminate if both user and owner sets borrowed flag", async function () {
        await erc5501.connect(signers[0]).safeMint(signers[0].address);
        await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,true);
        await erc5501.connect(signers[1]).setBorrowTermination(1);
        await erc5501.connect(signers[0]).setBorrowTermination(1);
        await erc5501.connect(signers[0]).terminateBorrow(1);
        await expect(await erc5501.userIsBorrowed(1)).to.equal(false);
      });
    });
    describe("userOf",async()=>{
      it("should return current user of tokenId",async()=>{
        await initialization()
        expect(await erc5501.userOf(1)).to.equal(signers[1].address);
      })
    });

    describe("userBalanceOf",async()=>{
      it("should return current user of tokenId",async()=>{
        await initialization()
        expect(await erc5501.userBalanceOf(signers[1].address)).to.equal(1);
      })
    });
  });
    describe("function reverts",async()=>{
      describe("safeMint reverts",async()=>{
        it("mint to zero address",async()=>{
          await expect(erc5501.connect(signers[0]).safeMint(zero_address)).to.be.revertedWith("ERC721: mint to the zero address");
        });
      });
  
      describe("setUser reverts",async()=>{
        it("Other than owner sets user",async()=>{
          await erc5501.connect(signers[0]).safeMint(signers[0].address);
          await expect(erc5501.connect(signers[1]).setUser(1,signers[1].address,10,true)).to.be.revertedWith("ERC5501: set user caller is not token owner or approved");
        });
        it("Token should not be already borrowed", async function () {
          await erc5501.connect(signers[0]).safeMint(signers[0].address);
          await erc5501.connect(signers[0]).setUser(1,signers[1].address,100,true);
          await expect(erc5501.connect(signers[0]).setUser(1,signers[2].address,100,false)).to.be.revertedWith("ERC5501: token is borrowed");
        });
        it("Revert for address(0) user balance", async function () {
          await erc5501.connect(signers[0]).safeMint(signers[0].address);
          await expect(erc5501.connect(signers[0]).userBalanceOf(zero_address)).to.be.revertedWith("ERC5501Balance: address zero is not a valid owner");
        });
      });
  
      describe("userOf reverts",async()=>{
        it("Revert if user doesnt exists for token Id", async function () {
          await erc5501.connect(signers[0]).safeMint(signers[0].address);
          await expect(erc5501.connect(signers[0]).userOf(1)).to.be.revertedWith("ERC5501: user does not exist for this token");
        });
        it("should return address zero after expiry time is passed", async function () {
          await initialization();
          await network.provider.send("evm_increaseTime", [500]);
          await network.provider.send("evm_mine");
          await expect(erc5501.connect(signers[0]).userOf(1)).to.be.revertedWith("ERC5501: user does not exist for this token");
        });
      });
      describe("userBalanceOf reverts",async()=>{
        it("Revert if user doesnt exists for token Id", async function () {
          await erc5501.connect(signers[0]).safeMint(signers[0].address);
          await expect(erc5501.connect(signers[0]).userBalanceOf(zero_address)).to.be.revertedWith("ERC5501Balance: address zero is not a valid owner");
        });
      });  
    });
    
});

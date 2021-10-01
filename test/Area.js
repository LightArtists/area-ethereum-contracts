const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Area = artifacts.require('Area');
const PlusCodesMock = artifacts.require('PlusCodesMock');

contract('Area', function (accounts) {
  const [team, aBuyer, anotherBuyer] = accounts;
  const inventorySize = new BN('100');
  const teamAllocation = new BN('20');
  const pricePerPack = new BN('17');
  const packSize = new BN('10');
  const name = 'Area';
  const symbol = 'AREA';
  const baseURI = 'https://example.com/';
  const priceToSplit = new BN('22');

  beforeEach(async function () {
    this.area = await Area.new(
      inventorySize,
      teamAllocation,
      pricePerPack,
      packSize,
      name,
      symbol,
      baseURI,
      priceToSplit,
      { from: team },
    );
    expect(await this.area.owner()).is.equal(team);
  });

  context('before sale starts', function () {
    it('does not sell anything', async function () {
      const benevolence = new BN(0);
      await expectRevert(
        this.area.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack }),
        'The sale did not begin yet',
      );
    });
  });

  context('while sale is going', function () {
    beforeEach(async function () {
      await this.area.beginSale({ from: team });
    });

    it('does not let team take code length 2 tokens', async function () {
      const indexFromOne = new BN('15');
      await expectRevert(
        this.area.mintWaterAndIceReserve(team, indexFromOne, { from: team }),
        'Cannot take during sale',
      );
    });

    it('does not let team take code length 4 tokens', async function () {
      const qty = new BN(20);
      await expectRevert(
        this.area.mintTeamAllocation(team, qty, { from: team }),
        'Cannot take during sale',
      );
    });

    it('lets the team reveal tokens', async function () {
      const benevolence = new BN(0);
      await this.area.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });

      const teamBenevolence = new BN(10);
      const tx = await this.area.reveal(teamBenevolence, { from: team });
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.area.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation).sub(packSize));
      expect(gotQueueCount).to.bignumber.equal('0');
      expect(gotSetAside).to.bignumber.equal(teamAllocation);
      expectEvent(tx, 'Transfer', { to: aBuyer });
    });

    it('lets the team take value', async function () {
      const benevolence = new BN(0);
      await this.area.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
      await this.area.withdrawBalance({ from: team });
      expect(true).to.equal(true);
    });

    it('does not let random people reveal tokens', async function () {
      const benevolence = new BN(0);
      await this.area.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });

      const teamBenevolence = new BN(10);
      await expectRevert(
        this.area.reveal(teamBenevolence, { from: anotherBuyer }),
        'Ownable: caller is not the owner',
      );
    });

    it('does not let random people take value', async function () {
      const benevolence = new BN(0);
      await this.area.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });

      await expectRevert(
        this.area.withdrawBalance({ from: anotherBuyer }),
        'Ownable: caller is not the owner',
      );
    });
  });

  context('when all are sold out, and administrator revealed', function () {
    beforeEach(async function () {
      await this.area.beginSale({ from: team });
    });

    beforeEach(async function () {
      const packsAvailableForSale = inventorySize.sub(teamAllocation).div(packSize);
      const benevolence = new BN(0);
      for (let i = 0; i < parseInt(packsAvailableForSale.toString()); i++) {
        await this.area.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
      }
      const adminBenevolence = new BN(10);
      await this.area.reveal(adminBenevolence, { from: team });
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.area.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal('0');
      expect(gotQueueCount).to.bignumber.equal('0');
      expect(gotSetAside).to.bignumber.equal(teamAllocation);
    });

    it('lets team take code length 2 tokens', async function () {
      const plusCodes = await PlusCodesMock.new();
      const indexFromOne = new BN('15');
      const tx = await this.area.mintWaterAndIceReserve(team, indexFromOne, { from: team });
      await expectEvent(tx, 'Transfer', { to: team });
      const tokenId = tx.logs[0].args.tokenId;
      expect(await plusCodes.getCodeLength(tokenId)).to.bignumber.equal('2');
    });

    it('does not let team take same code length 2 token twice', async function () {
      const indexFromOne = new BN('15');
      const tx = await this.area.mintWaterAndIceReserve(team, indexFromOne, { from: team });
      await expectEvent(tx, 'Transfer', { to: team });
      await expectRevert(
        this.area.mintWaterAndIceReserve(team, indexFromOne, { from: team }),
        'ERC721: token already minted',
      );
    });

    it('lets does not let team take same code length 2 token twice, even after split', async function () {
      const indexFromOne = new BN('15');
      const tx = await this.area.mintWaterAndIceReserve(team, indexFromOne, { from: team });
      const tokenId = tx.logs[0].args.tokenId;
      await this.area.split(tokenId, { from: team, value: priceToSplit });
      await expectRevert(
        this.area.mintWaterAndIceReserve(team, indexFromOne, { from: team }),
        'AreaNFT: token already minted',
      );
    });

    it('lets team take code length 4 tokens', async function () {
      const plusCodes = await PlusCodesMock.new();
      const qty = new BN(20);
      const tx = await this.area.mintTeamAllocation(team, qty, { from: team });
      await expectEvent(tx, 'Transfer', { to: team });

      expect(new BN(tx.logs.length.toString())).to.bignumber.equal(qty);
      tx.logs.forEach(async log => {
        expect(log.event).to.equal('Transfer');
        expect(log.args.to).to.equal(team);
        const tokenId = log.args.tokenId;
        expect(await plusCodes.getCodeLength(tokenId)).to.bignumber.equal('4');
      });
    });
  });

  it('sends value when withdrawing'); // Test this manually

  it('it allows team to take all team tokens after sold out'); // Test this manually
});

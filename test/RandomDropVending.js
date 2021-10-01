const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { network } = require('hardhat');

const RandomDropVendingMock = artifacts.require('RandomDropVendingMock');
const RobotBuyerContractMock = artifacts.require('RobotBuyerContractMock');
const RobotBuyerSpellMock = artifacts.require('RobotBuyerSpellMock');

contract('RandomDropVending', function (accounts) {
  const inventorySize = new BN('100');
  const teamAllocation = new BN('20');
  const pricePerPack = new BN('1');
  const packSize = new BN('10');
  const [team, aBuyer, anotherBuyer] = accounts;

  beforeEach(async function () {
    this.vending = await RandomDropVendingMock.new(inventorySize, teamAllocation, pricePerPack, packSize);
  });

  context('before sale starts', function () {
    it('does not sell anything', async function () {
      const benevolence = new BN(0);
      await expectRevert(
        this.vending.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack }),
        'The sale did not begin yet',
      );
    });
  });

  context('just after deploying, and begin', function () {
    beforeEach(async function () {
      await this.vending.beginSale({ from: team });
    });

    it('is ready for sale', async function () {
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation));
      expect(gotQueueCount).to.bignumber.equal('0');
      expect(gotSetAside).to.bignumber.equal(teamAllocation);
    });
  });

  context('when making first commit (single commit in a block)', function () {
    beforeEach(async function () {
      await this.vending.beginSale({ from: team });
    });

    it('can commit without benevolence', async function () {
      const benevolence = new BN(0);
      const tx = await this.vending.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation).sub(packSize));
      expect(gotQueueCount).to.bignumber.equal(packSize);
      expect(gotSetAside).to.bignumber.equal(teamAllocation);
      expectEvent.notEmitted(tx, 'RevealCallback');
    });

    it('can commit with benevolence', async function () {
      const benevolence = new BN(1);
      const tx = await this.vending.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation).sub(packSize));
      expect(gotQueueCount).to.bignumber.equal(packSize);
      expect(gotSetAside).to.bignumber.equal(teamAllocation);
      expectEvent.notEmitted(tx, 'RevealCallback');
    });

    context('after committed', function () {
      beforeEach(async function () {
        const benevolence = new BN(0);
        await this.vending.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
      });

      it('is revealed by the next commit without benevolence', async function () {
        const benevolence = new BN(0);
        const tx = await this.vending.purchaseTokensAndReveal(benevolence, { value: pricePerPack });
        const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
        expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation).sub(packSize.muln(2)));
        expect(gotQueueCount).to.bignumber.equal(packSize);
        expect(gotSetAside).to.bignumber.equal(teamAllocation);
        expectEvent(tx, 'RevealCallback', { recipient: aBuyer });

        const purchasedLogs = tx.logs.filter(log => log.event === 'RevealCallback');
        expect(new BN(purchasedLogs.length)).to.bignumber.equal(packSize);
        purchasedLogs.forEach(log => {
          expect(log.args.recipient).to.equal(aBuyer);
          expect(log.args.allocation).to.bignumber.at.least('1');
          expect(log.args.allocation).to.bignumber.at.most(inventorySize);
        });
      });

      it('is revealed by the next commit with benevolence', async function () {
        const benevolence = new BN(1);
        const tx = await this.vending.purchaseTokensAndReveal(benevolence, { value: pricePerPack });
        const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
        expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation).sub(packSize.muln(2)));
        expect(gotQueueCount).to.bignumber.equal(packSize);
        expect(gotSetAside).to.bignumber.equal(teamAllocation);
        expectEvent(tx, 'RevealCallback', { recipient: aBuyer });

        const purchasedLogs = tx.logs.filter(log => log.event === 'RevealCallback');
        expect(new BN(purchasedLogs.length)).to.bignumber.equal(packSize);
        purchasedLogs.forEach(log => {
          expect(log.args.recipient).to.equal(aBuyer);
          expect(log.args.allocation).to.bignumber.at.least('1');
          expect(log.args.allocation).to.bignumber.at.most(inventorySize);
        });
      });

      it('is revealed by administrator', async function () {
        const benevolence = new BN(10);
        const tx = await this.vending.reveal(benevolence);
        const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
        expect(gotInventoryForSale).to.bignumber.equal(inventorySize.sub(teamAllocation).sub(packSize));
        expect(gotQueueCount).to.bignumber.equal('0');
        expect(gotSetAside).to.bignumber.equal(teamAllocation);
        expectEvent(tx, 'RevealCallback', { recipient: aBuyer });

        expect(tx.logs.length).to.equal(parseInt(packSize.toString()));
        tx.logs.forEach(log => {
          expect(log.args.recipient).to.equal(aBuyer);
          expect(log.args.allocation).to.bignumber.at.least('1');
          expect(log.args.allocation).to.bignumber.at.most(inventorySize);
        });
      });
    });
  });

  // It seems these tests must be run manually as our automated testing tools do not suuport this
  // eslint-disable-next-line max-len
  // https://github.com/SuperFarmDAO/SuperFarm-Contracts/blob/99d43a417d4c6f567835f8fe5eb5a8d9eae40c0e/test/Token.test.js#L198-L199
  context.skip('when making first two commits (two commits in same block)', function () {
    beforeEach(async function () {
      await this.vending.beginSale({ from: team });
    });

    it('can commit without benevolence');

    it('can commit with benevolence');

    context('after committed', function () {
      beforeEach(async function () {
        const benevolence = new BN(0);
        await network.provider.send('evm_setAutomine', [false]);
        await this.vending.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
        await this.vending.purchaseTokensAndReveal(benevolence, { from: anotherBuyer, value: pricePerPack });
        await network.provider.send('evm_setAutomine', [true]);
        await network.provider.send('evm_mine');
      });

      it('first is revealed by the next commit without benevolence');

      it('reveals on the next commit with benevolence');

      it('first revealed by administrator with some benevolence');

      it('first and some of next are revealed by administrator with some benevolence');

      it('reveals both with administrator benevolence');
    });
  });

  context('when all are sold out, and administrator revealed', function () {
    beforeEach(async function () {
      await this.vending.beginSale({ from: team });

      const packsAvailableForSale = inventorySize.sub(teamAllocation).div(packSize);
      const benevolence = new BN(0);
      for (let i = 0; i < parseInt(packsAvailableForSale.toString()); i++) {
        await this.vending.purchaseTokensAndReveal(benevolence, { from: aBuyer, value: pricePerPack });
      }
      const adminBenevolence = new BN(10);
      await this.vending.reveal(adminBenevolence);
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal('0');
      expect(gotQueueCount).to.bignumber.equal('0');
      expect(gotSetAside).to.bignumber.equal(teamAllocation);
    });

    it('does not let any more to be sold', async function () {
      const benevolence = new BN(0);
      const callOptions = { from: aBuyer, value: pricePerPack };
      await expectRevert(
        this.vending.purchaseTokensAndReveal(benevolence, callOptions),
        'Sold out',
      );
    });

    it('allows team to take tokens', async function () {
      const tx = await this.vending.takeTeamAllocation(team, packSize);
      expectEvent(tx, 'RevealCallback', { recipient: team });

      expect(new BN(tx.logs.length.toString())).to.bignumber.equal(packSize);
      tx.logs.forEach(log => {
        expect(log.args.recipient).to.equal(team);
        expect(log.args.allocation).to.bignumber.at.least('1');
        expect(log.args.allocation).to.bignumber.at.most(inventorySize);
      });
    });

    it('allows team to assign tokens to someone else', async function () {
      const tx = await this.vending.takeTeamAllocation(anotherBuyer, packSize);
      expectEvent(tx, 'RevealCallback', { recipient: anotherBuyer });

      expect(new BN(tx.logs.length.toString())).to.bignumber.equal(packSize);
      tx.logs.forEach(log => {
        expect(log.args.recipient).to.equal(anotherBuyer);
        expect(log.args.allocation).to.bignumber.at.least('1');
        expect(log.args.allocation).to.bignumber.at.most(inventorySize);
      });
    });

    it('limits team to take only the remaining tokens', async function () {
      const packsAvailableToTake = teamAllocation.div(packSize);
      for (let i = 0; i < parseInt(packsAvailableToTake.toString()); i++) {
        await this.vending.takeTeamAllocation(team, packSize);
      }
      const { 0: gotInventoryForSale, 1: gotQueueCount, 2: gotSetAside } = await this.vending.dropStatistics();
      expect(gotInventoryForSale).to.bignumber.equal('0');
      expect(gotQueueCount).to.bignumber.equal('0');
      expect(gotSetAside).to.bignumber.equal('0');
      await expectRevert(this.vending.takeTeamAllocation(team, packSize), 'Not enough to take');
    });
  });

  context('before sold out', function () {
    beforeEach(async function () {
      await this.vending.beginSale({ from: team });
    });

    it('disallows team from taking any tokens', async function () {
      await expectRevert(this.vending.takeTeamAllocation(team, packSize), 'Cannot take during sale');
    });
  });

  context('it only allows human buyers', function () {
    beforeEach(async function () {
      await this.vending.beginSale({ from: team });
    });

    it('disallows robot contract buyers', async function () {
      const callOptions = { from: aBuyer, value: pricePerPack };
      const robot = await RobotBuyerContractMock.new(this.vending.address, pricePerPack, callOptions);
      await expectRevert(robot.buy(), 'Only externally-owned accounts are eligible to purchase');
    });

    it('disallows robot spell buyers', async function () {
      const callOptions = { from: aBuyer, value: pricePerPack };
      await expectRevert(RobotBuyerSpellMock.new(this.vending.address, pricePerPack, callOptions), 'Only external');
    });
  });
});

const { expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const CommitQueue = artifacts.require('CommitQueueMock');

contract('CommitQueue', function (accounts) {
  beforeEach(async function () {
    this.commitQueue = await CommitQueue.new();
  });

  describe('putting in a then b then c', async function () {
    beforeEach(async function () {
      await this.commitQueue.enqueue(accounts[0], 1);
      await this.commitQueue.enqueue(accounts[1], 1);
      await this.commitQueue.enqueue(accounts[2], 1);
    });

    it('gets a, then b, then c', async function () {
      let tx;
      tx = await this.commitQueue.dequeue();
      expect(tx.receipt.logs[0].args.beneficiary).to.equal(accounts[0]);
      tx = await this.commitQueue.dequeue();
      expect(tx.receipt.logs[0].args.beneficiary).to.equal(accounts[1]);
      tx = await this.commitQueue.dequeue();
      expect(tx.receipt.logs[0].args.beneficiary).to.equal(accounts[2]);
    });

    it('is mature after entered', async function () {
      expect(await this.commitQueue.isMature()).to.equal(true);
    });

    it('is not mature when depleted', async function () {
      await this.commitQueue.dequeue();
      await this.commitQueue.dequeue();
      await this.commitQueue.dequeue();
      expect(await this.commitQueue.isMature()).to.equal(false);
    });

    it('reverts when dequeuing when depleted', async function () {
      await this.commitQueue.dequeue();
      await this.commitQueue.dequeue();
      await this.commitQueue.dequeue();
      await expectRevert(this.commitQueue.dequeue(), 'Queue is empty');
    });

    it('counts how many things are inside', async function () {
      expect(await this.commitQueue.count()).to.bignumber.equal('3');
      await this.commitQueue.dequeue();
      expect(await this.commitQueue.count()).to.bignumber.equal('2');
      await this.commitQueue.dequeue();
      expect(await this.commitQueue.count()).to.bignumber.equal('1');
    });
  });
});

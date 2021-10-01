const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const LazyArray = artifacts.require('LazyArrayMock');

contract('LazyArray', function (accounts) {
  beforeEach(async function () {
    this.lazyArray = await LazyArray.new();
  });

  describe('can initialize', async function () {
    it('initializes to 1', async function () {
      const length = new BN(1);
      await this.lazyArray.initialize(length);
      expect(await this.lazyArray.getByIndex(length - 1)).to.bignumber.equal(length);
    });

    it('initializes to 999', async function () {
      const length = new BN(999);
      await this.lazyArray.initialize(length);
      expect(await this.lazyArray.getByIndex(length - 1)).to.bignumber.equal(length);
    });

    it('initializes to 0', async function () {
      const length = new BN(0);
      await this.lazyArray.initialize(length);
      await expectRevert(this.lazyArray.getByIndex(new BN(0)), 'Out of bounds');
    });
  });

  describe('can pop from middle', async function () {
    function expectIsASetFromOneToLength (arrayOfNumbers) {
      const set = new Set(arrayOfNumbers);
      for (let i = 1; i <= set.size; i++) {
        expect(set.has(i)).to.equal(true);
      }
    }

    it('pops from middle of 3', async function () {
      const length = new BN(3);
      const oneToPop = new BN(1);
      await this.lazyArray.initialize(length);
      const items = [];
      const tx = await this.lazyArray.popByIndex(oneToPop);
      items.push(parseInt(tx.receipt.logs[0].args.popped.toString()));
      for (let i = 0; i < length - 1; i++) {
        const tx = await this.lazyArray.popByIndex(0);
        items.push(parseInt(tx.receipt.logs[0].args.popped.toString()));
      }
      expectIsASetFromOneToLength(items);
    });

    it('pops from middle of 100', async function () {
      const length = new BN(100);
      const oneToPop = new BN(50);
      await this.lazyArray.initialize(length);
      const items = [];
      const tx = await this.lazyArray.popByIndex(oneToPop);
      items.push(parseInt(tx.receipt.logs[0].args.popped.toString()));
      for (let i = 0; i < length - 1; i++) {
        const tx = await this.lazyArray.popByIndex(0);
        items.push(parseInt(tx.receipt.logs[0].args.popped.toString()));
      }
      expectIsASetFromOneToLength(items);
    });

    it('counts the items inside', async function () {
      const length = new BN(100);
      await this.lazyArray.initialize(length);
      expect(await this.lazyArray.count()).to.bignumber.equal('100');
      const oneToPop = new BN(50);
      await this.lazyArray.popByIndex(oneToPop);
      expect(await this.lazyArray.count()).to.bignumber.equal('99');
    });
  });
});

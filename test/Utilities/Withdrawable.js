const { BN } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const hardhat = require('hardhat');

const Withdrawable = artifacts.require('WithdrawableMock');

contract('Withdrawable', function (accounts) {
  const [, , aBeneficiary] = accounts;

  beforeEach(async function () {
    this.withdrawable = await Withdrawable.new();
  });

  describe('when starting with a zero balance', function () {
    it('returns a balance of zero', async function () {
      expect(await this.withdrawable.pendingWithdrawal(aBeneficiary)).to.bignumber.equal('0');
    });

    it('increasing pending withdrawal sets that balance', async function () {
      const amount = new BN(15);

      await this.withdrawable.increasePendingWithdrawal(aBeneficiary, amount);
      expect(await this.withdrawable.pendingWithdrawal(aBeneficiary)).to.bignumber.equal(amount);
    });
  });

  describe('when starting with some balance', function () {
    // This number must be much larger than gas costs for transactions, see below
    const startingBalance = new BN('1000000000000000000'); // 1 Ether

    beforeEach(async function () {
      await this.withdrawable.increasePendingWithdrawal(aBeneficiary, startingBalance);
      await this.withdrawable.sendValue({ value: startingBalance });
      expect(await this.withdrawable.pendingWithdrawal(aBeneficiary)).to.bignumber.equal(startingBalance);
    });

    it('increasing pending withdrawal adds to that balance', async function () {
      const additionalBalance = new BN(1234);
      const totalAmount = startingBalance.add(additionalBalance);
      await this.withdrawable.increasePendingWithdrawal(aBeneficiary, additionalBalance);
      expect(await this.withdrawable.pendingWithdrawal(aBeneficiary)).to.bignumber.equal(totalAmount);
    });

    it('resets to zero when withdrawing', async function () {
      await this.withdrawable.withdraw({ from: aBeneficiary });
      expect(await this.withdrawable.pendingWithdrawal(aBeneficiary)).to.bignumber.equal(new BN(0));
    });

    it('sends value when withdrawing', async function () {
      /*
      async function getBalance (account) {
        return new BN(await network.provider.send('eth_getBalance', [account]));
      }
      */

      async function getBalance (account) {
        return new BN(await hardhat.web3.eth.getBalance(account));
      }

      // const beneficiaryStartingValue = await provider.getBalance(aBeneficiary);
      const beneficiaryStartingValue = await getBalance(aBeneficiary);
      const gasCostUpperBound = new BN('10000000000000000'); // 0.01 Ether
      const beneficiaryExpectedMinimumEndValue = beneficiaryStartingValue.add(startingBalance).sub(gasCostUpperBound);
      await this.withdrawable.withdraw({ from: aBeneficiary });
      expect(await this.withdrawable.pendingWithdrawal(aBeneficiary)).to.bignumber.equal(new BN(0));

      expect(await getBalance(aBeneficiary)).to.bignumber.greaterThan(beneficiaryExpectedMinimumEndValue);
    });
  });
});

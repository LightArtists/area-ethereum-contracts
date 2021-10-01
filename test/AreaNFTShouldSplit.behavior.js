const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const PlusCodesMock = artifacts.require('PlusCodesMock');

function shouldSplit (parentCodeASCII, aChildCodeASCII, priceToSplit, owner, someoneElse) {
  const parentPlusCode = new BN(Buffer.from(parentCodeASCII).toString('hex'), 16);
  const aChildPlusCode = new BN(Buffer.from(aChildCodeASCII).toString('hex'), 16);

  describe('splitting ' + parentCodeASCII, function () {
    beforeEach(async function () {
      this.plusCodes = await PlusCodesMock.new();
      await this.token.mint(owner, parentPlusCode);
      expect(await this.token.balanceOf(owner)).to.bignumber.equal('1');
      expect(await this.token.exists(parentPlusCode)).to.equal(true);
      expect(await this.plusCodes.getParent(aChildPlusCode)).to.bignumber.equal(parentPlusCode);
    });

    it('is a valid child', async function () {
      expect(await this.plusCodes.getParent(aChildPlusCode)).to.bignumber.equal(parentPlusCode);
    });

    context('when the splitter is not approved or the owner', async function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.split(parentPlusCode, { from: someoneElse, value: priceToSplit }),
          'AreaNFT: split caller is not owner nor approved',
        );
      });
    });

    context('when the splitter is the owner', async function () {
      describe('when splitting', async function () {
        this.beforeEach(async function () {
          this.split = await this.token.split(parentPlusCode, { from: owner, value: priceToSplit });
        });

        it('splits into 20 or 400 tokens', async function () {
          expect(await this.token.balanceOf(owner)).to.satisfy(function (num) {
            return num.eq(new BN('20')) || num.eq(new BN('400'));
          });
          let countOfLogs = 0;
          this.split.logs.forEach(log => {
            if (log.event === 'Transfer' && log.args[0] === ZERO_ADDRESS) {
              countOfLogs++;
            }
          });
          expect(countOfLogs).to.satisfy(function (num) {
            return num === 20 || num === 400;
          });
        });

        it('no longer exists the parent token', async function () {
          expect(await this.token.exists(parentPlusCode)).to.equal(false);
        });

        it('no longer owns the parent token', async function () {
          await expectRevert(this.token.ownerOf(parentPlusCode), 'AreaNFT: owner query for invalid (split) token');
        });

        it('exists a new child token', async function () {
          expect(await this.token.exists(aChildPlusCode)).to.equal(true);
        });

        it('owns a new child token', async function () {
          expect(await this.token.ownerOf(aChildPlusCode)).to.equal(owner);
        });
      });
    });
  });
}

module.exports = {
  shouldSplit,
};

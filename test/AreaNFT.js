const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const {
  shouldBehaveLikeERC721,
  shouldBehaveLikeERC721Metadata,
} = require('./Vendor/openzeppelin-contracts-d3c5bdf4def690228b08e0ac431437288a50e64a/token/ERC721/ERC721.behavior');
const {
  shouldSplit,
} = require('./AreaNFTShouldSplit.behavior');

const AreaNFTMock = artifacts.require('AreaNFTMock');

contract('AreaNFT', function (accounts) {
  const name = 'Non Fungible Token';
  const symbol = 'NFT';
  const urlBase = 'https://example.com/';
  const otherUrlBase = 'https://other.example.com/';
  const priceToSplit = new BN('100');
  const [owner] = accounts;

  beforeEach(async function () {
    this.token = await AreaNFTMock.new(name, symbol, urlBase, priceToSplit);
  });

  context('as a normal ERC-721', function () {
    shouldBehaveLikeERC721('AreaNFT', ...accounts);
    shouldBehaveLikeERC721Metadata('AreaNFT', name, symbol, ...accounts);
  });

  context('split(uint256)', function () {
    shouldSplit('22000000+', '22CC0000+', priceToSplit, ...accounts);
    shouldSplit('22CC0000+', '22CC3300+', priceToSplit, ...accounts);
    shouldSplit('22CC3300+', '22CC3322+', priceToSplit, ...accounts);
    shouldSplit('22CC3322+', '22CC3322+33', priceToSplit, ...accounts);
    shouldSplit('22CC3322+33', '22CC3322+332', priceToSplit, ...accounts);
    shouldSplit('22CC3322+332', '22CC3322+3322', priceToSplit, ...accounts);

    it('should fail to split a level 12 code', async function () {
      const parentPlusCodeASCII = '22CC3322+3322';
      const parentPlusCode = new BN(Buffer.from(parentPlusCodeASCII).toString('hex'), 16);

      await this.token.mint(owner, parentPlusCode);
      expect(await this.token.balanceOf(owner)).to.bignumber.equal('1');
      expect(await this.token.exists(parentPlusCode)).to.equal(true);

      await expectRevert(
        this.token.split(parentPlusCode, { from: owner, value: priceToSplit }),
        'Plus Codes with code length greater than 12 not supported',
      );
    });
  });

  context('setBaseURI', function () {
    it('should use that URI for tokens', async function () {
      await this.token.setBaseURI(otherUrlBase);
      const parentPlusCodeASCII = '22CC3322+3322';
      const parentPlusCode = new BN(Buffer.from(parentPlusCodeASCII).toString('hex'), 16);
      await this.token.mint(owner, parentPlusCode);
      const tokenURI = await this.token.tokenURI(parentPlusCode);
      expect(tokenURI.includes(otherUrlBase)).to.equal(true);
    });
  });
});

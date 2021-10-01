const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const NFTMarketplace = artifacts.require('NFTMarketplace');
const AreaNFTMock = artifacts.require('AreaNFTMock');

function expectOfferUpdatedToMatch (log, tokenId, expectedMarket) {
  expect(log.args.tokenId).to.bignumber.equal(tokenId);
  expect(log.args.offeror).to.equal(expectedMarket.offeror);
  expect(log.args.minimumOffer).to.bignumber.equal(expectedMarket.minimumOffer);
  expect(log.args.invitedBidder).to.equal(expectedMarket.invitedBidder);
}

function expectBidUpdatedToMatch (log, tokenId, expectedMarket) {
  expect(log.args.tokenId).to.bignumber.equal(tokenId);
  expect(log.args.bidder).to.equal(expectedMarket.bidder);
  expect(log.args.lockedBid).to.bignumber.equal(expectedMarket.lockedBid);
}

function expectTradedToMatch (log, tokenId, value, offeror, bidder) {
  expect(log.args.tokenId).to.bignumber.equal(tokenId);
  expect(log.args.value).to.bignumber.equal(value);
  expect(log.args.offeror).to.equal(offeror);
  expect(log.args.bidder).to.equal(bidder);
}

function expectTokenMarketToMatch (tokenMarket, expectedMarket) {
  expect(tokenMarket.offeror).to.equal(expectedMarket.offeror);
  expect(tokenMarket.minimumOffer).to.bignumber.equal(expectedMarket.minimumOffer);
  expect(tokenMarket.invitedBidder).to.equal(expectedMarket.invitedBidder);
  expect(tokenMarket.bidder).to.equal(expectedMarket.bidder);
  expect(tokenMarket.lockedBid).to.bignumber.equal(expectedMarket.lockedBid);
}

contract('NFTMarketplace', function (accounts) {
  const [owner, offeror, anotherOfferor, bidder, anotherBidder, randomPerson] = accounts;

  const name = 'Non Fungible Token';
  const symbol = 'NFT';
  const urlBase = 'https://example.com/';
  const priceToSplit = new BN('100');

  const initialFeePortion = new BN('5');

  const tokenIdASCII = '22CC3322+3322';
  const tokenId = new BN(Buffer.from(tokenIdASCII).toString('hex'), 16);

  const highPrice = new BN(10000000000);
  const fairPrice = new BN(100000);
  const lowPrice = new BN(10);

  it('owner lists for sale, then splits it or sells it'); // Test this manually
  it('then wants to cancel their offer'); // Test this manually
  it('and/or someone else wants to execute the offer'); // Test this manually

  beforeEach(async function () {
    this.token = await AreaNFTMock.new(name, symbol, urlBase, priceToSplit, { from: owner });
    this.marketplace = await NFTMarketplace.new(initialFeePortion, this.token.address, { from: owner });

    await this.token.mint(offeror, tokenId);
    await this.token.setApprovalForAll(this.marketplace.address, true, { from: offeror });
    this.expectedMarket = {
      offeror: ZERO_ADDRESS,
      minimumOffer: new BN(0),
      invitedBidder: ZERO_ADDRESS,
      bidder: ZERO_ADDRESS,
      lockedBid: new BN(0),
    };
  });

  describe('when no market exists for a token', function () {
    describe('when some random person tries to sell a token they don\'t own', function () {
      it('reverts', async function () {
        await expectRevert(
          this.marketplace.offer(tokenId, fairPrice, ZERO_ADDRESS, { from: randomPerson }),
          'Only the token owner can offer',
        );
      });
    });

    describe('when creating an offer for an invited bidder', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.offer(tokenId, fairPrice, bidder, { from: offeror });
        this.expectedMarket.offeror = offeror;
        this.expectedMarket.minimumOffer = fairPrice;
        this.expectedMarket.invitedBidder = bidder;
      });

      it('publishes the offer', async function () {
        const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
        expect(offerUpdatedLogs.length).to.equal(1);
        expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });

      describe('when revoking an offer', function () {
        this.beforeEach(async function () {
          this.tx = await this.marketplace.revokeOffer(tokenId, { from: offeror });
          this.expectedMarket.offeror = ZERO_ADDRESS;
          this.expectedMarket.minimumOffer = new BN(0);
          this.expectedMarket.invitedBidder = ZERO_ADDRESS;
        });

        it('publishes the offer revocation', async function () {
          const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
          expect(offerUpdatedLogs.length).to.equal(1);
          expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
          const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
          expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
        });
      });
    });

    describe('when revoking an offer', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.revokeOffer(tokenId, { from: offeror });
        this.expectedMarket.offeror = ZERO_ADDRESS;
        this.expectedMarket.minimumOffer = new BN(0);
        this.expectedMarket.invitedBidder = ZERO_ADDRESS;
      });

      it('publishes the offer revocation', async function () {
        const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
        expect(offerUpdatedLogs.length).to.equal(1);
        expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });
    });

    describe('when creating a bid', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.bid(tokenId, { from: bidder, value: fairPrice });
        this.expectedMarket.bidder = bidder;
        this.expectedMarket.lockedBid = fairPrice;
      });

      it('publishes the bid', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });

      describe('when revoking a bid', function () {
        this.beforeEach(async function () {
          this.tx = await this.marketplace.revokeBid(tokenId, { from: bidder });
          this.expectedMarket.bidder = ZERO_ADDRESS;
          this.expectedMarket.lockedBid = new BN(0);
        });

        it('publishes the bid revocation', async function () {
          const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
          expect(bidUpdatedLogs.length).to.equal(1);
          expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
          const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
          expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
        });

        it('creates a pending withdrawal', async function () {
          expect(await this.marketplace.pendingWithdrawal(bidder)).to.bignumber.equal(fairPrice);
        });
      });
    });

    describe('when revoking a bid', function () {
      it('reverts', async function () {
        await expectRevert(
          this.marketplace.revokeBid(tokenId, { from: bidder }),
          'Only the bidder may revoke their bid',
        );
      });
    });
  });

  describe('when an offer (for anybody) and no bid exists for a token', function () {
    this.beforeEach(async function () {
      this.tx = await this.marketplace.offer(tokenId, fairPrice, ZERO_ADDRESS, { from: offeror });
      this.expectedMarket.offeror = offeror;
      this.expectedMarket.minimumOffer = fairPrice;
      this.expectedMarket.invitedBidder = ZERO_ADDRESS;
    });

    describe('when creating an updated offer', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.offer(tokenId, highPrice, bidder, { from: offeror });
        this.expectedMarket.offeror = offeror;
        this.expectedMarket.minimumOffer = highPrice;
        this.expectedMarket.invitedBidder = bidder;
      });

      it('publishes the updated offer', async function () {
        const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
        expect(offerUpdatedLogs.length).to.equal(1);
        expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });
    });

    describe('when revoking an offer', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.revokeOffer(tokenId, { from: offeror });
        this.expectedMarket.offeror = ZERO_ADDRESS;
        this.expectedMarket.minimumOffer = new BN(0);
        this.expectedMarket.invitedBidder = ZERO_ADDRESS;
      });

      it('publishes the offer revocation', async function () {
        const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
        expect(offerUpdatedLogs.length).to.equal(1);
        expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });
    });

    describe('when creating a bid that intersects', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.bid(tokenId, { from: bidder, value: fairPrice });
        this.expectedMarket.offeror = ZERO_ADDRESS;
        this.expectedMarket.minimumOffer = new BN(0);
        this.expectedMarket.invitedBidder = ZERO_ADDRESS;
        this.expectedMarket.bidder = ZERO_ADDRESS;
        this.expectedMarket.lockedBid = new BN(0);
      });

      it('publishes the bid and trade', async function () {
        const tradedLogs = this.tx.receipt.logs.filter(log => log.event === 'Traded');
        expect(tradedLogs.length).to.equal(1);
        expectTradedToMatch(tradedLogs[0], tokenId, fairPrice, offeror, bidder);
        expect(await this.marketplace.pendingWithdrawal(offeror)).to.bignumber.greaterThan(new BN('0')); // because fee
      });
    });

    describe('when creating a bid that does not intersect', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.bid(tokenId, { from: bidder, value: lowPrice });
        this.expectedMarket.bidder = bidder;
        this.expectedMarket.lockedBid = lowPrice;
      });

      it('publishes the bid', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
      });

      describe('when revoking a bid', function () {
        this.beforeEach(async function () {
          this.tx = await this.marketplace.revokeBid(tokenId, { from: bidder });
          this.expectedMarket.bidder = ZERO_ADDRESS;
          this.expectedMarket.lockedBid = new BN(0);
        });

        it('publishes the bid revocation', async function () {
          const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
          expect(bidUpdatedLogs.length).to.equal(1);
          expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
          const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
          expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
        });
      });

      describe('when increasing the bid to intersect', function () {
        this.beforeEach(async function () {
          this.tx = await this.marketplace.bidIncrease(tokenId, { from: bidder, value: fairPrice.sub(lowPrice) });
          this.expectedMarket.bidder = bidder;
          this.expectedMarket.lockedBid = highPrice;
        });

        it('publishes the bid and trade', async function () {
          const tradedLogs = this.tx.receipt.logs.filter(log => log.event === 'Traded');
          expect(tradedLogs.length).to.equal(1);
          expectTradedToMatch(tradedLogs[0], tokenId, fairPrice, offeror, bidder);
          expect(await this.marketplace.pendingWithdrawal(offeror)).to.bignumber.greaterThan(new BN('0')); // minus fee
        });
      });
    });

    describe('when revoking a bid', function () {
      it('reverts', async function () {
        await expectRevert(
          this.marketplace.revokeBid(tokenId, { from: bidder }),
          'Only the bidder may revoke their bid',
        );
      });
    });

    describe('when the token transfers outside the marketplace to a new offeror', function () {
      this.beforeEach(async function () {
        this.tx = await this.token.transferFrom(offeror, anotherOfferor, tokenId, { from: offeror });
      });

      describe('when creating a bid that intersects', function () {
        this.beforeEach(async function () {
          this.tx = await this.marketplace.bid(tokenId, { from: bidder, value: fairPrice });
          this.expectedMarket.bidder = bidder;
          this.expectedMarket.lockedBid = fairPrice;
        });

        it('a trade does NOT happen', async function () {
          const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
          expect(bidUpdatedLogs.length).to.equal(1);
          expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
          const tradedLogs = this.tx.receipt.logs.filter(log => log.event === 'Traded');
          expect(tradedLogs.length).to.equal(0);
        });
      });
    });
  });

  describe('when a bid and no offer exists for a token', function () {
    this.beforeEach(async function () {
      this.tx = await this.marketplace.bid(tokenId, { from: bidder, value: fairPrice });
      this.expectedMarket.bidder = bidder;
      this.expectedMarket.lockedBid = fairPrice;
    });

    describe('when creating an offer that does not intersect', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.offer(tokenId, highPrice, ZERO_ADDRESS, { from: offeror });
        this.expectedMarket.offeror = offeror;
        this.expectedMarket.minimumOffer = highPrice;
        this.expectedMarket.invitedBidder = ZERO_ADDRESS;
      });

      it('publishes the offer', async function () {
        const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
        expect(offerUpdatedLogs.length).to.equal(1);
        expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });
    });

    describe('when creating an offer that does intersect', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.offer(tokenId, fairPrice, ZERO_ADDRESS, { from: offeror });
        this.expectedMarket.offeror = ZERO_ADDRESS;
        this.expectedMarket.minimumOffer = new BN(0);
        this.expectedMarket.invitedBidder = ZERO_ADDRESS;
        this.expectedMarket.bidder = ZERO_ADDRESS;
        this.expectedMarket.lockedBid = new BN(0);
      });

      it('publishes the trade and cleared out bid', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
        const tradedLogs = this.tx.receipt.logs.filter(log => log.event === 'Traded');
        expect(tradedLogs.length).to.equal(1);
        expectTradedToMatch(tradedLogs[0], tokenId, fairPrice, offeror, bidder);
      });
    });

    describe('when revoking an offer', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.revokeOffer(tokenId, { from: offeror });
        this.expectedMarket.offeror = ZERO_ADDRESS;
        this.expectedMarket.minimumOffer = new BN(0);
        this.expectedMarket.invitedBidder = ZERO_ADDRESS;
      });

      it('publishes the offer revocation', async function () {
        const offerUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'OfferUpdated');
        expect(offerUpdatedLogs.length).to.equal(1);
        expectOfferUpdatedToMatch(offerUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });
    });

    describe('when creating a better bid from same person', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.bid(tokenId, { from: bidder, value: highPrice });
        this.expectedMarket.bidder = bidder;
        this.expectedMarket.lockedBid = highPrice;
      });

      it('publishes the bid', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });

      it('creates a pending withdrawal', async function () {
        expect(await this.marketplace.pendingWithdrawal(bidder)).to.bignumber.equal(fairPrice);
      });
    });

    describe('when increasing the bid from same person', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.bidIncrease(tokenId, { from: bidder, value: highPrice.sub(fairPrice) });
        this.expectedMarket.bidder = bidder;
        this.expectedMarket.lockedBid = highPrice;
      });

      it('publishes the bid', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });

      it('does not create a pending withdrawal', async function () {
        expect(await this.marketplace.pendingWithdrawal(bidder)).to.bignumber.equal(new BN('0'));
      });
    });

    describe('when increasing the bid from a different person', function () {
      it('reverts', async function () {
        await expectRevert(
          this.marketplace.bidIncrease(tokenId, { from: anotherBidder, value: highPrice.sub(fairPrice) }),
          'You are not current bidder',
        );
      });
    });

    describe('when creating a better bid from a different person', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.bid(tokenId, { from: anotherBidder, value: highPrice });
        this.expectedMarket.bidder = anotherBidder;
        this.expectedMarket.lockedBid = highPrice;
      });

      it('publishes the bid', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });

      it('creates a pending withdrawal', async function () {
        expect(await this.marketplace.pendingWithdrawal(bidder)).to.bignumber.equal(fairPrice);
      });
    });

    describe('when revoking a bid', function () {
      this.beforeEach(async function () {
        this.tx = await this.marketplace.revokeBid(tokenId, { from: bidder });
        this.expectedMarket.bidder = ZERO_ADDRESS;
        this.expectedMarket.lockedBid = new BN(0);
      });

      it('publishes the bid revocation', async function () {
        const bidUpdatedLogs = this.tx.receipt.logs.filter(log => log.event === 'BidUpdated');
        expect(bidUpdatedLogs.length).to.equal(1);
        expectBidUpdatedToMatch(bidUpdatedLogs[0], tokenId, this.expectedMarket);
        const tokenMarket = await this.marketplace.tokenMarkets(tokenId);
        expectTokenMarketToMatch(tokenMarket, this.expectedMarket);
      });

      it('creates a pending withdrawal', async function () {
        expect(await this.marketplace.pendingWithdrawal(bidder)).to.bignumber.equal(fairPrice);
      });
    });
  });

  describe('when a bid and an offer (non-overlapping price) exist for a token', function () {
    describe('when creating an offer', function () {
      it('publishes the offer', async function () {
      });
    });

    describe('when revoking an offer', function () {
      it('publishes the offer revocation', async function () {
      });
    });

    describe('when creating a bid', function () {
      it('publishes the bid', async function () {
      });
    });

    describe('when revoking a bid', function () {
      it('publishes the bid revocation', async function () {
      });
    });
  });

  describe('when a bid and an offer (overlapping price, not invited bidder) exist for a token', function () {
    describe('when creating an offer', function () {
      it('publishes the offer', async function () {
      });
    });

    describe('when revoking an offer', function () {
      it('publishes the offer revocation', async function () {
      });
    });

    describe('when creating a bid', function () {
      it('publishes the bid', async function () {
      });
    });

    describe('when revoking a bid', function () {
      it('publishes the bid revocation', async function () {
      });
    });
  });

  describe('when a 10 Ether order goes through with a 10% fee', function () {
    const salePrice = new BN('10000000000000000000');
    const feePortionInBasisPoints = new BN('1000');
    const basisPointsDenominator = new BN('10000');

    beforeEach(async function () {
      await this.marketplace.setFeePortion(feePortionInBasisPoints, { from: owner });
      await this.marketplace.offer(tokenId, salePrice, ZERO_ADDRESS, { from: offeror });
      await this.marketplace.bid(tokenId, { from: bidder, value: salePrice });
    });

    it('sends the fee to owner', async function () {
      const feeExpected = salePrice.mul(feePortionInBasisPoints).div(basisPointsDenominator);
      const feeReceived = await this.marketplace.pendingWithdrawal(owner);
      expect(feeReceived).to.bignumber.equal(feeExpected);
    });

    it('sends the remained to offeror', async function () {
      const feeExpected = salePrice.mul(feePortionInBasisPoints).div(basisPointsDenominator);
      const proceedsExpected = salePrice.sub(feeExpected);
      const proceedsReceived = await this.marketplace.pendingWithdrawal(offeror);
      expect(proceedsReceived).to.bignumber.equal(proceedsExpected);
    });
  });

  describe('when changing fee portion', function () {
    it('can change to 10%', async function () {
      const feePortionInBasisPoints = new BN('1000');
      await this.marketplace.setFeePortion(feePortionInBasisPoints, { from: owner });
      expect(await this.marketplace.feePortion()).to.bignumber.equal(feePortionInBasisPoints);
    });

    it('cannot change above 10%', async function () {
      const feePortionInBasisPoints = new BN('2000');
      await expectRevert(
        this.marketplace.setFeePortion(feePortionInBasisPoints, { from: owner }),
        'Exceeded maximum fee portion of 10%',
      );
    });
  });
});

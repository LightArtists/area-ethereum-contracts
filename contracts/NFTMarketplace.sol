// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert

import "./Vendor/openzeppelin-contracts-3dadd40034961d5ca75fa209a4188b01d7129501/token/ERC721/IERC721.sol";
import "./Vendor/openzeppelin-contracts-3dadd40034961d5ca75fa209a4188b01d7129501/access/Ownable.sol";
import "./Utilities/Withdrawable.sol";

/// @title  Area marketplace contract, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice This decentralized marketplace matches bids and offers for one underlying ERC-721 contract. With much
///         respect to CryptoPunks. Your offers & bids on this marketplace will close only if matched on this
///         marketplace. If you trade anywhere else, consider to revoke your offers & bids here.
/// @author William Entriken
contract NFTMarketplace is Ownable, Withdrawable {
    struct TokenMarket {
        address offeror;       // The token owner that is selling
        uint256 minimumOffer;  // The amount (in Wei) that is the minimum to accept; or zero to indicate no offer
        address invitedBidder; // The exclusive invited buyer for this offer; or the zero address if not exclusive

        address bidder;        // The party that committed Ether to bid
        uint256 lockedBid;     // The amount (in Wei) that the bidder has committed
    }

    /// @notice The underlying asset contract
    IERC721 immutable public tokenContract;

    /// @notice The transaction fee (in basis points) as a portion of the sale price
    uint256 public feePortion;

    /// @notice The best bids and offers for any token
    mapping(uint256 => TokenMarket) public tokenMarkets;

    /// @notice A token is offered for sale by owner; or such an offer is revoked
    /// @param  tokenId       which token
    /// @param  offeror       the token owner that is selling
    /// @param  minimumOffer  the amount (in Wei) that is the minimum to accept; or zero to indicate no offer
    /// @param  invitedBidder the exclusive invited buyer for this offer; or the zero address if not exclusive
    event OfferUpdated(uint256 indexed tokenId, address offeror, uint256 minimumOffer, address invitedBidder);

    /// @notice A new highest bid is committed for a token; or such a bid is revoked
    /// @param  tokenId   which token
    /// @param  bidder    the party that committed Ether to bid
    /// @param  lockedBid the amount (in Wei) that the bidder has committed
    event BidUpdated(uint256 indexed tokenId, address bidder, uint256 lockedBid);

    /// @notice A token is traded on the marketplace (this implies any offer for the token is revoked)
    /// @param  tokenId which token
    /// @param  value   the sale price
    /// @param  offeror the party that previously owned the token
    /// @param  bidder  the party that now owns the token
    event Traded(uint256 indexed tokenId, uint256 value, address indexed offeror, address indexed bidder);

    /// @param initialFeePortion         the transaction fee (in basis points) as a portion of the sale price
    /// @param immutableNftTokenContract the underlying NFT asset
    constructor(uint256 initialFeePortion, IERC721 immutableNftTokenContract) {
        feePortion = initialFeePortion;
        tokenContract = immutableNftTokenContract;
    }

    /// @notice An offeror may revoke their offer
    /// @dev    It is possible that a token will change owners without this contract being notified (e.g. an ERC-721
    ///         "gift" transaction). In this case the old owner who made an offer needs, and gets, a way to revoke that.
    ///         There is no reason why the new owner of a token would need to revoke the prior owner's ineffectual
    ///         offer. But we provide this option anyway because we recognize the token market to be the prerogative of
    ///         that token's owner.
    /// @param  tokenId which token
    function revokeOffer(uint256 tokenId) external {
        require(
            (msg.sender == tokenMarkets[tokenId].offeror) ||
            (msg.sender == tokenContract.ownerOf(tokenId)),
            "Only the offeror or token owner may revoke an offer"
        );
        _setOffer(tokenId, address(0), 0, address(0));
    }

    /// @notice Any token owner may offer it for sale
    /// @dev    If a bid comes which is higher than the offer then the sale price will be this higher amount.
    /// @param  tokenId       which token
    /// @param  minimumOffer  the amount (in Wei) that is the minimum to accept
    /// @param  invitedBidder the exclusive invited buyer for this offer; or the zero address if not exclusive
    function offer(uint256 tokenId, uint256 minimumOffer, address invitedBidder) external {
        require(msg.sender == tokenContract.ownerOf(tokenId), "Only the token owner can offer");
        require(minimumOffer > 0, "Ask for more");
        address bidder = tokenMarkets[tokenId].bidder;
        uint256 lockedBid = tokenMarkets[tokenId].lockedBid;
        bool isInvited = invitedBidder == address(0) || invitedBidder == bidder;

        // Can we match this offer to an existing bid?
        if (lockedBid >= minimumOffer && isInvited) {
            _doTrade(tokenId, lockedBid, msg.sender, bidder);
            _setBid(tokenId, address(0), 0);
        } else {
            _setOffer(tokenId, msg.sender, minimumOffer, invitedBidder);
        }
    }

    /// @notice An bidder may revoke their bid
    /// @param  tokenId which token
    function revokeBid(uint256 tokenId) external {
        require(msg.sender == tokenMarkets[tokenId].bidder, "Only the bidder may revoke their bid");
        _increasePendingWithdrawal(msg.sender, tokenMarkets[tokenId].lockedBid);
        _setBid(tokenId, address(0), 0);
    }

    /// @notice Anyone may commit more than the existing bid for a token.
    /// @dev    When reading the below, note there are three important contexts to consider:
    ///          1. There is no existing bidder
    ///          2. The message caller is the highest bidder
    ///          3. Somebody else is the highest bidder
    ///         when you submit this transaction and when it settles.
    /// @param  tokenId which token
    function bid(uint256 tokenId) external payable {
        uint256 existingLockedBid = tokenMarkets[tokenId].lockedBid;
        require(msg.value > existingLockedBid, "Bid too low");
        address existingBidder = tokenMarkets[tokenId].bidder;
        uint256 minimumOffer = tokenMarkets[tokenId].minimumOffer;
        address invitedBidder = tokenMarkets[tokenId].invitedBidder;
        address offeror = tokenMarkets[tokenId].offeror;
        bool isInvited = invitedBidder == address(0) || invitedBidder == msg.sender;

        // Can we match this bid to an existing offer?
        if (minimumOffer > 0 &&
            msg.value >= minimumOffer &&
            isInvited &&
            offeror == tokenContract.ownerOf(tokenId)) {
            _doTrade(tokenId, msg.value, offeror, msg.sender);
            if (existingBidder == msg.sender) {
                // This is context 2
                _increasePendingWithdrawal(msg.sender, existingLockedBid);
                _setBid(tokenId, address(0), 0);
            }
        } else {
            // Wind up old bid, if any
            if (existingLockedBid > 0) {
                // This is context 2 or 3
                _increasePendingWithdrawal(existingBidder, existingLockedBid);
            }
            // Enter new bid
            _setBid(tokenId, msg.sender, msg.value);
        }
    }

    /// @notice Anyone may add more value to their existing bid
    /// @param  tokenId which token
    function bidIncrease(uint256 tokenId) external payable {
        require(msg.value > 0, "Must send value to increase bid");
        require(msg.sender == tokenMarkets[tokenId].bidder, "You are not current bidder");
        uint256 newBidAmount = tokenMarkets[tokenId].lockedBid + msg.value;
        uint256 minimumOffer = tokenMarkets[tokenId].minimumOffer;
        address invitedBidder = tokenMarkets[tokenId].invitedBidder;
        address offeror = tokenMarkets[tokenId].offeror;
        bool isInvited = invitedBidder == address(0) || invitedBidder == msg.sender;

        // Can we match this bid to an existing offer?
        if (minimumOffer > 0 &&
            newBidAmount >= minimumOffer &&
            isInvited &&
            offeror == tokenContract.ownerOf(tokenId)) {
            _doTrade(tokenId, newBidAmount, offeror, msg.sender);
            _setBid(tokenId, address(0), 0);
        } else {
            tokenMarkets[tokenId].lockedBid = newBidAmount;
            _setBid(tokenId, msg.sender, newBidAmount);
        }
    }

    /// @notice The owner can set the fee portion
    /// @param  newFeePortion the transaction fee (in basis points) as a portion of the sale price
    function setFeePortion(uint256 newFeePortion) external onlyOwner {
        require(newFeePortion <= 1000, "Exceeded maximum fee portion of 10%");
        feePortion = newFeePortion;
    }

    /// @dev Collect fee for owner & offeror and transfer underlying asset. The Traded event emits before the
    ///      ERC721.Transfer event so that somebody observing the events and seeing the latter will recognize the
    ///      context of the former. The bid is NOT cleaned up generally in this function because a circumstance exists
    ///      where an existing bid persists after a trade. See "context 3" above.
    function _doTrade(uint256 tokenId, uint256 value, address offeror, address bidder) private {
        // Divvy up proceeds
        uint256 feeAmount = value * feePortion / 10000; // reverts on overflow
        _increasePendingWithdrawal(Ownable.owner(), feeAmount);
        _increasePendingWithdrawal(offeror, value - feeAmount);

        emit Traded(tokenId, value, offeror, bidder);
        tokenMarkets[tokenId].offeror = address(0);
        tokenMarkets[tokenId].minimumOffer = 0;
        tokenMarkets[tokenId].invitedBidder = address(0);
        tokenContract.transferFrom(offeror, bidder, tokenId);
    }

    /// @dev Set and emit new offer
    function _setOffer(uint256 tokenId, address offeror, uint256 minimumOffer, address invitedBidder) private {
        tokenMarkets[tokenId].offeror = offeror;
        tokenMarkets[tokenId].minimumOffer = minimumOffer;
        tokenMarkets[tokenId].invitedBidder = invitedBidder;
        emit OfferUpdated(tokenId, offeror, minimumOffer, invitedBidder);
    }

    /// @dev Set and emit new bid
    function _setBid(uint256 tokenId, address bidder, uint256 lockedBid) private {
        tokenMarkets[tokenId].bidder = bidder;
        tokenMarkets[tokenId].lockedBid = lockedBid;
        emit BidUpdated(tokenId, bidder, lockedBid);
    }
}
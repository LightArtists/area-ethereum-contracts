// STATUS: RELEASE CANDIDATE 1
// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert
import "./Utilities/LazyArray.sol";
import "./Utilities/PlusCodes.sol";
import "./Utilities/CommitQueue.sol";

/// @title  Area commit-reveal drop contract, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice This contract assigns all code length 4 Plus Codes to participants with randomness provided by a
///         commit-reveal mechanism. ⚠️ Bad things will happen if the reveals do not happen a sufficient amount for more
///         than ~60 minutes.
/// @dev    Each commit must be revealed (by the next committer or a benevolent revealer) to ensure that the intended
///         randomness for that, and subsequent, commits are used.
/// @author William Entriken
abstract contract RandomDropVending {
    using CommitQueue for CommitQueue.Self;
    CommitQueue.Self private _commitQueue;

    using LazyArray for LazyArray.Self;
    LazyArray.Self private _dropInventoryIntegers;

    uint256 private immutable _pricePerPack;
    uint32 private immutable _packSize;
    bool private _saleDidNotBeginYet;
    uint256 private _teamAllocation;

    /// @notice Some code length 4 Plus Codes were purchased, but not yet revealed
    /// @param  buyer    who purchased
    /// @param  quantity how many were purchased
    event Purchased(address buyer, uint32 quantity);

    /// @param inventorySize   integers [1, quantity] are available
    /// @param teamAllocation_ how many set aside for team
    /// @param pricePerPack_   the cost in Wei for each pack
    /// @param packSize_       how many drops can be purchased at a time
    constructor(uint256 inventorySize, uint256 teamAllocation_, uint256 pricePerPack_, uint32 packSize_) {
        require((inventorySize - teamAllocation_) % packSize_ == 0, "Pack size must evenly divide sale quantity");
        require(inventorySize > teamAllocation_, "None for sale, no fun");
        _dropInventoryIntegers.initialize(inventorySize);
        _teamAllocation = teamAllocation_;
        _pricePerPack = pricePerPack_;
        _packSize = packSize_;
        _saleDidNotBeginYet = true;
    }

    /// @notice A quantity of code length 4 Areas are committed for the benefit of the message sender, to be revealed
    ///         soon later. And a quantity of code length 4 Areas that were committed by anybody and are now mature are
    ///         revealed.
    /// @dev    ⚠️ If a commitment is made and is mature more than ~60 minutes without being revealed, then assignment
    ///         will use randomness from the then-current block hash, rather than the intended block hash.
    /// @param  benevolence how many reveals will be attempted in addition to the number of commits
    function purchaseTokensAndReveal(uint32 benevolence) external payable {
        require(msg.value == _pricePerPack, "Did not send correct Ether amount");
        require(_inventoryForSale() >= _packSize, "Sold out");
        require(msg.sender == tx.origin, "Only externally-owned accounts are eligible to purchase");
        require(_saleDidNotBeginYet == false, "The sale did not begin yet");
        _commit();
        _reveal(_packSize + benevolence); // overflow reverts
    }

    /// @notice Important numbers about the drop
    /// @return inventoryForSale how many more can be committed for sale
    /// @return queueCount       how many were committed but not yet revealed
    /// @return setAside         how many are remaining for team to claim
    function dropStatistics() external view returns (uint256 inventoryForSale, uint256 queueCount, uint256 setAside) {
        return (
            _inventoryForSale(),
            _commitQueue.count(),
            _teamAllocation <= _dropInventoryIntegers.count()
                ? _teamAllocation
                : _dropInventoryIntegers.count()
        );
    }

    /// @notice Start the sale
    function _beginSale() internal {
        _saleDidNotBeginYet = false;
    }

    /// @notice In case of emergency, the number of allocations set aside for the team can be adjusted
    /// @param  teamAllocation_ the new allocation amount
    function _setTeamAllocation(uint256 teamAllocation_) internal {
        _teamAllocation = teamAllocation_;
    }

    /// @notice A quantity of integers that were committed by anybody and are now mature are revealed
    /// @param  revealsLeft up to how many reveals will occur
    function _reveal(uint32 revealsLeft) internal {
        for (; revealsLeft > 0 && _commitQueue.isMature(); revealsLeft--) {
            // Get one from queue
            address recipient;
            uint64 maturityBlock;
            (recipient, maturityBlock) = _commitQueue.dequeue();

            // Allocate randomly
            uint256 randomNumber = _random(maturityBlock);
            uint256 randomIndex = randomNumber % _dropInventoryIntegers.count();
            uint allocatedNumber = _dropInventoryIntegers.popByIndex(randomIndex);
            _revealCallback(recipient, allocatedNumber);
        }
    }

    /// @dev   This callback triggers when some drop is revealed.
    /// @param recipient  the beneficiary of the drop
    /// @param allocation which number was dropped
    function _revealCallback(address recipient, uint256 allocation) internal virtual;

    /// @notice Takes some integers (not randomly) in inventory and assigns them. Team does not get tokens until all
    ///         other integers are allocated.
    /// @param  recipient the account that is assigned the integers
    /// @param  quantity  how many integers to assign
    function _takeTeamAllocation(address recipient, uint256 quantity) internal {
        require(_inventoryForSale() == 0, "Cannot take during sale");
        require(quantity <= _dropInventoryIntegers.count(), "Not enough to take");
        for (; quantity > 0; quantity--) {
            uint256 lastIndex = _dropInventoryIntegers.count() - 1;
            uint256 allocatedNumber = _dropInventoryIntegers.popByIndex(lastIndex);
            _revealCallback(recipient, allocatedNumber);
        }
    }

    /// @dev Get a random number based on the given block's hash; or some other hash if not available
    function _random(uint256 blockNumber) internal view returns (uint256) {
        // Blockhash produces non-zero values only for the input range [block.number - 256, block.number - 1]
        if (blockhash(blockNumber) != 0) {
            return uint256(blockhash(blockNumber));
        }
        return uint256(blockhash(((block.number - 1)>>8)<<8));
    }

    /// @notice How many more can be committed for sale
    function _inventoryForSale() internal view returns (uint256) {
        uint256 inventoryAvailable = _commitQueue.count() >= _dropInventoryIntegers.count()
            ? 0
            : _dropInventoryIntegers.count() - _commitQueue.count();
        return _teamAllocation >= inventoryAvailable
            ? 0
            : inventoryAvailable - _teamAllocation;
    }

    /// @notice A quantity of integers are committed for the benefit of the message sender, to be revealed soon later.
    /// @dev    ⚠️ If a commitment is made and is mature more than ~60 minutes without being revealed, then assignment
    ///         will use randomness from the then-current block hash, rather than the intended block hash.
    function _commit() private {
        _commitQueue.enqueue(msg.sender, _packSize);
        emit Purchased(msg.sender, _packSize);
    }
}
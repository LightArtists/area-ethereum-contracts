// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert
import "./AreaNFT.sol";
import "./RandomDropVending.sol";
import "./Utilities/PlusCodes.sol";
import "./Vendor/openzeppelin-contracts-3dadd40034961d5ca75fa209a4188b01d7129501/access/Ownable.sol";

/// @title  Area main contract, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice This contract is responsible for initial allocation and non-fungible tokens.
///         ⚠️ Bad things will happen if the reveals do not happen a sufficient amount for more than ~60 minutes.
/// @author William Entriken
contract Area is Ownable, AreaNFT, RandomDropVending {
    /// @param inventorySize  inventory for code length 4 tokens for sale (normally 43,200)
    /// @param teamAllocation how many set aside for team
    /// @param pricePerPack   the cost in Wei for each pack
    /// @param packSize       how many drops can be purchased at a time
    /// @param name           ERC721 contract name
    /// @param symbol         ERC721 symbol name
    /// @param baseURI        prefix for all token URIs
    /// @param priceToSplit   value (in Wei) required to split Area tokens
    constructor(
        uint256 inventorySize,
        uint256 teamAllocation,
        uint256 pricePerPack,
        uint32 packSize,
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 priceToSplit
    )
        RandomDropVending(inventorySize, teamAllocation, pricePerPack, packSize)
        AreaNFT(name, symbol, baseURI, priceToSplit)
    {
    }

    /// @notice Start the sale
    function beginSale() external onlyOwner {
        _beginSale();
    }

    /// @notice In case of emergency, the number of allocations set aside for the team can be adjusted
    /// @param  teamAllocation the new allocation amount
    function setTeamAllocation(uint256 teamAllocation) external onlyOwner {
        _setTeamAllocation(teamAllocation);
    }

    /// @notice A quantity of Area tokens that were committed by anybody and are now mature are revealed
    /// @param  revealsLeft up to how many reveals will occur
    function reveal(uint32 revealsLeft) external onlyOwner {
        RandomDropVending._reveal(revealsLeft);
    }

    /// @notice Takes some of the code length 4 codes that are not near the poles and assigns them. Team is unable to
    ///         take tokens until all other tokens are allocated from sale.
    /// @param  recipient the account that is assigned the tokens
    /// @param  quantity  how many to assign
    function mintTeamAllocation(address recipient, uint256 quantity) external onlyOwner {
        RandomDropVending._takeTeamAllocation(recipient, quantity);
    }

    /// @notice Takes some of the code length 2 codes that are near the poles and assigns them. Team is unable to take
    ///         tokens until all other tokens are allocated from sale.
    /// @param  recipient    the account that is assigned the tokens
    /// @param  indexFromOne a number in the closed range [1, 54]
    function mintWaterAndIceReserve(address recipient, uint256 indexFromOne) external onlyOwner {
        require(RandomDropVending._inventoryForSale() == 0, "Cannot take during sale");
        uint256 tokenId = PlusCodes.getNthCodeLength2CodeNearPoles(indexFromOne);
        AreaNFT._mint(recipient, tokenId);
    }

    /// @notice Pay the bills
    function withdrawBalance() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    /// @dev Convert a Plus Code token ID to an ASCII (and UTF-8) string
    /// @param  plusCode  the Plus Code token ID to format
    /// @return the ASCII (and UTF-8) string showing the Plus Code token ID
    function tokenIdToString(uint256 plusCode) external pure returns(string memory) {
        return PlusCodes.toString(plusCode);
    }

    /// @dev Convert ASCII string to a Plus Code token ID
    /// @param  stringPlusCode the ASCII (UTF-8) Plus Code token ID
    /// @return plusCode       the Plus Code token ID representing the provided ASCII string
    function stringToTokenId(string memory stringPlusCode) external pure returns(uint256 plusCode) {
        return PlusCodes.fromString(stringPlusCode);
    }

    /// @inheritdoc RandomDropVending
    function _revealCallback(address recipient, uint256 allocation) internal override(RandomDropVending) {
        uint256 tokenId = PlusCodes.getNthCodeLength4CodeNotNearPoles(allocation);
        AreaNFT._mint(recipient, tokenId);
    }
}
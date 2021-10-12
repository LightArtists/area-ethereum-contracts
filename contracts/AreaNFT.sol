// STATUS: RELEASE CANDIDATE 1
// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert
import "./Vendor/openzeppelin-contracts-3dadd40034961d5ca75fa209a4188b01d7129501/token/ERC721/ERC721.sol";
import "./Vendor/openzeppelin-contracts-3dadd40034961d5ca75fa209a4188b01d7129501/access/Ownable.sol";
import "./Utilities/PlusCodes.sol";

/// @title  Area NFT contract, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice This implementation adds features to the baseline ERC-721 standard:
///         - groups of tokens (siblings) are stored efficiently
///         - tokens can be split
/// @dev    This builds on the OpenZeppelin Contracts implementation
/// @author William Entriken
abstract contract AreaNFT is ERC721, Ownable {
    // The prefix for all token URIs
    string internal _baseTokenURI;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _explicitOwners;

    // Mapping from token ID to owner address, if a token is split
    mapping(uint256 => address) private _splitOwners;

    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;

    // Price to split an area in Wei
    uint256 private _priceToSplit;

    /// @dev Contract constructor
    /// @param name_         ERC721 contract name
    /// @param symbol_       ERC721 symbol name
    /// @param baseURI       prefix for all token URIs
    /// @param priceToSplit_ value (in Wei) required to split Area tokens
    constructor(string memory name_, string memory symbol_, string memory baseURI, uint256 priceToSplit_)
        ERC721(name_, symbol_)
    {
        _baseTokenURI = baseURI;
        _priceToSplit = priceToSplit_;
    }

    /// @notice The owner of an Area Token can irrevocably split it into Plus Codes at one greater level of precision.
    /// @dev    This is the only function with burn functionality. The newly minted tokens do not cause a call to
    ///         onERC721Received on the recipient.
    /// @param  tokenId the token that will be split
    function split(uint256 tokenId) external payable {
        require(msg.value == _priceToSplit, "Did not send correct Ether amount");
        require(_msgSender() == ownerOf(tokenId), "AreaNFT: split caller is not owner");
        _burn(tokenId);

        // Split. This causes our ownerOf(childTokenId) to return the owner
        _splitOwners[tokenId] = _msgSender();

        // Ghost mint the child tokens
        // Ghost mint (verb): create N tokens on-chain (i.e. ownerOf returns something) without using N storage slots
        PlusCodes.ChildTemplate memory template = PlusCodes.getChildTemplate(tokenId);
        _balances[_msgSender()] += template.childCount; // Solidity 0.8+
        for (uint32 index = 0; index < template.childCount; index++) {
            uint256 childTokenId = PlusCodes.getNthChildFromTemplate(index, template);
            emit Transfer(address(0), _msgSender(), childTokenId);
        }
    }

    /// @notice Update the price to split Area tokens
    /// @param  newPrice value (in Wei) required to split Area tokens
    function setPriceToSplit(uint256 newPrice) external onlyOwner {
        _priceToSplit = newPrice;
    }

    /// @notice Update the base URI for token metadata
    /// @dev    All data you need is on-chain via token ID, and metadata is real world data. This Base URI is completely
    ///         optional and is only here to facilitate serving to marketplaces.
    /// @param  baseURI the new URI to prepend to all token URIs
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /// @inheritdoc ERC721
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    /// @inheritdoc ERC721
    function ownerOf(uint256 tokenId) public view override returns (address owner) {
        owner = _explicitOwners[tokenId];
        if (owner != address(0)) {
            return owner;
        }
        require(_splitOwners[tokenId] == address(0), "AreaNFT: owner query for invalid (split) token");
        uint256 parentTokenId = PlusCodes.getParent(tokenId);
        owner = _splitOwners[parentTokenId];
        if (owner != address(0)) {
            return owner;
        }
        revert("ERC721: owner query for nonexistent token");
    }

    /// @inheritdoc ERC721
    /// @dev We must override because we need to access the derived `_tokenApprovals` variable that is set by the
    ///      derived`_approved`.
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");

        return _tokenApprovals[tokenId];
    }

    /// @inheritdoc ERC721
    function balanceOf(address owner) public view virtual override returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        return _balances[owner];
    }

    /// @inheritdoc ERC721
    function _burn(uint256 tokenId) internal virtual override {
        address owner = ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _balances[owner] -= 1;
        delete _explicitOwners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    /// @inheritdoc ERC721
    function _transfer(address from, address to, uint256 tokenId) internal virtual override {
        require(ownerOf(tokenId) == from, "ERC721: transfer of token that is not own");
        require(to != address(0), "ERC721: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _explicitOwners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /// @inheritdoc ERC721
    /// @dev We must override because we need the derived `ownerOf` function.
    function _approve(address to, uint256 tokenId) internal virtual override {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    /// @inheritdoc ERC721
    function _mint(address to, uint256 tokenId) internal virtual override {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");
        require(_splitOwners[tokenId] == address(0), "AreaNFT: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _explicitOwners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    /// @inheritdoc ERC721
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual override returns (bool) {
        require(_exists(tokenId), "ERC721: operator query for nonexistent token");
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    /// @inheritdoc ERC721
    function _exists(uint256 tokenId) internal view virtual override returns (bool) {
        address owner;
        owner = _explicitOwners[tokenId];
        if (owner != address(0)) {
            return true;
        }
        if (_splitOwners[tokenId] != address(0)) { // query for invalid (split) token
            return false;
        }
        if (PlusCodes.getCodeLength(tokenId) > 2) { // It has a parent; This throws if it's not a valid plus code.
            uint256 parentTokenId = PlusCodes.getParent(tokenId);
            owner = _splitOwners[parentTokenId];
            if (owner != address(0)) {
                return true;
            }
        }
        return false;
    }

    /// @inheritdoc ERC721
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}
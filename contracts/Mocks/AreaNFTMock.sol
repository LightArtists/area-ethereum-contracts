// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;
import "../AreaNFT.sol";

contract AreaNFTMock is AreaNFT {
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 priceToSplit_
    )
        AreaNFT(name_, symbol_, baseURI_, priceToSplit_)
    {
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }

    function safeMint(
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public {
        _safeMint(to, tokenId, _data);
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }

    function baseURI() public view returns (string memory) {
        return _baseTokenURI;
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }
}

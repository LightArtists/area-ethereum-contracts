// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;
import "../RandomDropVending.sol";

contract RandomDropVendingMock is RandomDropVending {
    event RevealCallback(address recipient, uint256 allocation);

    constructor(uint256 inventorySize, uint256 teamAllocation_, uint256 pricePerPack_, uint32 packSize_)
        RandomDropVending(inventorySize, teamAllocation_, pricePerPack_, packSize_)
    {
    }

    function beginSale() external {
        _beginSale();
    }

    function setTeamAllocation(uint256 teamAllocation) external {
        _setTeamAllocation(teamAllocation);
    }

    function reveal(uint32 revealsLeft) external {
        _reveal(revealsLeft);
    }

    function takeTeamAllocation(address recipient, uint256 quantity) external {
        _takeTeamAllocation(recipient, quantity);
    }

    function _revealCallback(address recipient, uint256 allocation) internal override {
        emit RevealCallback(recipient, allocation);
    }
}

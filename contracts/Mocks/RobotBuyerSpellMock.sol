// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;
import "../RandomDropVending.sol";

contract RobotBuyerSpellMock {
    constructor(RandomDropVending target, uint256 pricePerPack) payable {
        target.purchaseTokensAndReveal{value: pricePerPack}(0);
    }
}

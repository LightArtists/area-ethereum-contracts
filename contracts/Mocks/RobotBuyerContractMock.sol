// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;
import "../RandomDropVending.sol";

contract RobotBuyerContractMock {
    RandomDropVending private _target;
    uint256 private _pricePerPack;

    constructor(RandomDropVending target_, uint256 pricePerPack_) payable {
        _target = target_;
        _pricePerPack = pricePerPack_;
    }

    function buy() external {
        _target.purchaseTokensAndReveal{value: _pricePerPack}(0);
    }
}

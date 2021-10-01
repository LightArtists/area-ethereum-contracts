// STATUS: RELEASE CANDIDATE 1
// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert
import "../Utilities/Withdrawable.sol";

contract WithdrawableMock is Withdrawable {
    function sendValue() external payable {
    }

    function increasePendingWithdrawal(address beneficiary, uint256 amount) external {
        _increasePendingWithdrawal(beneficiary, amount);
    }
}
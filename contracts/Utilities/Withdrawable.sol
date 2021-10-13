// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert

/// @title  Part of Area, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice This Ether accounting system stores value inside this contract and makes it available for beneficiaries to
///         withdraw.
/// @author William Entriken
contract Withdrawable {
    /// @notice Ether waiting for beneficiaries to withdraw
    mapping(address => uint256) private _pendingWithdrawals;

    /// @notice Amount of Ether waiting for beneficiaries to withdraw is updated
    /// @param  beneficiary which beneficiary can withdraw
    /// @param  amount      amount (in Wei) that is pending withdrawal
    event PendingWithdrawal(address beneficiary, uint256 amount);

    /// @notice Beneficiaries can withdraw any Ether held for them
    function withdraw() external {
        uint256 amountToWithdraw = _pendingWithdrawals[msg.sender];
        // Remember to zero the pending refund before sending to prevent re-entrancy attacks
        delete _pendingWithdrawals[msg.sender];
        payable(msg.sender).transfer(amountToWithdraw);
        emit PendingWithdrawal(msg.sender, 0);
    }

    /// @notice Gets amount of Ether waiting for beneficiary to withdraw
    /// @param  beneficiary which beneficiary is queried
    /// @return amount      how much the beneficiary can withdraw
    function pendingWithdrawal(address beneficiary) public view returns (uint256 amount) {
        return _pendingWithdrawals[beneficiary];
    }

    /// @notice Amount of Ether waiting for beneficiaries to withdraw is increased
    /// @param  beneficiary which beneficiary can withdraw
    /// @param  amount      amount (in Wei) that is pending withdrawal
    function _increasePendingWithdrawal(address beneficiary, uint256 amount) internal {
        _pendingWithdrawals[beneficiary] += amount;
        emit PendingWithdrawal(beneficiary, _pendingWithdrawals[beneficiary]);
    }
}
// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;
import "../Utilities/CommitQueue.sol";

contract CommitQueueMock {
    using CommitQueue for CommitQueue.Self;
    CommitQueue.Self private _commitQueue;

    event DequeueReturn(address beneficiary, uint64 maturityBlock);

    function enqueue(address beneficiary, uint32 quantity) external {
        _commitQueue.enqueue(beneficiary, quantity);
    }

    function dequeue() external {
        address beneficiary;
        uint64 maturityBlock;

        (beneficiary, maturityBlock) = _commitQueue.dequeue();
        emit DequeueReturn(beneficiary, maturityBlock);
    }

    function isMature() external view returns (bool) {
        return _commitQueue.isMature();
    }

    function count() external view returns (uint256) {
        return _commitQueue.count();
    }
}
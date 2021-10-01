// STATUS: RELEASE CANDIDATE 1
// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;
import "../Utilities/LazyArray.sol";

contract LazyArrayMock {
    using LazyArray for LazyArray.Self;
    LazyArray.Self private _lazyArray;

    event PopByIndexReturn(uint256 popped);

    function initialize(uint256 initialLength) external {
        _lazyArray.initialize(initialLength);
    }

    function popByIndex(uint256 index) external {
        emit PopByIndexReturn(_lazyArray.popByIndex(index));
    }

    function getByIndex(uint256 index) external view returns (uint256 element) {
        return _lazyArray.getByIndex(index);
    }

    function count() external view returns (uint256) {
        return _lazyArray.count();
    }
}
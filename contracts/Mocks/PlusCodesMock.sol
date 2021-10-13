// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert
import "../Utilities/PlusCodes.sol";

contract PlusCodesMock {
    function getNthCodeLength4CodeNotNearPoles(uint256 indexFromOne) external pure returns (uint256 plusCode) {
        return PlusCodes.getNthCodeLength4CodeNotNearPoles(indexFromOne);
    }

    function getNthCodeLength2CodeNearPoles(uint256 indexFromOne) external pure returns (uint256 plusCode) {
        return PlusCodes.getNthCodeLength2CodeNearPoles(indexFromOne);
    }

    function getParent(uint256 childCode) external pure returns (uint256 parentCode) {
        return PlusCodes.getParent(childCode);
    }

    function getChildTemplate(uint256 parentCode) external pure returns (PlusCodes.ChildTemplate memory) {
        return PlusCodes.getChildTemplate(parentCode);
    }

    function getNthChildFromTemplate(uint32 indexFromZero, PlusCodes.ChildTemplate memory template)
        external
        pure
        returns (uint256 childCode)
    {
        return PlusCodes.getNthChildFromTemplate(indexFromZero, template);
    }

    function getCodeLength(uint256 plusCode) external pure returns(uint8) {
        return PlusCodes.getCodeLength(plusCode);
    }

    function toString(uint256 plusCode) external pure returns(string memory) {
        return PlusCodes.toString(plusCode);
    }

    function fromString(string memory stringPlusCode) external pure returns(uint256 plusCode) {
        return PlusCodes.fromString(stringPlusCode);
    }
}
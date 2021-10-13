// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9;

/* Quick reference of valid Plus Codes (full code) formats, where D is some Plus Codes digit
 *
 * Code length 2:  DD000000+
 * Code length 4:  DDDD0000+
 * Code length 6:  DDDDDD00+
 * Code length 8:  DDDDDDDD+
 * Code length 10: DDDDDDDD+DD
 * Code length 11: DDDDDDDD+DDD
 * Code length 12: DDDDDDDD+DDDD
 * Code length 13: DDDDDDDD+DDDDD
 * Code length 14: DDDDDDDD+DDDDDD
 * Code length 15: DDDDDDDD+DDDDDDD
 */

/// @title  Part of Area, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice Utilities for working with a subset (upper case and no higher than code length 12) of Plus Codes
/// @dev    A Plus Code is a character string representing GPS coordinates. See complete specification at
///         https://github.com/google/open-location-code.
///         We encode this string using ASCII, little endian, into a 256-bit integer. Following is an example code
///         length 8 Plus Code:
/// String:                                                  2 2 2 2 0 0 0 0 +
/// Hex:    0x000000000000000000000000000000000000000000000032323232303030302B
/// @author William Entriken
library PlusCodes {
    struct ChildTemplate {
        uint256 setBits;       // Every child is guaranteed to set these bits
        uint32 childCount;     // How many children are there, either 20 or 400
        uint32 digitsLocation; // How many bits must the child's significant digit(s) be left-shifted before adding
                               // (oring) to `setBits`?
    }

    /// @dev Plus Codes digits use base-20, these are the constituent digits
    bytes20 private constant _PLUS_CODES_DIGITS = bytes20("23456789CFGHJMPQRVWX");

    /// @notice Get the Plus Code at a certain index from the list of all code level 4 Plus Codes which are not near the
    ///         north or south poles
    /// @dev    Code length 4 Plus Codes represent 1 degree latitude by 1 degree longitude. We consider 40 degrees from
    ///         the South Pole and 20 degrees from the North Pole as "near". Therefore 360 × 120 = 43,200 Plus Codes are
    ///         here.
    /// @param  indexFromOne a number in the closed range [1, 43,200]
    /// @return plusCode     the n-th (one-indexed) Plus Code from the alphabetized list of all code length 4 Plus Codes
    ///                      which are not "near" a pole
    function getNthCodeLength4CodeNotNearPoles(uint256 indexFromOne) internal pure returns (uint256 plusCode) {
        require((indexFromOne >= 1) && (indexFromOne <= 43200), "Out of range");
        uint256 indexFromZero = indexFromOne - 1; // In the half-open range [0, 43,200)

        plusCode = uint256(uint40(bytes5("0000+")));
        // 0x000000000000000000000000000000000000000000000000000000303030302B;

        // Least significant digit can take any of 20 values
        plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[indexFromZero % 20])) << 8*5;
        // 0x0000000000000000000000000000000000000000000000000000__303030302B;
        indexFromZero /= 20;

        // Next digit can take any of 20 values
        plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[indexFromZero % 20])) << 8*6;
        // 0x00000000000000000000000000000000000000000000000000____303030302B;
        indexFromZero /= 20;

        // Next digit can take any of 18 values (18 × 20 degrees = 360 degrees)
        plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[indexFromZero % 18])) << 8*7;
        // 0x000000000000000000000000000000000000000000000000______303030302B;
        indexFromZero /= 18;

        // Most significant digit can be not the lowest 2 nor highest 1 (6 options)
        plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[2 + indexFromZero])) << 8*8;
        // 0x0000000000000000000000000000000000000000000000________303030302B;
    }

    /// @notice Get the Plus Code at a certain index from the list of all code level 2 Plus Codes which are near the
    ///         north or south poles
    /// @dev    Code length 2 Plus Codes represent 20 degrees latitude by 20 degrees longitude. We consider 40 degrees
    ///         from the South Pole and 20 degrees from the North Pole as "near". Therefore 360 × 60 ÷ 20 ÷ 20 = 54 Plus
    ///         Codes are here.
    /// @param  indexFromOne a number in the closed range [1, 54]
    /// @return plusCode     the n-th (one-indexed) Plus Code from the alphabetized list of all code length 2 Plus Codes
    ///                      which are "near" a pole
    function getNthCodeLength2CodeNearPoles(uint256 indexFromOne) internal pure returns (uint256 plusCode) {
        require((indexFromOne >= 1) && (indexFromOne <= 54), "Out of range");
        uint256 indexFromZero = indexFromOne - 1; // In the half-open range [0, 54)

        plusCode = uint256(uint56(bytes7("000000+")));
        // 0x000000000000000000000000000000000000000000000000003030303030302B;

        // Least significant digit can take any of 18 values (18 × 20 degrees = 360 degrees)
        plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[indexFromZero % 18])) << 8*7;
        // 0x000000000000000000000000000000000000000000000000__3030303030302B;
        indexFromZero /= 18;

        // Most significant digit determines latitude
        if (indexFromZero <= 1) {
            // indexFromZero ∈ {0, 1}, this is the 40 degrees near South Pole
            plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[indexFromZero])) << 8*8;
            // 0x0000000000000000000000000000000000000000000000____3030303030302B;
        } else {
            // indexFromZero = 2, this is the 20 degrees near North Pole
            plusCode |= uint256(uint8(_PLUS_CODES_DIGITS[8])) << 8*8;
            // 0x000000000000000000000000000000000000000000000043__3030303030302B;
        }
    }

    /// @notice Find the Plus Code representing `childCode` plus some more area if input is a valid Plus Code; otherwise
    ///         revert
    /// @param  childCode  a Plus Code
    /// @return parentCode the Plus Code representing the smallest area which contains the `childCode` area plus some
    ///                    additional area
    function getParent(uint256 childCode) internal pure returns (uint256 parentCode) {
        uint8 childCodeLength = getCodeLength(childCode);
        if (childCodeLength == 2) {
            revert("Code length 2 Plus Codes do not have parents");
        }
        if (childCodeLength == 4) {
            return childCode & 0xFFFF00000000000000 | 0x3030303030302B;
        }
        if (childCodeLength == 6) {
            return childCode & 0xFFFFFFFF0000000000 | 0x303030302B;
        }
        if (childCodeLength == 8) {
            return childCode & 0xFFFFFFFFFFFF000000 | 0x30302B;
        }
        if (childCodeLength == 10) {
            return childCode >> 8*2;
        }
        // childCodeLength ∈ {11, 12}
        return childCode >> 8*1;
    }

    /// @notice Create a template for enumerating Plus Codes that are a portion of `parentCode` if input is a valid Plus
    ///         Code; otherwise revert
    /// @dev    A "child" is a Plus Code representing the largest area which contains some of the `parentCode` area
    ///         minus some area.
    /// @param  parentCode    a Plus Code to operate on
    /// @return childTemplate bit pattern and offsets every child will have
    function getChildTemplate(uint256 parentCode) internal pure returns (ChildTemplate memory) {
        uint8 parentCodeLength = getCodeLength(parentCode);
        if (parentCodeLength == 2) {
            return ChildTemplate(parentCode & 0xFFFF0000FFFFFFFFFF, 400, 8*5);
            // DD__0000+
        }
        if (parentCodeLength == 4) {
            return ChildTemplate(parentCode & 0xFFFFFFFF0000FFFFFF, 400, 8*3);
            // DDDD__00+
        }
        if (parentCodeLength == 6) {
            return ChildTemplate(parentCode & 0xFFFFFFFFFFFF0000FF, 400, 8*1);
            // DDDDDD__+
        }
        if (parentCodeLength == 8) {
            return ChildTemplate(parentCode << 8*2, 400, 0);
            // DDDDDDDD+__
        }
        if (parentCodeLength == 10) {
            return ChildTemplate(parentCode << 8*1, 20, 0);
            // DDDDDDDD+DD_
        }
        if (parentCodeLength == 11) {
            return ChildTemplate(parentCode << 8*1, 20, 0);
            // DDDDDDDD+DDD_
        }
        revert("Plus Codes with code length greater than 12 not supported");
    }

    /// @notice Find a child Plus Code based on a template
    /// @dev    A "child" is a Plus Code representing the largest area which contains some of a "parent" area minus some
    ///         area.
    /// @param  indexFromZero which child (zero-indexed) to generate, must be less than `template.childCount`
    /// @param  template      tit pattern and offsets to generate child
    function getNthChildFromTemplate(uint32 indexFromZero, ChildTemplate memory template)
        internal
        pure
        returns (uint256 childCode)
    {
        // This may run in a 400-wide loop (for Transfer events), keep it tight

        // These bits are guaranteed
        childCode = template.setBits;

        // Add rightmost digit
        uint8 rightmostDigit = uint8(_PLUS_CODES_DIGITS[indexFromZero % 20]);
        childCode |= uint256(rightmostDigit) << template.digitsLocation;
        // 0xTEMPLATETEMPLATETEMPLATETEMPLATETEMPLATETEMPLATETEMPLATETEML=ATE;

        // Do we need to add a second digit?
        if (template.childCount == 400) {
            uint8 secondDigit = uint8(_PLUS_CODES_DIGITS[indexFromZero / 20]);
            childCode |= uint256(secondDigit) << (template.digitsLocation + 8*1);
            // 0xTEMPLATETEMPLATETEMPLATETEMPLATETEMPLATETEMPLATETEMPLATETEM==ATE;
        }
    }

    /// @dev Returns 2, 4, 6, 8, 10, 11, or 12 for valid Plus Codes, otherwise reverts
    /// @param  plusCode the Plus Code to format
    /// @return the code length
    function getCodeLength(uint256 plusCode) internal pure returns(uint8) {
        if (bytes1(uint8(plusCode)) == "+") {
            // Code lengths 2, 4, 6 and 8 are the only ones that end with the format separator (+) and they have exactly
            // 9 characters.
            require((plusCode >> 8*9) == 0, "Too many characters in Plus Code");
            _requireValidDigit(plusCode, 8);
            _requireValidDigit(plusCode, 7);
            require(bytes1(uint8(plusCode >> 8*8)) <= "C", "Beyond North Pole");
            require(bytes1(uint8(plusCode >> 8*7)) <= "V", "Beyond antimeridian");
            if (bytes7(uint56(plusCode & 0xFFFFFFFFFFFFFF)) == "000000+") {
                return 2;
            }
            _requireValidDigit(plusCode, 6);
            _requireValidDigit(plusCode, 5);
            if (bytes5(uint40(plusCode & 0xFFFFFFFFFF)) == "0000+") {
                return 4;
            }
            _requireValidDigit(plusCode, 4);
            _requireValidDigit(plusCode, 3);
            if (bytes3(uint24(plusCode & 0xFFFFFF)) == "00+") {
                return 6;
            }
            _requireValidDigit(plusCode, 2);
            _requireValidDigit(plusCode, 1);
            return 8;
        }
        // Only code lengths 10, 11 and 12 (or more) don't end with a format separator.
        _requireValidDigit(plusCode, 0);
        _requireValidDigit(plusCode, 1);
        if (bytes1(uint8(plusCode >> 8*2)) == "+") {
            require(getCodeLength(plusCode >> 8*2) == 8, "Invalid before +");
            return 10;
        }
        _requireValidDigit(plusCode, 2);
        if (bytes1(uint8(plusCode >> 8*3)) == "+") {
            require(getCodeLength(plusCode >> 8*3) == 8, "Invalid before +");
            return 11;
        }
        _requireValidDigit(plusCode, 3);
        if (bytes1(uint8(plusCode >> 8*4)) == "+") {
            require(getCodeLength(plusCode >> 8*4) == 8, "Invalid before +");
            return 12;
        }
        revert("Code lengths greater than 12 are not supported");
    }

    /// @dev Convert a Plus Code to an ASCII (and UTF-8) string
    /// @param  plusCode the Plus Code to format
    /// @return the ASCII (and UTF-8) string showing the Plus Code
    function toString(uint256 plusCode) internal pure returns(string memory) {
        getCodeLength(plusCode);
        bytes memory retval = new bytes(0);
        while (plusCode > 0) {
            retval = abi.encodePacked(uint8(plusCode % 2**8), retval);
            plusCode >>= 8;
        }
        return string(retval);
    }

    /// @dev Convert ASCII string to a Plus Code
    /// @param  stringPlusCode the ASCII (UTF-8) Plus Code
    /// @return plusCode       the Plus Code representing the provided ASCII string
    function fromString(string memory stringPlusCode) internal pure returns(uint256 plusCode) {
        bytes memory bytesPlusCode = bytes(stringPlusCode);
        for (uint index=0; index<bytesPlusCode.length; index++) {
            plusCode = (plusCode << 8) + uint8(bytesPlusCode[index]);
        }
        PlusCodes.getCodeLength(plusCode);
    }

    /// @dev Reverts if the given byte is not a valid Plus Codes digit
    function _requireValidDigit(uint256 plusCode, uint8 offsetFromRightmostByte) private pure {
        uint8 digit = uint8(plusCode >> (8 * offsetFromRightmostByte));
        for (uint256 index = 0; index < 20; index++) {
            if (uint8(_PLUS_CODES_DIGITS[index]) == digit) {
                return;
            }
        }
        revert("Not a valid Plus Codes digit");
    }
}
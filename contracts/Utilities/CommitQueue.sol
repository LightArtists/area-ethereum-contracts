// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.9; // code below expects that integer overflows will revert

/// @title  Part of Area, 🌐 the earth on the blockchain, 📌 geolocation NFTs
/// @notice A multi-queue data structure for commits that are waiting to be revealed
/// @author William Entriken
library CommitQueue {
    struct Self {
        // Storage of all elements
        mapping(uint256 => Element) elements;

        // The position of the first element if queue is not empty
        uint32 startIndex;

        // The queue’s “past the end” position, i.e. one greater than the last valid subscript argument
        uint32 endIndex;

        // How many items (sum of Element.quantity) are in the queue
        uint256 length;
    }

    struct Element {
        // These sizes are chosen to fit in one EVM word
        address beneficiary;
        uint64 maturityBlock;
        uint32 quantity; // this must be greater than zero
    }

    /// @notice Adds a new entry to the end of the queue
    /// @param  self        the data structure
    /// @param  beneficiary an address associated with the commitment
    /// @param  quantity    how many to enqueue
    function enqueue(Self storage self, address beneficiary, uint32 quantity) internal {
        require(quantity > 0, "Quantity is missing");
        self.elements[self.endIndex] = Element(
            beneficiary,
            uint64(block.number), // maturityBlock, hash thereof not yet known
            quantity
        );
        self.endIndex += 1;
        self.length += quantity;
    }

    /// @notice Removes and returns the first element of the multi-queue; reverts if queue is empty
    /// @param  self          the data structure
    /// @return beneficiary   an address associated with the commitment
    /// @return maturityBlock when this commitment matured
    function dequeue(Self storage self) internal returns (address beneficiary, uint64 maturityBlock) {
        require(!_isEmpty(self), "Queue is empty");
        beneficiary = self.elements[self.startIndex].beneficiary;
        maturityBlock = self.elements[self.startIndex].maturityBlock;
        if (self.elements[self.startIndex].quantity == 1) {
            delete self.elements[self.startIndex];
            self.startIndex += 1;
        } else {
            self.elements[self.startIndex].quantity -= 1;
        }
        self.length -= 1;
    }

    /// @notice Checks whether the first element can be revealed
    /// @dev    Elements are added to the queue in order, so if the first element is not mature than neither are all
    ///         remaining elements.
    /// @param  self the data structure
    /// @return true if the first element exists and is mature; false otherwise
    function isMature(Self storage self) internal view returns (bool) {
        if (_isEmpty(self)) {
            return false;
        }
        return block.number > self.elements[self.startIndex].maturityBlock;
    }

    /// @notice Finds how many items are remaining to be dequeued
    /// @dev    This is the sum of Element.quantity.
    /// @param  self the data structure
    /// @return how many items are in the queue (i.e. how many dequeues can happen)
    function count(Self storage self) internal view returns (uint256) {
        return self.length;
    }

    /// @notice Whether or not the queue is empty
    /// @param  self the data structure
    /// @return true if the queue is empty; false otherwise
    function _isEmpty(Self storage self) private view returns (bool) {
        return self.startIndex == self.endIndex;
    }
}
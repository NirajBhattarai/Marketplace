// Sources flattened with hardhat v2.7.1 https://hardhat.org

// File @openzeppelin/contracts/utils/Context.sol@v4.4.0

// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.0 (utils/Context.sol)

pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**
* @title Precompiled contract that exists in every Arbitrum chain at address(100), 0x0000000000000000000000000000000000000064. Exposes a variety of system-level functionality.
 */
interface ArbSys {
    /**
    * @notice Get Arbitrum block number (distinct from L1 block number; Arbitrum genesis block has block number 0)
    * @return block number as int
     */
    function arbBlockNumber() external view returns (uint);
}

// File @openzeppelin/contracts/access/Ownable.sol@v4.4.0

// OpenZeppelin Contracts v4.4.0 (access/Ownable.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File Contracts/CancellationRegistry.sol

contract CancellationRegistry is Ownable {

    mapping(address => bool) private registrants;
    mapping(bytes32 => uint256) private orderCancellationBlockNumber;
    mapping(bytes => bool) private orderDeactivations;

    modifier onlyRegistrants {
        require(registrants[msg.sender], "The caller is not a registrant.");
        _;
    }

    function addRegistrant(address registrant) external onlyOwner {
        registrants[registrant] = true;
    }

    function removeRegistrant(address registrant) external onlyOwner {
        registrants[registrant] = false;
    }

    /*
    * @dev Cancels an order.
    */
    function cancelPreviousSellOrders(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external onlyRegistrants {
        bytes32 cancellationDigest = keccak256(abi.encode(seller, tokenAddr, tokenId));
        orderCancellationBlockNumber[cancellationDigest] = ArbSys(address(100)).arbBlockNumber();
    }

    /*
    * @dev Check if an order has been cancelled.
    */
    function getSellOrderCancellationBlockNumber(
        address addr,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (uint256) {
        bytes32 cancellationDigest = keccak256(abi.encode(addr, tokenAddr, tokenId));
        return orderCancellationBlockNumber[cancellationDigest];
    }

    /*
    * @dev Cancels an order.
    */
    function cancelOrder(bytes memory signature) external onlyRegistrants {
        orderDeactivations[signature] = true;
    }

    /*
    * @dev Check if an order has been cancelled.
    */
    function isOrderCancelled(bytes memory signature) external view returns (bool) {
        return orderDeactivations[signature];
    }

}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    constructor(address owner_) ERC20("Reward Token", "RWT") Ownable(owner_) {
        _mint(owner_, 1_000_000_000 ether);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {MintNFT}     from "../src/MintNFT.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        vm.startBroadcast(pk);

        RewardToken rwt = new RewardToken(me);
        MintNFT nft = new MintNFT(
            me,
            rwt,
            100 ether,
            10_000,
            5,
            0.001 ether,
            "ipfs://CID/"
        );
        rwt.transfer(address(nft), 1_000_000 ether);

        vm.stopBroadcast();
        console.log("RewardToken:", address(rwt));
        console.log("MintNFT:    ", address(nft));
    }
}

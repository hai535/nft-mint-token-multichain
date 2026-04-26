// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {MintNFT}     from "../src/MintNFT.sol";

contract MintNFTTest is Test {
    RewardToken rwt;
    MintNFT     nft;
    address     owner = address(this);
    address     user  = address(0xBEEF);

    function setUp() public {
        rwt = new RewardToken(owner);
        nft = new MintNFT(owner, rwt, 100 ether, 10, 2, 0.001 ether, "ipfs://x/");
        rwt.transfer(address(nft), 10_000 ether);
        vm.deal(user, 1 ether);
    }

    function test_mint_pays_and_rewards() public {
        vm.prank(user, user);
        nft.mint{value: 0.001 ether}();
        assertEq(nft.ownerOf(1), user);
        assertEq(rwt.balanceOf(user), 100 ether);
    }

    function test_revert_bad_price() public {
        vm.prank(user, user);
        vm.expectRevert(bytes("bad price"));
        nft.mint{value: 0.002 ether}();
    }

    function test_revert_wallet_cap() public {
        vm.startPrank(user, user);
        nft.mint{value: 0.001 ether}();
        nft.mint{value: 0.001 ether}();
        vm.expectRevert(bytes("wallet cap"));
        nft.mint{value: 0.001 ether}();
        vm.stopPrank();
    }

    function test_pause_blocks_mint() public {
        nft.pause();
        vm.prank(user, user);
        vm.expectRevert();
        nft.mint{value: 0.001 ether}();
    }
}

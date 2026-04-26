// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MintNFT is ERC721, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;
    uint256 public immutable rewardPerMint;
    uint256 public immutable maxSupply;
    uint256 public immutable maxPerWallet;
    uint256 public mintPrice;
    string  private _baseTokenURI;
    uint256 public nextId = 1;

    mapping(address => uint256) public mintedOf;

    event Minted(address indexed user, uint256 indexed tokenId, uint256 rewardAmount);

    constructor(
        address owner_,
        IERC20 rewardToken_,
        uint256 rewardPerMint_,
        uint256 maxSupply_,
        uint256 maxPerWallet_,
        uint256 mintPrice_,
        string memory baseURI_
    ) ERC721("MintNFT", "MNFT") Ownable(owner_) {
        rewardToken    = rewardToken_;
        rewardPerMint  = rewardPerMint_;
        maxSupply      = maxSupply_;
        maxPerWallet   = maxPerWallet_;
        mintPrice      = mintPrice_;
        _baseTokenURI  = baseURI_;
    }

    function mint() external payable nonReentrant whenNotPaused {
        require(msg.value == mintPrice, "bad price");
        require(nextId <= maxSupply, "sold out");
        require(++mintedOf[msg.sender] <= maxPerWallet, "wallet cap");
        require(tx.origin == msg.sender, "no contract");

        uint256 tid = nextId++;
        _safeMint(msg.sender, tid);
        rewardToken.safeTransfer(msg.sender, rewardPerMint);

        emit Minted(msg.sender, tid, rewardPerMint);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setMintPrice(uint256 v) external onlyOwner { mintPrice = v; }
    function setBaseURI(string calldata v) external onlyOwner { _baseTokenURI = v; }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdraw(address to) external onlyOwner {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "withdraw fail");
    }

    function rescueReward(address to, uint256 amt) external onlyOwner {
        rewardToken.safeTransfer(to, amt);
    }
}

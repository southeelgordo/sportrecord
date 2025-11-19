// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RecordCertificate — SBT 风格证书（不可转移）
contract RecordCertificate is ERC721, Ownable {
    error Soulbound();

    uint256 public nextTokenId = 1;
    address public minter; // CompetitionRegistry 合约地址

    // recordId -> tokenId（一个结果对应一枚证书）
    mapping(uint256 => uint256) public tokenIdByRecordId;

    event CertificateIssued(uint256 indexed tokenId, uint256 indexed recordId, address indexed to);
    event MinterUpdated(address indexed minter);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {}

    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterUpdated(m);
    }

    function issueCertificate(uint256 recordId, address to) external returns (uint256 tokenId) {
        require(msg.sender == owner() || msg.sender == minter, "Not minter");
        require(tokenIdByRecordId[recordId] == 0, "Already issued");
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        tokenIdByRecordId[recordId] = tokenId;
        emit CertificateIssued(tokenId, recordId, to);
    }

    // -------------------------- Soulbound (non-transferable) --------------------------
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // 禁止转移，仅允许从 address(0) 铸造
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}








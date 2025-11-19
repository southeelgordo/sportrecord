// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CompetitionRegistry — 体育比赛成绩记录系统（FHE 版）
/// @notice 采用 FHE 将成绩（time/rank 等）以密文形态上链，CID 存储在链上用于验证
contract CompetitionRegistry is ZamaEthereumConfig {
    enum RecordState { Pending, Verified, Challenged, Revoked }

    struct CompetitionInfo {
        uint256 competitionId;
        address host;
        string metadataCID; // IPFS metadata
        uint256 beginTime;
        uint256 finishTime;
        bool isActive;
        uint8 requiredConfirmations; // 裁判确认阈值 N
    }

    struct RecordData {
        uint256 recordId;
        uint256 competitionId;
        string participantId; // 可为证件号或别名
        address participantWallet; // 用于解密授权
        address recorder;
        string recordCID; // IPFS: 包含成绩值/排名/媒体等原始数据
        RecordState state;
        uint256 createdAt;
        uint8 validationCount; // 已确认（approve）数
        // FHE 密文字段
        euint64 encryptedTime; // 比赛用时（或数值）
        euint32 encryptedRank; // 排名
    }

    struct RecordView {
        uint256 recordId;
        uint256 competitionId;
        string participantId;
        address participantWallet;
        address recorder;
        string recordCID;
        RecordState state;
        uint256 createdAt;
        uint8 validationCount;
        euint64 encryptedTime;
        euint32 encryptedRank;
    }

    uint256 public nextCompetitionId = 1;
    uint256 public nextRecordId = 1;

    mapping(uint256 => CompetitionInfo) public competitionsById;
    mapping(uint256 => mapping(address => bool)) public isValidatorForCompetition; // competitionId => validator => allowed
    mapping(uint256 => uint256) public validatorCountForCompetition;

    mapping(uint256 => RecordData) public recordsById;
    mapping(uint256 => mapping(address => bool)) public hasValidated; // recordId => validator => validated
    mapping(uint256 => string[]) public recordEvidence; // 记录裁判提交的 evidenceCID（顺序累积）

    mapping(uint256 => uint256[]) public recordIdsByCompetition; // competitionId => recordIds[]
    mapping(bytes32 => uint256[]) public recordIdsByParticipantHash; // keccak256(participantId) => ids

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------
    event CompetitionRegistered(uint256 indexed competitionId, address indexed host, string metadataCID);
    event CompetitionUpdated(uint256 indexed competitionId, bool isActive, uint8 requiredConfirmations);
    event ValidatorsAdded(uint256 indexed competitionId, address[] validators);
    event RecordUploaded(
        uint256 indexed recordId,
        uint256 indexed competitionId,
        string participantId,
        address indexed recorder,
        string recordCID
    );
    event RecordValidated(uint256 indexed recordId, address indexed validator, bool approved, string evidenceCID);
    event RecordStateChanged(uint256 indexed recordId, uint8 oldState, uint8 newState);
    event RecordChallenged(uint256 indexed recordId, address indexed challenger, string challengeCID);

    // ------------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------------
    modifier onlyCompetitionHost(uint256 competitionId) {
        require(competitionsById[competitionId].host == msg.sender, "Not host");
        _;
    }

    modifier onlyActiveCompetition(uint256 competitionId) {
        require(competitionsById[competitionId].isActive, "Competition inactive");
        _;
    }

    // ------------------------------------------------------------------------
    // Competition management
    // ------------------------------------------------------------------------
    function registerCompetition(
        string calldata metadataCID,
        uint256 beginTime,
        uint256 finishTime,
        uint8 requiredConfirmations,
        address[] calldata validators
    ) external returns (uint256 competitionId) {
        require(beginTime < finishTime, "Invalid time range");
        require(requiredConfirmations > 0, "Invalid threshold");
        require(validators.length >= requiredConfirmations, "Threshold > validators");

        competitionId = nextCompetitionId++;
        CompetitionInfo storage c = competitionsById[competitionId];
        c.competitionId = competitionId;
        c.host = msg.sender;
        c.metadataCID = metadataCID;
        c.beginTime = beginTime;
        c.finishTime = finishTime;
        c.isActive = true;
        c.requiredConfirmations = requiredConfirmations;

        uint256 added;
        for (uint256 i = 0; i < validators.length; i++) {
            address v = validators[i];
            if (v != address(0) && !isValidatorForCompetition[competitionId][v]) {
                isValidatorForCompetition[competitionId][v] = true;
                added++;
            }
        }
        validatorCountForCompetition[competitionId] = added;

        emit CompetitionRegistered(competitionId, msg.sender, metadataCID);
        emit ValidatorsAdded(competitionId, validators);
    }

    function updateCompetitionStatus(uint256 competitionId, bool isActive) external onlyCompetitionHost(competitionId) {
        competitionsById[competitionId].isActive = isActive;
        emit CompetitionUpdated(competitionId, isActive, competitionsById[competitionId].requiredConfirmations);
    }

    function updateCompetitionThreshold(uint256 competitionId, uint8 requiredConfirmations) external onlyCompetitionHost(competitionId) {
        require(requiredConfirmations > 0, "Invalid threshold");
        require(validatorCountForCompetition[competitionId] >= requiredConfirmations, "Threshold > validators");
        competitionsById[competitionId].requiredConfirmations = requiredConfirmations;
        emit CompetitionUpdated(competitionId, competitionsById[competitionId].isActive, requiredConfirmations);
    }

    function addValidators(uint256 competitionId, address[] calldata validators) external onlyCompetitionHost(competitionId) {
        uint256 added;
        for (uint256 i = 0; i < validators.length; i++) {
            address v = validators[i];
            if (v != address(0) && !isValidatorForCompetition[competitionId][v]) {
                isValidatorForCompetition[competitionId][v] = true;
                added++;
            }
        }
        validatorCountForCompetition[competitionId] += added;
        emit ValidatorsAdded(competitionId, validators);
    }

    // ------------------------------------------------------------------------
    // Records — encrypted inputs (FHE)
    // ------------------------------------------------------------------------
    function uploadRecord(
        uint256 competitionId,
        string calldata participantId,
        address participantWallet,
        externalEuint64 encryptedTimeExt,
        bytes calldata proofTime,
        externalEuint32 encryptedRankExt,
        bytes calldata proofRank,
        string calldata recordCID
    ) external onlyActiveCompetition(competitionId) returns (uint256 recordId) {
        require(competitionsById[competitionId].beginTime <= block.timestamp, "Competition not started");
        require(block.timestamp <= competitionsById[competitionId].finishTime, "Competition ended");

        euint64 ctTime = FHE.fromExternal(encryptedTimeExt, proofTime);
        euint32 ctRank = FHE.fromExternal(encryptedRankExt, proofRank);

        recordId = nextRecordId++;
        RecordData storage r = recordsById[recordId];
        r.recordId = recordId;
        r.competitionId = competitionId;
        r.participantId = participantId;
        r.participantWallet = participantWallet;
        r.recorder = msg.sender;
        r.recordCID = recordCID;
        r.state = RecordState.Pending;
        r.createdAt = block.timestamp;
        r.validationCount = 0;
        r.encryptedTime = ctTime;
        r.encryptedRank = ctRank;

        // ACL: 合约自身 + 提交者 + 选手钱包 + 组织者
        address host = competitionsById[competitionId].host;
        FHE.allowThis(r.encryptedTime);
        FHE.allowThis(r.encryptedRank);
        FHE.allow(r.encryptedTime, msg.sender);
        FHE.allow(r.encryptedRank, msg.sender);
        if (participantWallet != address(0)) {
            FHE.allow(r.encryptedTime, participantWallet);
            FHE.allow(r.encryptedRank, participantWallet);
        }
        if (host != address(0)) {
            FHE.allow(r.encryptedTime, host);
            FHE.allow(r.encryptedRank, host);
        }

        recordIdsByCompetition[competitionId].push(recordId);
        bytes32 key = keccak256(bytes(participantId));
        recordIdsByParticipantHash[key].push(recordId);

        emit RecordUploaded(recordId, competitionId, participantId, msg.sender, recordCID);
    }

    function validateRecord(uint256 recordId, bool approved, string calldata evidenceCID) external {
        RecordData storage r = recordsById[recordId];
        require(r.recordId != 0, "Record not found");
        require(competitionsById[r.competitionId].isActive, "Competition inactive");
        require(isValidatorForCompetition[r.competitionId][msg.sender], "Not validator");
        require(!hasValidated[recordId][msg.sender], "Already validated");

        hasValidated[recordId][msg.sender] = true;
        if (bytes(evidenceCID).length > 0) {
            recordEvidence[recordId].push(evidenceCID);
        }
        emit RecordValidated(recordId, msg.sender, approved, evidenceCID);

        if (approved) {
            uint8 old = r.validationCount;
            r.validationCount = old + 1;

            // 达阈值自动认证
            if (r.state == RecordState.Pending) {
                uint8 threshold = competitionsById[r.competitionId].requiredConfirmations;
                if (r.validationCount >= threshold) {
                    _updateRecordState(recordId, RecordState.Verified);
                }
            }
        }
    }

    function challengeRecord(uint256 recordId, string calldata challengeCID) external {
        RecordData storage r = recordsById[recordId];
        require(r.recordId != 0, "Record not found");
        require(msg.sender == r.participantWallet || msg.sender == competitionsById[r.competitionId].host, "Not allowed");

        emit RecordChallenged(recordId, msg.sender, challengeCID);
        _updateRecordState(recordId, RecordState.Challenged);
    }

    function resolveChallenge(uint256 recordId, bool uphold, string calldata /*resolutionCID*/ ) external onlyCompetitionHost(recordsById[recordId].competitionId) {
        require(recordsById[recordId].recordId != 0, "Record not found");
        if (uphold) {
            _updateRecordState(recordId, RecordState.Verified);
        } else {
            _updateRecordState(recordId, RecordState.Revoked);
        }
    }

    function _updateRecordState(uint256 recordId, RecordState newState) internal {
        RecordData storage r = recordsById[recordId];
        uint8 oldState = uint8(r.state);
        r.state = newState;
        emit RecordStateChanged(recordId, oldState, uint8(newState));
    }

    // ------------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------------
    function fetchRecord(uint256 recordId) external view returns (RecordView memory out) {
        RecordData storage r = recordsById[recordId];
        require(r.recordId != 0, "Record not found");
        out = RecordView({
            recordId: r.recordId,
            competitionId: r.competitionId,
            participantId: r.participantId,
            participantWallet: r.participantWallet,
            recorder: r.recorder,
            recordCID: r.recordCID,
            state: r.state,
            createdAt: r.createdAt,
            validationCount: r.validationCount,
            encryptedTime: r.encryptedTime,
            encryptedRank: r.encryptedRank
        });
    }

    function fetchRecordsByCompetition(uint256 competitionId, uint256 start, uint256 count) external view returns (RecordView[] memory arr) {
        uint256[] storage ids = recordIdsByCompetition[competitionId];
        if (start >= ids.length) return new RecordView[](0);
        uint256 end = start + count;
        if (end > ids.length) end = ids.length;
        uint256 n = end - start;
        arr = new RecordView[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = ids[start + i];
            RecordData storage r = recordsById[id];
            arr[i] = RecordView({
                recordId: r.recordId,
                competitionId: r.competitionId,
                participantId: r.participantId,
                participantWallet: r.participantWallet,
                recorder: r.recorder,
                recordCID: r.recordCID,
                state: r.state,
                createdAt: r.createdAt,
                validationCount: r.validationCount,
                encryptedTime: r.encryptedTime,
                encryptedRank: r.encryptedRank
            });
        }
    }

    function fetchRecordsByParticipant(string calldata participantId) external view returns (uint256[] memory ids) {
        bytes32 key = keccak256(bytes(participantId));
        ids = recordIdsByParticipantHash[key];
    }

    function getValidationCount(uint256 recordId) external view returns (uint8) {
        return recordsById[recordId].validationCount;
    }
}








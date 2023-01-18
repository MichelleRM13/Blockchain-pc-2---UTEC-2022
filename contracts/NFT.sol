// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MiPrimerNft is Initializable, ERC721Upgradeable, PausableUpgradeable, 
                        AccessControlUpgradeable, UUPSUpgradeable{

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    mapping (uint256 => bool) NFTsAcunados;
    
   /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol
        ) public initializer {
        __ERC721_init(_name, _symbol);
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmReWjT2igKkg1S8wL44J8CnkJPefpA5E1qHHLMjTBEQ7q/";
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"))
                : "";
    }

    function pause() public onlyRole(PAUSER_ROLE){
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE){
        _unpause();
    }

    function safeMint(address to, uint256 id) public onlyRole(MINTER_ROLE){
        // Se hacen dos validaciones
        // 2 - Id se encuentre en el rando inclusivo de 1 a 30
        //      * Mensaje de error: "Public Sale: id must be between 1 and 30"
        require((id > 0) && (id < 31), "NFT: Token id out of range");

        // 1 - Dicho id no haya sido acuñado antes
        uint256 idNFT = id-1;
        require(!NFTsAcunados[idNFT], "NFT ya fue acunado");

        NFTsAcunados[idNFT] = true;        
        _safeMint(to, idNFT);
    }

    // The following functions are overrides required by Solidity.
    
    function supportsInterface(bytes4 interfaceId)
        public view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(MINTER_ROLE) {}
}

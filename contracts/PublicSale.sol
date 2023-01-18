// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PublicSale is Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    mapping (uint256 => bool) NFTsVendidos;
    mapping (uint256 => address) DuenosNFTs;
    // Mi Primer Token
    // Crear su setter
    IERC20Upgradeable miPrimerToken ;

    // 21 de diciembre del 2022 GMT
    uint256 constant startDate = 1671580800;

    uint256 constant MIN_PRICE_NFT = 10000 * 10 ** 18;
    uint256 constant MAX_PRICE_NFT = 50000 * 10 ** 18;
    uint256 constant INCREMENTO_PRICE_NFT = 1000 * 10 ** 18;
    uint256 constant CANT_TOTAL_NFTS = 30;
    uint256 cantNFTVendidos; 

    // Gnosis Safe
    // Crear su setter
    address gnosisSafeWallet;

    event DeliverNft(address winnerAccount, uint256 nftId);
    event ReceivedEther(uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        cantNFTVendidos = 0;
    }

    function setMiPrimerTokenAdd(address _miPrimerToken) external onlyRole(DEFAULT_ADMIN_ROLE){
        miPrimerToken = IERC20Upgradeable(_miPrimerToken);
    }

    function setGnosisSafeWalletAdd(address _gnosisSafeWallet) external onlyRole(DEFAULT_ADMIN_ROLE){
        gnosisSafeWallet = _gnosisSafeWallet;
    }
    
    function breakFreeNFT(uint256 _id) public onlyRole(DEFAULT_ADMIN_ROLE){
        // address dueno = DuenosNFTs[_id];
        // uint256 priceNft = _getPriceById(_id);
        // uint256 _fee = priceNft/10;
        // uint256 _net = priceNft - _fee;

        // // miPrimerToken.transferFrom(gnosisSafeWallet, dueno, _fee);
        // miPrimerToken.transferFrom(address(this), dueno, _net);

        NFTsVendidos[_id] = false; 
        cantNFTVendidos--;
    }

    function purchaseNftById(uint256 _id) external {

        // 4 - el _id se encuentre entre 1 y 30
        //         * Mensaje de error: "Public Sale: id must be between 1 and 30"
        require((_id > 0) && (_id < 31), "Public Sale: id must be between 1 and 30");

        // Realizar 3 validaciones:
        // 1 - el id no se haya vendido. Sugerencia: llevar la cuenta de ids vendidos
        //         * Mensaje de error: "Public Sale: id not available"
        require(!NFTsVendidos[_id], "Public Sale: id not available");

        // Obtener el precio segun el id
        uint256 priceNft = _getPriceById(_id);

        // 2 - el msg.sender haya dado allowance a este contrato en suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough allowance"
        uint256 allowance = miPrimerToken.allowance(msg.sender,address(this));
        require(allowance >= priceNft, "Public Sale: Not enough allowance");

        // 3 - el msg.sender tenga el balance suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough token balance"
        uint256 balance = miPrimerToken.balanceOf(msg.sender);
        require(balance >= priceNft, "Public Sale: Not enough token balance");

        // Purchase fees
        // 10% para Gnosis Safe (fee)
        uint256 _fee = priceNft/10;
        // 90% se quedan en este contrato (net)
        uint256 _net = priceNft - _fee;
        // from: msg.sender - to: gnosisSafeWallet - amount: fee
        miPrimerToken.transferFrom(msg.sender, gnosisSafeWallet, _fee);
        // from: msg.sender - to: address(this) - amount: net
        miPrimerToken.transferFrom(msg.sender, address(this), _net);

        NFTsVendidos[_id] = true; 
        DuenosNFTs[_id] = msg.sender; 
        cantNFTVendidos++;
        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, _id);
    }

    function depositEthForARandomNft() public payable {
        // Realizar 2 validaciones
        // 1 - que el msg.value sea mayor o igual a 0.01 ether
        require(msg.value >= 0.01 ether, "Public Sale: Not enough Ether");

        // 2 - que haya NFTs disponibles para hacer el random
        require(cantNFTVendidos < CANT_TOTAL_NFTS,"Public Sale: NFTs no disponibles");

        // Escoger una id random de la lista de ids disponibles
        uint256 nftId = _getRandomNftId();

        if(NFTsVendidos[nftId]){
            uint256 cantNFTDisponible = CANT_TOTAL_NFTS - cantNFTVendidos;
            uint256 ordenBuscar = (nftId % cantNFTDisponible) +1;
            uint256 contador = 0;

            for(uint256 i=1; i < CANT_TOTAL_NFTS+1 ; i++){
                if(!NFTsVendidos[i]){
                    contador++;
                    
                    if(contador == ordenBuscar){
                        nftId = i;
                        break;
                    }
                }
            }
        }

        // Enviar ether a Gnosis Safe
        // SUGERENCIA: Usar gnosisSafeWallet.call para enviar el ether
        // Validar los valores de retorno de 'call' para saber si se envio el ether correctamente
        (bool success,) = payable(gnosisSafeWallet).call{ value: msg.value, gas: 500000 }("");
        require(success, "Transfer Ether Gnosis failed");

        // Dar el cambio al usuario
        // El vuelto seria equivalente a: msg.value - 0.01 ether
        if (msg.value > 0.01 ether) {
            // logica para dar cambio
            // usar '.transfer' para enviar ether de vuelta al usuario
            uint256 _vueltoEther = msg.value - 0.01 ether;
            payable(msg.sender).transfer(_vueltoEther);

            (success, ) = payable(gnosisSafeWallet).call{ value: _vueltoEther, gas: 2300 }("");
            require(success, "Transfer Ether To Client failed");
        }
        
        NFTsVendidos[nftId] = true; 
        DuenosNFTs[nftId] = msg.sender; 
        cantNFTVendidos++;

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, nftId);
    }

    // PENDING
    // Crear el metodo receive
    receive() external payable {
        emit ReceivedEther(msg.value);
        depositEthForARandomNft();
    }

    function transferTokens() public onlyRole(DEFAULT_ADMIN_ROLE){
        uint256 balanceContrato = miPrimerToken.balanceOf(address(this));
        miPrimerToken.approve(msg.sender,balanceContrato);
        miPrimerToken.transferFrom(address(this), msg.sender, balanceContrato);
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    // Devuelve un id random de NFT de una lista de ids disponibles
    function _getRandomNftId() internal view returns (uint256) {
        return (uint256( keccak256(abi.encodePacked(block.timestamp, msg.sender)) ) % 30) + 1;
    }

    // Según el id del NFT, devuelve el precio. Existen 3 grupos de precios
    function _getPriceById(uint256 _id) internal view returns (uint256) {
        // uint256 priceGroupOne = 500*10**18;
        // uint256 priceGroupTwo = _id*1000*10**18;
        // uint256 priceGroupThree = ;
        if (_id > 0 && _id < 11) {
            return 500*10**18;
        } else if (_id > 10 && _id < 21) {
            return _id*1000*10**18;
        } else {
            uint256 horasPasadas = (block.timestamp - startDate)/(60*60);
            uint256 priceGroupThree = MIN_PRICE_NFT + (horasPasadas*INCREMENTO_PRICE_NFT);
            if(priceGroupThree > MAX_PRICE_NFT){
                return MAX_PRICE_NFT;
            }
            return priceGroupThree;
        }
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}

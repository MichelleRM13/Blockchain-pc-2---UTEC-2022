const { expect } = require("chai");
const { ethers } = require("hardhat");

const { getRole, deploySC, pEth } = require("../utils");

const MINTER_ROLE = getRole("MINTER_ROLE");

// 21 de diciembre del 2022 GMT
var startDate = 1671580800;
var MIN_PRICE_NFT = 10000;
var MAX_PRICE_NFT = 50000;
var INCREMENTO_PRICE_NFT = 1000;

describe("MI PRIMER TOKEN TESTING", function () {
  var nftContract, publicSaleContract, miPrimerToken, miPrimerTokenAddress;
  var owner, gnosis, alice, bob, carl, deysi;
  var nameNFT = "Mi Primer NFT";
  var symbolNFT = "MPRNFT";
  var namePS = "PublicSale";

  before(async () => {
    [owner, alice, bob, carl, deysi] = await ethers.getSigners();
  });

  // Estos dos métodos a continuación publican los contratos en cada red
  // Se usan en distintos tests de manera independiente
  // Ver ejemplo de como instanciar los contratos en deploy.js
  async function deployNFTSC() {
    nftContract = await deploySC("MiPrimerNft", [nameNFT, symbolNFT]);
  }

  async function deployMPTKN() {
    miPrimerToken = await deploySC("MiPrimerToken", []);
    miPrimerTokenAddress = miPrimerToken.address;
  }

  async function deployPublicSaleSC() {
    gnosis = ethers.utils.getAddress("0x652C5211c68D442856A53E6Ba3D91Fc64882e74f");
    publicSaleContract = await deploySC(namePS, []);
    await publicSaleContract.setGnosisSafeWalletAdd(gnosis);
  }

  describe("Mi Primer Nft Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployNFTSC();
    });

    it("Verifica nombre colección", async () => {
      var nameColleccion = await nftContract.name();

      expect(
        nameColleccion
      ).to.be.equal(
        nameNFT
      );
    });

    it("Verifica símbolo de colección", async () => {
      var symbolColleccion = await nftContract.symbol();

      expect(
        symbolColleccion
      ).to.be.equal(
        symbolNFT
      );
    });

    it("No permite acuñar sin privilegio", async () => {
      var NFTId = 4;
      const safeMint = nftContract.connect(deysi).functions["safeMint(address,uint256)"];

      await expect(
        safeMint(deysi.address, NFTId)
      ).to.revertedWith(
        `AccessControl: account ${deysi.address.toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });

    it("No permite acuñar doble id de Nft", async () => {
      var NFTId = 4;
      await nftContract.grantRole(MINTER_ROLE, carl.address);
      const safeMint = nftContract.connect(owner).functions["safeMint(address,uint256)"];

      await expect(
        safeMint(bob.address, NFTId)
      ).to.changeTokenBalance(
        nftContract, bob.address, 1
      );
 
      await expect(
        safeMint(carl.address, NFTId)
      ).to.revertedWith(
        "NFT ya fue acunado"
      );
    });

    it("Verifica rango de Nft: [1, 30]", async () => {
      // Mensaje error: "NFT: Token id out of range"
      var NFTId = 0;
      const safeMint = nftContract.connect(owner).functions["safeMint(address,uint256)"];

      await expect(
        safeMint(alice.address, NFTId)
      ).to.revertedWith(
        "NFT: Token id out of range"
      );
    });

    it("Se pueden acuñar todos (30) los Nfts", async () => {
      var addressZero = "0x0000000000000000000000000000000000000000";
      await nftContract.grantRole(MINTER_ROLE, deysi.address);
      const safeMint = nftContract.connect(owner).functions["safeMint(address,uint256)"];

      for(var contador = 1; contador < 31; contador++){
        var tx = await safeMint(deysi.address, contador);
        
        await expect(
          tx
        ).to.emit(
          nftContract, "Transfer"
        ).withArgs(
          addressZero, deysi.address, contador-1
        );
      }
    });
  });

  describe("Public Sale Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployMPTKN();
      await deployPublicSaleSC();
    });

    describe("Validaciones inciales", () => {
      it("No se puede comprar otra vez el mismo id", async () => {
        const NFTId = 5;
        const amount = ethers.utils.parseEther("2000");

        await miPrimerToken.mint( bob.address, amount );
        const approve = miPrimerToken.connect(bob).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(bob).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(tx)
          .to.emit(publicSaleContract, "DeliverNft")
          .withArgs(bob.address, NFTId);

        await expect(
          purchaseNftById(NFTId)
        ).to.revertedWith(
          'Public Sale: id not available'
        );
      });

      it("NFTIds aceptables: [1, 30]", async () => {
        const NFTId = 0;
        const amount = ethers.utils.parseEther("100000");

        await miPrimerToken.mint(carl.address,amount);
        const approve = miPrimerToken.connect(carl).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(carl).functions["purchaseNftById(uint256)"];

        await expect(
          purchaseNftById(NFTId)
        ).to.revertedWith(
          "Public Sale: id must be between 1 and 30"
        );
      });

      it("Usuario no dio permiso de MiPrimerToken a Public Sale", async () => {
        const NFTId = 8;
        const amount = ethers.utils.parseEther("1");

        await miPrimerToken.mint( deysi.address, amount);
        const approve = miPrimerToken.connect(deysi).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(deysi).functions["purchaseNftById(uint256)"];

        await expect(
          purchaseNftById(NFTId)
        ).to.revertedWith(
          "Public Sale: Not enough allowance"
        );
      });

      it("Usuario no tiene suficientes MiPrimerToken para comprar", async () => {
        var NFTId = 7;
        const amount = ethers.utils.parseEther("400");
        const amountApprove = ethers.utils.parseEther("500");

        await miPrimerToken.mint( alice.address, amount );
        const approve = miPrimerToken.connect(alice).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amountApprove);

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(alice).functions["purchaseNftById(uint256)"];
                
        await expect(
          purchaseNftById(NFTId)
        ).to.revertedWith(
          "Public Sale: Not enough token balance"
        );
      });

    });

    describe("Compra grupo 1 de NFT: 1 - 10", () => {
      it("Emite evento luego de comprar", async () => {
        var NFTId = 1;
        const amount = ethers.utils.parseEther("500");

        await miPrimerToken.mint( alice.address, amount);
        const approve = miPrimerToken.connect(alice).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(alice).functions["purchaseNftById(uint256)"];
        
        var tx = await purchaseNftById(NFTId);

        await expect(tx)
          .to.emit(publicSaleContract, "DeliverNft")
          .withArgs(alice.address, NFTId);

      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        // Usar changeTokenBalance
        // source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-token-balance
        var NFTId = 2;
        const amount = ethers.utils.parseEther("500");

        await miPrimerToken.mint( alice.address, amount);
        const approve = miPrimerToken.connect(alice).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(alice).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, alice.address, ethers.utils.parseEther("-500")
        );

      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        var NFTId = 3;
        const amount = ethers.utils.parseEther("500");

        await miPrimerToken.mint( bob.address, amount );
        const approve = miPrimerToken.connect(bob).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(bob).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);
        
        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, gnosis, ethers.utils.parseEther("50")
        );
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        var NFTId = 4;
        const amount = ethers.utils.parseEther("500");

        await miPrimerToken.mint( alice.address, amount );
        const approve = miPrimerToken.connect(alice).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(alice).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);
        
        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, publicSaleContract.address, ethers.utils.parseEther("450")
        );

      });
    });

    describe("Compra grupo 2 de NFT: 11 - 20", () => {
      it("Emite evento luego de comprar", async () => {
        var NFTId = 11;
        var precioNFT = NFTId * 1000;
        const amount = ethers.utils.parseEther(precioNFT.toString());
        
        await miPrimerToken.mint( bob.address, amount);
        const approve = miPrimerToken.connect(bob).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(bob).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(tx)
          .to.emit(publicSaleContract, "DeliverNft")
          .withArgs(bob.address, NFTId);
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        var NFTId = 12;
        var precioNFT = NFTId * 1000;
        const amount = ethers.utils.parseEther(precioNFT.toString());
        
        await miPrimerToken.mint( bob.address, amount);
        const approve = miPrimerToken.connect(bob).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(bob).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, bob.address, ethers.utils.parseEther("-12000")
        );

      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        var NFTId = 13;
        var precioNFT = NFTId * 1000;
        var _fee = precioNFT / 10;

        var amount = ethers.utils.parseEther(precioNFT.toString());
        
        await miPrimerToken.mint( bob.address, amount);
        const approve = miPrimerToken.connect(bob).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(bob).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, gnosis, ethers.utils.parseEther(_fee.toString())
        );
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        var NFTId = 12;
        var precioNFT = NFTId * 1000;
        var _fee = precioNFT / 10;
        var _net = precioNFT - _fee;
        var amount = ethers.utils.parseEther(precioNFT.toString());
        
        await miPrimerToken.mint( bob.address, amount);
        const approve = miPrimerToken.connect(bob).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(bob).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, publicSaleContract.address, ethers.utils.parseEther(_net.toString())
        );
      });
    });

    describe("Compra grupo 3 de NFT: 21 - 30", () => {
      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        var NFTId = 22;
        var hoyDia = Math.floor(new Date().getTime() / 1000)
        var horasPasadas = Math.floor((hoyDia - startDate) / (60 * 60));
        var priceGroupThree = MIN_PRICE_NFT + (horasPasadas * INCREMENTO_PRICE_NFT);

        if(priceGroupThree > MAX_PRICE_NFT){
          priceGroupThree = MAX_PRICE_NFT;
        }

        var _fee = priceGroupThree / 10;
        var _net = priceGroupThree - _fee;
        var amount = ethers.utils.parseEther(priceGroupThree.toString());

        await miPrimerToken.mint( carl.address, amount);
        const approve = miPrimerToken.connect(carl).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(carl).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, publicSaleContract.address, ethers.utils.parseEther(_net.toString())
        );
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        var NFTId = 25;
        var hoyDia = Math.floor(new Date().getTime() / 1000)
        var horasPasadas = Math.floor((hoyDia - startDate) / (60 * 60));
        var priceGroupThree = MIN_PRICE_NFT + (horasPasadas * INCREMENTO_PRICE_NFT);

        if(priceGroupThree > MAX_PRICE_NFT){
          priceGroupThree = MAX_PRICE_NFT;
        }

        var _fee = priceGroupThree / 10;
        var amount = ethers.utils.parseEther(priceGroupThree.toString());

        await miPrimerToken.mint( carl.address, amount);
        const approve = miPrimerToken.connect(carl).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(carl).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, gnosis, ethers.utils.parseEther(_fee.toString())
        );
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        var NFTId = 28;
        var hoyDia = Math.floor(new Date().getTime() / 1000)
        var horasPasadas = Math.floor((hoyDia - startDate) / (60 * 60));
        var priceGroupThree = MIN_PRICE_NFT + (horasPasadas * INCREMENTO_PRICE_NFT);

        if(priceGroupThree > MAX_PRICE_NFT){
          priceGroupThree = MAX_PRICE_NFT;
        }

        var _fee = priceGroupThree / 10;
        var _net = priceGroupThree - _fee;
        var amount = ethers.utils.parseEther(priceGroupThree.toString());


        await miPrimerToken.mint( carl.address, amount);
        const approve = miPrimerToken.connect(carl).functions["approve(address,uint256)"];
        await approve(publicSaleContract.address, amount);       

        await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
        const purchaseNftById = publicSaleContract.connect(carl).functions["purchaseNftById(uint256)"];

        var tx = await purchaseNftById(NFTId);

        await expect(
          tx
        ).to.changeTokenBalance(
          miPrimerToken, publicSaleContract.address, ethers.utils.parseEther(_net.toString())
        );

      });
    });

    describe("Depositando Ether para Random NFT", () => {

      it("Método emite evento (30 veces) ", async () => {
        const transaction = { value: pEth("0.01") };

        for(var contador = 0; contador < 30 ; contador++){
          await publicSaleContract.depositEthForARandomNft(transaction);
        }
      });

      it("Método falla la vez 31", async () => {
        const transaction = { value: pEth("0.01") };

        for(var contador = 0; contador < 30 ; contador++){
          var tx = await publicSaleContract.depositEthForARandomNft(transaction);
          await tx.wait();
        }

        await expect(
          publicSaleContract.depositEthForARandomNft(transaction)
        ).to.revertedWith(
          "Public Sale: NFTs no disponibles"
        );
      });

      it("Envío de Ether y emite Evento (30 veces)", async () => {
        for(var contador = 0; contador < 30 ; contador++){     
          var tx = await owner.sendTransaction({to: publicSaleContract.address,value: pEth("0.01")})

          await expect(
            tx
          ).to.changeEtherBalances(
            [owner.address, gnosis],
            [pEth("-0.01"), pEth("0.01")]
          );
        }
      });

      it("Envío de Ether falla la vez 31", async () => {
        for(var contador = 1; contador < 31 ; contador++){     
          var tx = await owner.sendTransaction({to: publicSaleContract.address,value: pEth("0.01")});

          await expect(
            tx
          ).to.changeEtherBalances(
            [owner.address, gnosis],
            [pEth("-0.01"), pEth("0.01")]
          );
        }

        await expect(
          owner.sendTransaction({to: publicSaleContract.address,value: pEth("0.01")})
        ).to.revertedWith(
          "Public Sale: NFTs no disponibles"
        );
      });

      it("Da vuelto cuando y gnosis recibe Ether", async () => {
        // Usar el método changeEtherBalances
        // Source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-ether-balance-multiple-accounts
        // Ejemplo:


        // await expect(
        //   await owner.sendTransaction({to: publicSaleContract.address, value: pEth("0.02")})
        // ).to.changeEtherBalances(
        //   [owner.address, gnosis], 
        //   [pEth("-0.01"), pEth("0.01")]
        // );
      });
    });
  });
});

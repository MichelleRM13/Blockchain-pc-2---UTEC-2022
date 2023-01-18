import { BigNumber, Contract, providers, ethers, utils } from "ethers";

import usdcTknAbi from "../artifacts/contracts/USDCoin.sol/USDCoin.json";
import miPrimerTknAbi from "../artifacts/contracts/MiPrimerToken.sol/MiPrimerToken.json";
import publicSaleAbi from "../artifacts/contracts/PublicSale.sol/PublicSale.json";
import nftTknAbi from "../artifacts/contracts/NFT.sol/MiPrimerNft.json";

window.ethers = ethers;

import {
  connectToMumbai
} from "utec-smart-contracts";

var provider, signer, account;
var usdcTkContract, miPrTokenContract, nftTknContract, pubSContract;

// REQUIRED
// Conectar con metamask
function initSCsGoerli() {
  provider = new providers.Web3Provider(window.ethereum);

  var usdcAddress = "0x523AAd1C3C4b0828BcEbe1815259709E5808c977";
  var miPrTknAdd = "0x58D174E2317bD85ABc53918d34D26A8AF3d1aEb6";
  var pubSContractAdd = "0xA35493B493A85A3B6AD21Dd21eeEf19093A9d6CD";

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi.abi, provider);
  miPrTokenContract = new Contract(miPrTknAdd, miPrimerTknAbi.abi, provider);
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi.abi, provider);
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
function initSCsMumbai() {
  var nftAddress = "0x0f53189420ef4A31C087cB14f6a7F972A14774A7";
  var urlProviderM = "https://polygon-mumbai.g.alchemy.com/v2/bEvdCh9lIFcGEllm7ypxDsdVCQRao6Ef";
  var providerM = new ethers.providers.JsonRpcProvider(urlProviderM);
  nftTknContract = new Contract(nftAddress, nftTknAbi.abi, providerM)
}

function setUpListeners() {
  // Connect to Metamask  
  var bttn = document.getElementById("connect");
  bttn.addEventListener("click", async function () {
    //Mostrar loading
    document.getElementById("loading").style.display = "block";

    console.log("Btn conectar metamask...");

    if (window.ethereum) {
      [account] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Billetera metamask", account);

      provider = new providers.Web3Provider(window.ethereum);
      signer = provider.getSigner(account);
      window.signer = signer;
    }
      //Ocultar loading
      document.getElementById("loading").style.display = "none";
  });

  //Cambiar a Mumbai
  var bttn = document.getElementById("switch");
  bttn.addEventListener("click", async function () {
    console.log("Btn cambiar Mumbai...");
    await connectToMumbai();
  });

  //Refrescar balance USDC
  var bttn = document.getElementById("usdcUpdate");
  bttn.addEventListener("click", async function () {
    console.log("Btn Refrescar balance USDC...");
    var txt = document.getElementById("usdcBalance");
    var txtError = document.getElementById("usdcBalanceError");

    try {
      txtError.innerHTML = "";

      console.log(signer);
      var response = await usdcTkContract.connect(signer).balanceOf(signer._address);

      console.log("Response balanceOf: ");
      console.log(response);
      txt.innerHTML = response;
    } catch (error) {
      console.log("Error en llamado de balanceOf de usdc Contract");
      console.log(error.reason);
      txt.innerHTML = "Error";
      txtError.innerHTML = error.reason;
    }
  });

  //Refrescar balance MPTK
  var bttn = document.getElementById("miPrimerTknUpdate");
  bttn.addEventListener("click", async function () {
    console.log("Btn Refrescar balance MPTK...");
    var txt = document.getElementById("miPrimerTknBalance");
    var txtError = document.getElementById("miPrimerTknBalanceError");

    try {
      txtError.innerHTML = "";

      var response = await miPrTokenContract.connect(signer).balanceOf(signer._address);

      console.log("Response balanceOf: ");
      console.log(response);
      txt.innerHTML = response;
    } catch (error) {
      console.log("Error en llamado de balanceOf de MPTK Contract");
      console.log(error.reason);
      txt.innerHTML = "Error";
      txtError.innerHTML = error.reason;
    }
  });

  //Approve MPTK
  var bttn = document.getElementById("approveButton");
  bttn.addEventListener("click", async function () {
    console.log("Btn approve MPTK...");

    var txtError = document.getElementById("approveError");
    var valorTxt = document.getElementById("approveInput").value;
    var value = BigNumber.from(`${valorTxt}000000000000000000`);
    console.log("Valor tokens: ", value);
    
    try {
      txtError.innerHTML = "";

      var response = await miPrTokenContract.connect(signer).approve(pubSContract.address, value);

      console.log("Response approve: ");
      console.log(response);
    } catch (error) {
      console.log("Error en llamado de approve de MPTK Contract");
      console.log(error.reason);
      txtError.innerHTML = error.reason;
    }
  });

  //Comprar NFT con id y MPTK
  var bttn = document.getElementById("purchaseButton");
  bttn.addEventListener("click", async function () {
    console.log("Btn purchase NFT con MPTK...");
    var idNft = document.getElementById("purchaseInput").value;
    var txtError = document.getElementById("purchaseError");

    try {
      txtError.innerHTML = "";

      var response = await pubSContract.connect(signer).purchaseNftById(idNft);

      console.log("Response purchaseNftById: ");
      console.log(response);
    } catch (error) {
      console.log("Error en llamado de purchase de CompraVenta Contract");
      console.log(error.reason);
      txtError.innerHTML = error.reason;
    }
  });

  
  var bttn = document.getElementById("purchaseEthButton");
  bttn.addEventListener("click", async function () {
    console.log("Btn purchase Nft (with Ether)...");
    var txtError = document.getElementById("purchaseEthError");

    try {
      txtError.innerHTML = "";

      const transaction = { value: ethers.utils.parseEther("0.01") };
      var response = await pubSContract.connect(signer).depositEthForARandomNft(transaction);

      console.log("Response depositEthForARandomNft: ");
      console.log(response);
    } catch (error) {
      console.log("Error en llamado de depositEthForARandomNft de CompraVenta Contract");
      console.log(error.reason);

      txtError.innerHTML = error.reason;
    }
  });

  var bttn = document.getElementById("sendEtherButton");
  bttn.addEventListener("click", async function () {
    console.log("Btn send Ether to Contract...");
    var txtError = document.getElementById("sendEtherError");

    try {
      txtError.innerHTML = "";
      
      var response = await signer.sendTransaction({ to: pubSContract.address, value: ethers.utils.parseEther("0.01")});

      console.log("Response sendTransaction: ");
      console.log(response);
    } catch (error) {
      console.log("Error en llamado de sendTransaction de CompraVenta Contract");
      console.log(error.reason);
      txtError.innerHTML = error.reason;
    }
  });
}

function setUpEventsContracts() {
  nftTknContract.on("Transfer", (from, to, tokenId) => {
    console.log("from", from);
    console.log("to", to);
    tokenId++;
    console.log("tokenId", tokenId);
    
    var li = document.createElement("li");
    li.classList.add('collection-item');
    // li.className = "collection-item";
    var p = document.createElement("p");
    var contenido = "Transfer from " + from + " to " + to + " tokenId " + tokenId;
    p.appendChild(document.createTextNode(contenido));
    document.querySelector("#nftList").appendChild(li).appendChild(p);
  });

}

async function setUp() {
  //Mostrar loading
  document.getElementById("loading").style.display = "block";
  initSCsGoerli();
  initSCsMumbai();
  await setUpListeners();
  setUpEventsContracts();
  //Ocultar loading
  document.getElementById("loading").style.display = "none";
}

setUp()
  .then()
  .catch((e) => console.log(e));

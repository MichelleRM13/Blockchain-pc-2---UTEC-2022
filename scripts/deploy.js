require("dotenv").config();

const { getRole, verify, ex, printAddress, deploySC, deploySCNoUp, } = require("../utils");

var MINTER_ROLE = getRole("MINTER_ROLE");

///-----------------------------------------------------------------------------------------------
// https://mumbai.polygonscan.com/address/0x0f53189420ef4A31C087cB14f6a7F972A14774A7              |
// add proxy: 0x0f53189420ef4A31C087cB14f6a7F972A14774A7                                          |
// add impl: 0xD2A3BE4EB47cD653b8471dd2B93801e37f1f03CB                                           |
///-----------------------------------------------------------------------------------------------
async function deployMumbai() {
  var relayerAddress = "0xfa967b9c4ae37b83bc3564b0aad2ce6d38fdf6a5";
  
  var name = "MiPrimerNft";
  var symbol = "MPRNFT";
  
  var nftContract = await deploySC("MiPrimerNft", [name, symbol]);
  var implementation = await printAddress("NFT", nftContract.address);

  // set up
  await ex(nftContract, "grantRole", [MINTER_ROLE, relayerAddress], "GR");
  await verify(implementation, "MiPrimerNft", []);
}

///-----------------------------------------------------------------------------------------------
// https://goerli.etherscan.io/address/0x523AAd1C3C4b0828BcEbe1815259709E5808c977#readContract    |
// add: 0x523AAd1C3C4b0828BcEbe1815259709E5808c977                                                |
///-----------------------------------------------------------------------------------------------
async function deployUSD() {
  var name = "USDCoin";
  var usdcContract = await deploySCNoUp(name, []);
  await verify(usdcContract.address, name, []);
}

///-----------------------------------------------------------------------------------------------
// https://goerli.etherscan.io/address/0x58D174E2317bD85ABc53918d34D26A8AF3d1aEb6                 |
// add proxy: 0x58D174E2317bD85ABc53918d34D26A8AF3d1aEb6                                          |
// add impl: 0xaa6C87F3F6aA1b3AbE4bbA1276D585145D9BbFfE                                           |
///-----------------------------------------------------------------------------------------------
async function deployMPTK() {
  var name = "MiPrimerToken";
  var mptContract = await deploySC(name, []);
  var implementation = await printAddress("MPTK SC", mptContract.address)
  await verify(implementation, name, []);
}

///-----------------------------------------------------------------------------------------------
// https://goerli.etherscan.io/address/0xA35493B493A85A3B6AD21Dd21eeEf19093A9d6CD                 |
// add proxy: 0xA35493B493A85A3B6AD21Dd21eeEf19093A9d6CD                                          |
// add impl: 0x2a7BB1f87a189d9c7A7ceC5bCA742Aa3AEFe7D99                                           |
//                                                                                                |
// https://app.safe.global/gor:0x652C5211c68D442856A53E6Ba3D91Fc64882e74f/balances                |
// address: 0x652C5211c68D442856A53E6Ba3D91Fc64882e74f                                            |
///-----------------------------------------------------------------------------------------------
async function deployPublicSale() {
  var name = "PublicSale";
  var publicSaleContract = await deploySC(name, []);
  var implementation = await printAddress("PublicSale SC", publicSaleContract.address)
  await verify(implementation, name, []);

  var miPrimerTokenAddress = "0x58D174E2317bD85ABc53918d34D26A8AF3d1aEb6";
  var tx = await publicSaleContract.setMiPrimerTokenAdd(miPrimerTokenAddress);
  await tx.wait(1);

  var gnosisAdress = "0x652C5211c68D442856A53E6Ba3D91Fc64882e74f";
  var tx = await publicSaleContract.setGnosisSafeWalletAdd(gnosisAdress);
  await tx.wait(1);
}

// deployMumbai()
// deployUSD()
// deployMPTK()
deployPublicSale()
  .catch((error) => {
    console.error("-------ERROR-------->>")
    console.error(error);
    process.exitCode = 1;
  });

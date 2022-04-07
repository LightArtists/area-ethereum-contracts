# Area Ethereum Contracts

:moneybag: ACTIVE BUG BOUNTY, SEE THE FILE [BUG-BOUNTY.md](BUG-BOUNTY.md).

## Introduction

**Area NFT contract**

The main NFT contract assigns and tracks ownership of [Plus Codes](https://github.com/google/open-location-code) on a distributed ledger. Some features are new, a brief and approximate explanation:

- **The drop**: Tokens are assigned randomly from a list of available tokens using a commit-reveal mechanism. Your purchase is revealed by the next purchaser or the contract owner. The security of this system depends on the next purchaser coming along within about 60 minutes (256 blocks), but it can degrade gracefully if that is not the case. A benevolence setting of 2 is customary.
- **Ghost minting**: A mechanism is used to generate up to 400 NFT tokens in one transaction without updating 400 storage locations. This technique is named "ghost minting".
- **Splitting**: Each NFT may be split geographically into 20 or 400 small pieces. The drop geographic areas are large, there's plenty of room to split down.

**Area marketplace contract**

This is an on-chain bid/offer marketplace inspired by CryptoPunks. Plans have been made to carbon-offset transactions made on the marketplace, but a timeline and details have not been announced yet.

The marketplace supports direct Ether payment and safe withdrawals. Rather than "accepting" bids or offers, each side of the transaction simply makes bids and offers and any intersection results in an immediate trade.

## Deploy

1. Deploy the NFT contract
2. Deploy the marketplace contract, referencing the NFT contract

## Run test suite

Setup

```sh
nvm install 12 # see special instructions above for M1 Mac
nvm use 12
npm install
```

Now run this each time you change contracts or test scripts:

```sh
npm run prepare
npm run lint # note, we do not use Prettier style for Solidity
FORCE_COLOR=1 ENABLE_GAS_REPORT=true npm run test
npm run test:inheritance
npm run coverage
```

## Contributing

When the Area contracts are deployed, this repository will stay to provide documentation and context for the code. Test cases and documentation may be updated, but the code will be fixed.

Please send pull requests to improve documentation and test cases. Please send issues for anything that might be improved.

## References

- Uses [best practices for developing Solidity projects](https://github.com/fulldecent/solidity-template)
- Great implementation examples for setting up automated testing are maintained in the [OpenZeppelin Contracts project](https://github.com/OpenZeppelin/openzeppelin-contracts)
- Hardhat is preferred for building
- A good review of setting up your editor to use tools here is provided [by Yarn](https://yarnpkg.com/getting-started/editor-sdks)
- Set up VS Code
  - See [Hardhat + Mocha notes](https://hardhat.org/guides/vscode-tests.html)
- Style
  - Follow automated test cases and Solidity style guide, especially use NatSpec everywhere
- Use the contract name in every revert message

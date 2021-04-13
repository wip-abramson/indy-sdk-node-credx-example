# Indy-sdk Node Verifiable Credential Exchange Example

This repo contains a simple script (index.js) demonstrating how the indy-sdk is used "under the hood" by Hyperledger Aries agents to implement verifiable credential exchange between a prover and an issuer. By reviewing this code it should help developers understand the mental model of credential exchange using the indy-sdk and the cryptography underpinning it in Hyperledger Ursa. It is this cryptography (CL-Signatures) that set some of the constraints and "quirky" interaction flows all the way up the stack.

## Requirements

* node v12
* [Indy-sdk libraries](https://github.com/hyperledger/indy-sdk#installing-the-sdk)

Note: Installing the indy-sdk can be challenging, at some point I will convert this to a docker setup. Even if you cannot get this installed it should still be worth looking through the index.js file to see the api exposed by the indy-sdk library.

## To Run

* `npm install`
* `node index.js`



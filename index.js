let indy = require("indy-sdk")
var fs = require('fs')
require("./setup")
let issuerStateFile = "issuer-state.json"
let issuerState = null
let proverStateFile = "prover-state.json"
let proverState = null
let credOffer = null
let credReq = null
let credObj = null

let schemasJson = {}
let credDefsJson = {}

let proofRequest = null
let proof = null

function loadConfig() {
    try {
        console.log("Reading issuer state")
        let issuerData = fs.readFileSync(issuerStateFile);
        issuerState = JSON.parse(issuerData)
        console.log("Issuer State Loaded", issuerState)
        console.log("Reading prover state")

        let proverData = fs.readFileSync(proverStateFile);

        proverState = JSON.parse(proverData)
        console.log("Prover State Loaded", proverState)
    }
    catch (e) {
        console.log("Error reading files", e)
    }

}

async function offerCredential(){
    let walletHandle = await indy.openWallet({"id": issuerState.wallet.id}, {"key": issuerState.wallet.key})
    // didObj = await indy.createAndStoreMyDid(wallet_handle, {})


    credOffer = await indy.issuerCreateCredentialOffer(walletHandle, issuerState.credDefObj[0])
    console.log("CRED OFFER", credOffer)

    let buf = Buffer.from(JSON.stringify(credOffer))
    console.log("CRED OFFER SIZE", buf.length)
    await indy.closeWallet(walletHandle)

}

// Note credOffer gets sent to prover
async function requestCredential() {

    let proverWalletHandle = await indy.openWallet({"id": proverState.wallet.id}, {"key": proverState.wallet.key})
    let proverDidObj = await indy.createAndStoreMyDid(proverWalletHandle, {})
    // didObj = [
    //     'CUTc1s32tcn7FyfT1rdGW',
    //     '7FhTjTDtWxu2vTUsZCjJqvRQxPx6or7GepP7NK321tp'
    // ]
    console.log("PROVER DID", proverDidObj)



    console.log("MS ID", proverState.masterSecretId)

    // NOTE: Cred Def must be retrieved from ledger
    credReq = await indy.proverCreateCredentialReq(proverWalletHandle, proverDidObj[0], credOffer, issuerState.credDefObj[1], proverState.masterSecretId)
    console.log("CRED_REQ", credReq)
    let buf = Buffer.from(JSON.stringify(credReq))
    console.log("CRED REQ SIZE", buf.length)
    await indy.closeWallet(proverWalletHandle)
}

// NOTE: credOffer sent back to Issuer
async function isssueCredential() {
    let walletHandle = await indy.openWallet({"id": issuerState.wallet.id}, {"key": issuerState.wallet.key})

    // Cred values populated
    let credValues = {
        "name": {"raw": "will", "encoded": "1234123"},
        "dob": {"raw": "today", "encoded": "12312312"}
    }
    // let handle = await indy.openBlobStorageReader("item", {})
    // console.log("BLOB HANDLE", handle)

    credObj = await indy.issuerCreateCredential(walletHandle, credOffer, credReq[0], credValues, null, walletHandle)
    console.log("CRED", credObj)
    let buf = Buffer.from(JSON.stringify(credObj))
    console.log("CRED SIZE", buf.length)
    await indy.closeWallet(walletHandle)


}

// NOTE: Credential sent to prover
async function storeCredential() {
    let proverWalletHandle = await indy.openWallet({"id": proverState.wallet.id}, {"key": proverState.wallet.key})

    // NOTE: Must resolve the credDef from the ledger. What size is it?
    console.log(credObj)

    newCredObj = credObj[0]
    // newCredObj["signature_correctness_proof"]["c"] = "101664490562697192405111716084932546690441415015211660820555677451137543494801"
    console.log(newCredObj)
    credId = await indy.proverStoreCredential(proverWalletHandle, null, credReq[1], newCredObj, issuerState.credDefObj[1], null)

    console.log("Cred ID", credId)

    await indy.closeWallet(proverWalletHandle)

}

async function createProofRequest() {

    let nonce = await indy.generateNonce()


    proofRequest = {
        "name": "Test Proof Request",
        "version": "123",
        "nonce": nonce,
        "requested_attributes": {
            // Note: We can add restrictions but may not want to. Will affect sizes. Worth talking about in paper though
            "0_name_uuid": {"name": "name"}, //, "restrictions": [{"schema_id": proverState.schemaObj[0]}]},
            "0_dob_uuid": {"name": "dob"}//, "restrictions": [{"schema_id": proverState.schemaObj[0]}]},
        },
        "requested_predicates": {

        },
        "non_revoked": null
    }


}

// NOTE: proofRequest sent to prover. This includes a nonce which acts similarly to challenge in other cred sig methods
async function createProof() {
    let proverWalletHandle = await indy.openWallet({"id": proverState.wallet.id}, {"key": proverState.wallet.key})

    let searchHandle = await indy.proverSearchCredentialsForProofReq(proverWalletHandle, proofRequest)

    // Note these are hard coded. Will need to change if we change the proofRequest and credential schema
    let nameRef = "0_name_uuid"
    let nameCred = await indy.proverFetchCredentialsForProofReq(searchHandle, nameRef, 1)

    let dobRef = "0_dob_uuid"
    let dobCred = await indy.proverFetchCredentialsForProofReq(searchHandle, dobRef, 1)
    console.log("CREDENTIALS", nameCred, dobCred)

    // let close = await indy.proverCloseCredentialsSearch(searchHandle)

    let requestedCredentials = {
        "self_attested_attributes": {},
        "requested_attributes": {

        },
        "requested_predicates": {}
    }

    requestedCredentials["requested_attributes"][nameRef] = {"cred_id": nameCred[0]["cred_info"]["referent"], "timestamp": null, "revealed": true},
        requestedCredentials["requested_attributes"][dobRef] = {"cred_id": dobCred[0]["cred_info"]["referent"], "timestamp": null, "revealed": true}
    console.log("Req Creds", requestedCredentials)

    // NOTE: Prover must have access to the schema and cred def objects. These will be resolved from the ledger using the ID's found in the credential cred_info
    schemasJson[issuerState.schemaObj[0]] = issuerState.schemaObj[1]
    console.log("SCHEMAS", schemasJson)
    credDefsJson[issuerState.credDefObj[0]] =issuerState.credDefObj[1]
    console.log("DEFS", credDefsJson)


    proof = await indy.proverCreateProof(proverWalletHandle, proofRequest, requestedCredentials, proverState.masterSecretId, schemasJson, credDefsJson, {})

    console.log("PROOF", proof)
}

// the proof must be sent from the prover
async function verifyProof() {

    // NOTE: again schemasJson and credDefsJson would be created by resolution against ledger
    // Note: usually the verifier and issuer would be different
    let valid = await indy.verifierVerifyProof(proofRequest,proof,schemasJson,credDefsJson,{},{})

    console.log("IS VALID", valid)

    let buf = Buffer.from(JSON.stringify(issuerState.credDefObj[1]))
    console.log("CRED DEF SIZE", buf.length)

    let buf1 = Buffer.from(JSON.stringify(issuerState.schemaObj[1]))
    console.log("SCHEMA SIZE", buf1.length)
}

async function run() {

    loadConfig()

    // Might have to save some more state to files.
    await offerCredential()
    await requestCredential()
    await isssueCredential()
    await storeCredential()

    await createProofRequest()
    await createProof()
    await verifyProof()
}

run()

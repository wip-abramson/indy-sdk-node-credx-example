var indy = require('indy-sdk')
var fs = require('fs')
// if you do not provide a callback, a Promise is returned
async function setup() {

    fs.readFile('issuer-state.json', async (err, data) => {
        if (err) {
            console.log("Initialising Issuer")
            await initialiseIssuer()
        }
        console.log("Issuer state initialised")

    });

    fs.readFile('prover-state.json', async (err, data) => {
        if (err) {
            console.log("Initialising prover")
            await initialiseProver()
        }
        console.log("Prover state initialised")

    });


}

async function initialiseProver() {
    let proverWallet = {id: "prover_id", key: "someproverkey"}
    try {
        await indy.createWallet({"id": proverWallet.id}, {"key": proverWallet.key})
    } catch (e) {
        console.log("Error creating wallet. It probably already exists", e)
    }
    let proverWalletHandle = await indy.openWallet({"id": proverWallet.id}, {"key": proverWallet.key})

    let masterSecretId = "provermastersecret"
    await indy.proverCreateMasterSecret(proverWalletHandle, masterSecretId)

    let proverState = {
        masterSecretId: masterSecretId,
        wallet: proverWallet
    }

    let data = JSON.stringify(proverState)
    fs.writeFileSync('prover-state.json', data);

    await indy.closeWallet(proverWalletHandle)



}

async function initialiseIssuer() {
    let issuerWallet = {id: "issuer_id", key: "someissuerkey"}
    try {
        await indy.createWallet({"id": issuerWallet.id}, {"key": issuerWallet.key})
    } catch (e) {
        console.log("Error creating wallet. It probably already exists", e)
    }

    let issuerWalletHandle = await indy.openWallet({"id": issuerWallet.id}, {"key": issuerWallet.key})

    let issuerDidObj = await indy.createAndStoreMyDid(issuerWalletHandle, {})
    console.log("ISSUER DID", issuerDidObj)
    let schemaObj = await indy.issuerCreateSchema(issuerDidObj[0], "mytest2","1111",["name","dob"])
    console.log("SCHEMA", schemaObj)

    let credDefObj = await indy.issuerCreateAndStoreCredentialDef(issuerWalletHandle, issuerDidObj[0], schemaObj[1], "first")
    console.log("CRED DEF", credDefObj)

    let issuerState = {
        wallet: issuerWallet,
        credDefObj: credDefObj,
        schemaObj: schemaObj
    }

    let data = JSON.stringify(issuerState)
    fs.writeFileSync('issuer-state.json', data);

    await indy.closeWallet(issuerWalletHandle)
}

setup()

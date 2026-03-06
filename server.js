import express from "express"
import cors from "cors"
import crypto from "crypto"

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 10000

/* DATABASE (IN MEMORY) */

const keys = {}

/* RANDOM ENGINE */

function rand(max){
return Math.floor(Math.random()*max)
}

function token(prefix){
return prefix+"_"+crypto.randomBytes(6).toString("hex")
}

const countries=["US","UK","DE","SG","BR"]
const banks=["global_bank","retail_bank","metro_credit"]
const devices=["ios","android","linux","windows"]
const merchants=["retail","travel","gaming","crypto"]

/* GENERATOR */

function entity(){

return{

entity_id:token("ent"),
country:countries[rand(countries.length)],
risk:Math.random(),
customer_since:Date.now()-rand(1000000000)

}

}

function account(){

return{

account_id:token("acct"),
bank:banks[rand(banks.length)],
currency:"USD",
balance:rand(200000)

}

}

function device(){

return{

device_id:token("dev"),
os:devices[rand(devices.length)],
trust_score:Math.random()

}

}

function merchant(){

return{

merchant_id:token("mer"),
category:merchants[rand(merchants.length)],
risk_level:Math.random()

}

}

function transaction(){

return{

tx_id:token("tx"),
account_id:token("acct"),
merchant:merchant(),
amount:rand(3000),
timestamp:Date.now(),
channel:["card","wire","crypto","online"][rand(4)]

}

}

function universe(){

const tx=transaction()

return{

entity:entity(),
account:account(),
device:device(),
transaction:tx,
risk_score:Math.random(),
metadata:{
engine:"synthetic-financial-universe",
version:"1.0"
}

}

}

/* API KEY SYSTEM */

app.post("/create-key",(req,res)=>{

const key="sf_"+crypto.randomBytes(12).toString("hex")

keys[key]={

credits:1

}

res.json({

api_key:key,
free_calls:1

})

})

/* ADD CREDITS */

app.post("/add-credits",(req,res)=>{

const {key,amount}=req.body

if(!keys[key]){

return res.status(401).json({error:"invalid key"})

}

keys[key].credits+=amount

res.json({credits:keys[key].credits})

})

/* AUTH */

function auth(req,res,next){

const key=req.headers["x-api-key"]

if(!keys[key]){

return res.status(401).json({error:"invalid key"})

}

if(keys[key].credits<=0){

return res.status(403).json({error:"no credits"})

}

keys[key].credits--

next()

}

/* API */

app.get("/api/universe",auth,(req,res)=>{

res.json(universe())

})

/* STREAM */

app.get("/stream",auth,(req,res)=>{

res.setHeader("Content-Type","text/event-stream")
res.setHeader("Cache-Control","no-cache")

setInterval(()=>{

res.write(`data: ${JSON.stringify(universe())}\n\n`)

},1000)

})

app.listen(PORT,()=>{

console.log("API running")

})

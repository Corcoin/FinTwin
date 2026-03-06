import express from "express"
import cors from "cors"
import crypto from "crypto"

const app = express()

app.use(cors())
app.use(express.json())

/* ===============================
   API KEY DATABASE (memory)
================================ */

const users = {}

/* ===============================
   RANDOM ENGINE
================================ */

function rand(max=1){
return Math.random()*max
}

function id(prefix){
return prefix+"_"+crypto.randomBytes(4).toString("hex")
}

const countries=["US","UK","DE","SG","BR"]
const devices=["ios","android","windows","linux"]
const banks=["global_bank","metro_credit","retail_bank"]

/* ===============================
   GENERATORS
================================ */

function entity(){
return{
entity_id:id("ent"),
country:countries[Math.floor(rand(countries.length))],
risk:rand()
}
}

function bank(){
return{
bank_id:id("bank"),
name:banks[Math.floor(rand(banks.length))],
country:countries[Math.floor(rand(countries.length))]
}
}

function account(){
return{
account_id:id("acct"),
bank:banks[Math.floor(rand(banks.length))],
balance:Math.floor(rand(100000))
}
}

function device(){
return{
device_id:id("dev"),
os:devices[Math.floor(rand(devices.length))],
trust_score:rand()
}
}

function session(){
return{
session_id:id("ses"),
device_id:id("dev"),
login_time:Date.now()
}
}

function transaction(){
return{
tx_id:id("tx"),
amount:Math.floor(rand(5000)),
currency:"USD",
channel:["card","wire","online"][Math.floor(rand(3))],
timestamp:Date.now()
}
}

function fraudRing(){
return{
ring_id:id("ring"),
members:[id("ent"),id("ent"),id("ent")],
score:rand()
}
}

function amlFlow(){

const nodes=[id("acct"),id("acct"),id("acct")]

return{
flow_id:id("aml"),
nodes,
edges:[
{from:nodes[0],to:nodes[1],amount:rand(9000)},
{from:nodes[1],to:nodes[2],amount:rand(9000)}
]
}

}

/* ===============================
   MEMORY POOLS (for scaling)
================================ */

const pools={
entity:[],
bank:[],
account:[],
device:[],
session:[],
transaction:[],
fraud:[],
aml:[]
}

function refill(){

for(let i=0;i<5000;i++){

pools.entity.push(entity())
pools.bank.push(bank())
pools.account.push(account())
pools.device.push(device())
pools.session.push(session())
pools.transaction.push(transaction())
pools.fraud.push(fraudRing())
pools.aml.push(amlFlow())

}

}

refill()

setInterval(()=>{
if(pools.entity.length<1000) refill()
},2000)

/* ===============================
   AUTH
================================ */

function auth(req,res,next){

const key=req.headers["x-api-key"]

if(!users[key]){
return res.status(401).json({error:"invalid key"})
}

if(users[key].credits<=0){
return res.status(402).json({error:"no credits"})
}

users[key].credits-=1

next()
}

/* ===============================
   KEY CREATION
================================ */

app.post("/create-key",(req,res)=>{

const key="sf_"+crypto.randomBytes(8).toString("hex")

users[key]={credits:1}

res.json({
api_key:key,
free_calls:1,
price_per_call:"$0.01"
})

})

/* ===============================
   ADD CREDITS
================================ */

app.post("/add-credits",(req,res)=>{

const {key,amount}=req.body

if(!users[key]) return res.json({error:"invalid key"})

users[key].credits+=amount

res.json({credits:users[key].credits})

})

/* ===============================
   API ROUTES
================================ */

app.get("/api/entity",auth,(req,res)=>res.json(pools.entity.pop()))
app.get("/api/bank",auth,(req,res)=>res.json(pools.bank.pop()))
app.get("/api/account",auth,(req,res)=>res.json(pools.account.pop()))
app.get("/api/device",auth,(req,res)=>res.json(pools.device.pop()))
app.get("/api/session",auth,(req,res)=>res.json(pools.session.pop()))
app.get("/api/transaction",auth,(req,res)=>res.json(pools.transaction.pop()))
app.get("/api/fraud-ring",auth,(req,res)=>res.json(pools.fraud.pop()))
app.get("/api/aml-flow",auth,(req,res)=>res.json(pools.aml.pop()))

/* ===============================
   LIVE STREAM
================================ */

app.get("/stream",(req,res)=>{

res.setHeader("Content-Type","text/event-stream")
res.setHeader("Cache-Control","no-cache")
res.setHeader("Connection","keep-alive")

setInterval(()=>{

const data={
entity:pools.entity.pop(),
account:pools.account.pop(),
device:pools.device.pop(),
transaction:pools.transaction.pop()
}

res.write(`data: ${JSON.stringify(data)}\n\n`)

},1000)

})

/* ===============================
   SERVER
================================ */

const PORT=process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("API running on port "+PORT)
})

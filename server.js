import express from "express"
import cors from "cors"
import { v4 as uuidv4 } from "uuid"

const app = express()

app.use(cors())
app.use(express.json())

/* ===============================
DATABASE (memory)
=============================== */

const users = {}

/* ===============================
UTILS
=============================== */

function rand(max){
return Math.floor(Math.random()*max)
}

function pick(arr){
return arr[rand(arr.length)]
}

function id(prefix){
return prefix+"_"+Math.random().toString(36).substring(2,10)
}

/* ===============================
GENERATOR ENGINE
=============================== */

function entity(){
return{
entity_id:id("ent"),
country:pick(["US","UK","DE","SG","BR","AU"]),
risk_profile:Math.random(),
created:Date.now()
}
}

function account(){
return{
account_id:id("acct"),
bank:pick(["retail_bank","global_bank","metro_bank"]),
currency:pick(["USD","EUR","GBP"]),
balance:rand(200000)
}
}

function device(){
return{
device_id:id("dev"),
os:pick(["ios","android","windows","linux","mac"]),
fingerprint:id("fp"),
trust_score:Math.random()
}
}

function session(){
return{
session_id:id("ses"),
device_id:id("dev"),
login_time:Date.now(),
duration:rand(4000)
}
}

function merchant(){
return{
merchant_id:id("mer"),
category:pick(["retail","travel","gaming","crypto","electronics"]),
country:pick(["US","UK","DE"])
}
}

function transaction(){
return{
tx_id:id("tx"),
account_id:id("acct"),
merchant:merchant(),
amount:rand(5000),
currency:"USD",
channel:pick(["card","online","wire","crypto"]),
timestamp:Date.now()
}
}

function fraudRing(){
let members=[]
for(let i=0;i<5;i++){
members.push(id("ent"))
}

return{
ring_id:id("ring"),
members,
coordination_score:Math.random()
}
}

function amlFlow(){

let nodes=[]
let edges=[]

for(let i=0;i<6;i++){
nodes.push(id("acct"))
}

for(let i=0;i<7;i++){

edges.push({
from:pick(nodes),
to:pick(nodes),
amount:rand(9000)
})

}

return{
flow_id:id("aml"),
nodes,
edges
}

}

function universe(){

let tx=transaction()

return{
entity:entity(),
account:account(),
device:device(),
session:session(),
transaction:tx,
fraud_ring:fraudRing(),
aml_flow:amlFlow(),
generated:Date.now()
}

}

/* ===============================
API KEY
=============================== */

app.post("/create-key",(req,res)=>{

const key="sk_"+uuidv4()

users[key]={

credits:1,
calls:0

}

res.json({

api_key:key,
free_calls:1

})

})

/* ===============================
PAYMENT CREDIT
=============================== */

app.post("/add-credits",(req,res)=>{

const {key,amount}=req.body

if(!users[key]) return res.status(400).send("invalid key")

const credits=amount*100

users[key].credits+=credits

res.json({

message:"credits added",
credits:users[key].credits

})

})

/* ===============================
AUTH
=============================== */

function auth(req,res,next){

const key=req.headers["x-api-key"] || req.query.key

if(!key || !users[key])
return res.status(401).send("invalid api key")

if(users[key].credits<=0)
return res.status(402).send("no credits")

users[key].credits--
users[key].calls++

next()

}

/* ===============================
API ENDPOINTS
=============================== */

app.get("/api/entity",auth,(req,res)=>{
res.json(entity())
})

app.get("/api/account",auth,(req,res)=>{
res.json(account())
})

app.get("/api/transaction",auth,(req,res)=>{
res.json(transaction())
})

app.get("/api/fraud",auth,(req,res)=>{
res.json(fraudRing())
})

app.get("/api/aml",auth,(req,res)=>{
res.json(amlFlow())
})

app.get("/api/universe",auth,(req,res)=>{
res.json(universe())
})

/* ===============================
FIREHOSE STREAM
=============================== */

app.get("/api/firehose",auth,(req,res)=>{

res.setHeader("Content-Type","text/event-stream")
res.setHeader("Cache-Control","no-cache")
res.setHeader("Connection","keep-alive")

const interval=setInterval(()=>{

const data=universe()

res.write(`data: ${JSON.stringify(data)}\n\n`)

},500)

req.on("close",()=>{
clearInterval(interval)
})

})

/* ===============================
SERVER
=============================== */

const PORT=process.env.PORT || 4000

app.listen(PORT,()=>{
console.log("API running on port "+PORT)
})

import express from "express"
import cors from "cors"
import crypto from "crypto"
import path from "path"
import { fileURLToPath } from "url"

const app = express()

app.use(cors())
app.use(express.json())

/* ===============================
PATH FIX
================================ */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ===============================
SERVE INDEX
================================ */

app.get("/",(req,res)=>{
res.sendFile(path.join(__dirname,"index.html"))
})

/* ===============================
DATABASE
================================ */

const users={}
const rateLimits={}

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

/* ===============================
POOLS
================================ */

const pools={
entity:[],
bank:[],
account:[],
device:[],
transaction:[],
fraud:[]
}

function refill(){

for(let i=0;i<5000;i++){
pools.entity.push(entity())
pools.bank.push(bank())
pools.account.push(account())
pools.device.push(device())
pools.transaction.push(transaction())
pools.fraud.push(fraudRing())
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

users[key].credits--
users[key].calls++

next()

}

/* ===============================
RATE LIMIT
================================ */

function rateLimit(req,res,next){

const key=req.headers["x-api-key"]

if(!rateLimits[key]){
rateLimits[key]={count:0,time:Date.now()}
}

const window=1000
const limit=50

if(Date.now()-rateLimits[key].time>window){
rateLimits[key].count=0
rateLimits[key].time=Date.now()
}

rateLimits[key].count++

if(rateLimits[key].count>limit){
return res.status(429).json({error:"rate limit exceeded"})
}

next()

}

/* ===============================
CREATE KEY
================================ */

app.post("/create-key",(req,res)=>{

const key="sf_"+crypto.randomBytes(8).toString("hex")

users[key]={
credits:1,
calls:0
}

res.json({
api_key:key,
credits:1
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
DASHBOARD
================================ */

app.get("/dashboard",(req,res)=>{

const key=req.headers["x-api-key"]

if(!users[key]) return res.json({error:"invalid key"})

res.json(users[key])

})

/* ===============================
API ROUTES
================================ */

app.get("/api/entity",auth,rateLimit,(req,res)=>res.json(pools.entity.pop()))
app.get("/api/bank",auth,rateLimit,(req,res)=>res.json(pools.bank.pop()))
app.get("/api/account",auth,rateLimit,(req,res)=>res.json(pools.account.pop()))
app.get("/api/device",auth,rateLimit,(req,res)=>res.json(pools.device.pop()))
app.get("/api/transaction",auth,rateLimit,(req,res)=>res.json(pools.transaction.pop()))
app.get("/api/fraud-ring",auth,rateLimit,(req,res)=>res.json(pools.fraud.pop()))

/* ===============================
DATASET DOWNLOAD
================================ */

app.get("/download",(req,res)=>{

let data=[]

for(let i=0;i<10000;i++){
data.push(transaction())
}

res.setHeader("Content-Disposition","attachment; filename=dataset.json")

res.json(data)

})

/* ===============================
NETWORK GRAPH
================================ */

app.get("/network",(req,res)=>{

const nodes=[]
const edges=[]

for(let i=0;i<10;i++){
nodes.push(bank())
}

for(let i=0;i<20;i++){

edges.push({
from:nodes[Math.floor(rand(nodes.length))].bank_id,
to:nodes[Math.floor(rand(nodes.length))].bank_id,
amount:Math.floor(rand(100000))
})

}

res.json({nodes,edges})

})

/* ===============================
STREAM
================================ */

app.get("/stream",(req,res)=>{

res.setHeader("Content-Type","text/event-stream")
res.setHeader("Cache-Control","no-cache")
res.setHeader("Connection","keep-alive")

const interval=setInterval(()=>{

const data={
entity:pools.entity.pop(),
account:pools.account.pop(),
transaction:pools.transaction.pop()
}

res.write(`data: ${JSON.stringify(data)}\n\n`)

},1000)

req.on("close",()=>{
clearInterval(interval)
})

})

/* ===============================
SERVER
================================ */

const PORT=process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("API running on port "+PORT)
})

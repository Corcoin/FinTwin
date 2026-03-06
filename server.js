import express from "express"
import cors from "cors"
import crypto from "crypto"
import path from "path"
import { fileURLToPath } from "url"

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ===============================
SERVE INDEX
================================ */

app.get("/", (req,res)=>{
res.sendFile(path.join(__dirname,"index.html"))
})

/* ===============================
DATABASE
================================ */

const users={}
const rateLimits={}

/* ===============================
UTILS
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

function amlFlow(){
return{
flow_id:id("aml"),
risk_score:rand(),
path:[id("acct"),id("acct"),id("acct")]
}
}

function session(){
return{
session_id:id("sess"),
device:devices[Math.floor(rand(devices.length))],
ip:`192.168.${Math.floor(rand(255))}.${Math.floor(rand(255))}`,
timestamp:Date.now()
}
}

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
const limit=500

if(Date.now()-rateLimits[key].time>window){
rateLimits[key].count=0
rateLimits[key].time=Date.now()
}

rateLimits[key].count++

if(rateLimits[key].count>limit){
return res.status(429).json({error:"rate limit"})
}

next()
}

/* ===============================
CREATE KEY
================================ */

app.post("/create-key",(req,res)=>{

const key="sf_"+crypto.randomBytes(8).toString("hex")

users[key]={
credits:100000,
calls:0
}

res.json({
api_key:key,
credits:100000
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

app.get("/api/entity",auth,rateLimit,(req,res)=>res.json(entity()))
app.get("/api/bank",auth,rateLimit,(req,res)=>res.json(bank()))
app.get("/api/account",auth,rateLimit,(req,res)=>res.json(account()))
app.get("/api/device",auth,rateLimit,(req,res)=>res.json(device()))
app.get("/api/transaction",auth,rateLimit,(req,res)=>res.json(transaction()))
app.get("/api/fraud-ring",auth,rateLimit,(req,res)=>res.json(fraudRing()))
app.get("/api/aml-flow",auth,rateLimit,(req,res)=>res.json(amlFlow()))
app.get("/api/session",auth,rateLimit,(req,res)=>res.json(session()))

/* ===============================
STREAM
================================ */

app.get("/stream",(req,res)=>{

res.setHeader("Content-Type","text/event-stream")
res.setHeader("Cache-Control","no-cache")
res.setHeader("Connection","keep-alive")

const interval=setInterval(()=>{

const data={
entity:entity(),
account:account(),
transaction:transaction()
}

res.write(`data: ${JSON.stringify(data)}\n\n`)

},1000)

const heartbeat=setInterval(()=>{
res.write(": ping\n\n")
},15000)

req.on("close",()=>{
clearInterval(interval)
clearInterval(heartbeat)
})

})

/* ===============================
SERVER
================================ */

const PORT=process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("API running on "+PORT)
})

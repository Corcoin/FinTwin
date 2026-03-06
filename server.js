import express from "express"
import cors from "cors"
import { v4 as uuidv4 } from "uuid"

const app = express()

app.use(cors())
app.use(express.json())

/* ---------------- USERS ---------------- */

let users = {}

function createUser(){

const key = "sf_" + uuidv4()

users[key] = {
credits:0,
usage:0
}

return key

}

/* ---------------- SERVE SITE ---------------- */

app.get("/",(req,res)=>{
res.sendFile(process.cwd()+"/index.html")
})

/* ---------------- CREATE KEY ---------------- */

app.post("/create-key",(req,res)=>{

const key = createUser()

res.json({
api_key:key
})

})

/* ---------------- DASHBOARD ---------------- */

app.get("/dashboard",(req,res)=>{

const key = req.headers["x-api-key"]

if(!users[key])
return res.status(401).json({error:"invalid key"})

res.json(users[key])

})

/* ---------------- CREDIT PURCHASE ---------------- */

app.post("/purchase",(req,res)=>{

const {key,credits} = req.body

if(!users[key])
return res.status(401).json({error:"invalid key"})

users[key].credits += credits

res.json({
success:true,
credits:users[key].credits
})

})

/* ---------------- BILLING ---------------- */

function charge(req,res,next){

const key = req.headers["x-api-key"]

if(!users[key])
return res.status(401).json({error:"invalid key"})

if(users[key].credits <= 0)
return res.status(402).json({error:"no credits"})

users[key].credits -= 1
users[key].usage += 1

next()

}

/* ---------------- GENERATOR ---------------- */

function r(min,max){
return Math.floor(Math.random()*(max-min)+min)
}

/* ---------------- APIs ---------------- */

app.get("/api/entity",charge,(req,res)=>{

res.json({
entity_id:uuidv4(),
name:"Entity_"+r(1000,9999),
country:"US"
})

})

app.get("/api/bank",charge,(req,res)=>{

res.json({
bank_id:uuidv4(),
bank_name:"Bank_"+r(100,999),
swift:"US"+r(1000,9999)
})

})

app.get("/api/account",charge,(req,res)=>{

res.json({
account_id:uuidv4(),
balance:r(100,100000),
currency:"USD"
})

})

app.get("/api/device",charge,(req,res)=>{

res.json({
device_id:uuidv4(),
ip:`192.168.${r(0,255)}.${r(0,255)}`,
os:"ios"
})

})

app.get("/api/session",charge,(req,res)=>{

res.json({
session_id:uuidv4(),
duration:r(10,500),
status:"active"
})

})

app.get("/api/transaction",charge,(req,res)=>{

res.json({
tx_id:uuidv4(),
amount:r(5,20000),
currency:"USD"
})

})

app.get("/api/fraud-ring",charge,(req,res)=>{

res.json({
ring_id:uuidv4(),
members:r(3,15),
risk_score:r(70,99)
})

})

app.get("/api/aml-flow",charge,(req,res)=>{

res.json({
flow_id:uuidv4(),
layering_steps:r(2,8),
flagged:true
})

})

/* ---------------- STREAM ---------------- */

let clients=[]

app.get("/stream",(req,res)=>{

res.setHeader("Content-Type","text/event-stream")
res.setHeader("Cache-Control","no-cache")
res.setHeader("Connection","keep-alive")

clients.push(res)

})

setInterval(()=>{

const event = JSON.stringify({
time:new Date().toISOString(),
amount:r(10,20000),
country:"US"
})

clients.forEach(c=>{
c.write(`data: ${event}\n\n`)
})

},1000)

/* ---------------- START SERVER ---------------- */

app.listen(3000,()=>{
console.log("Server running on 3000")
})

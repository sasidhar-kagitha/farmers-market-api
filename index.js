const {v4:uuid} = require('uuid');
const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const jwt = require('jsonwebtoken')

const SECERET_KEY = "F6A1R18M13E5R18S19";


const dbPath = path.join(__dirname,'farmersMarket.db');

let db = "";        

const app = express()
app.use(express.json())
app.use(cors())

const jwtTokenVerify=(req,res,next)=>{
   const authorizationHeader = req.headers['authorization'];

  if (!authorizationHeader) {
    return res.status(401).json({ error: 'Unauthorized Access' });
  }

  const token = authorizationHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, SECERET_KEY);
    req.user = decoded; // Optional: attach user data to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const initalizeDbConnection = async ()=>{
    try{
        db = await open({
            filename:dbPath,
            driver:sqlite3.Database
        })

        app.listen(3010,()=>{
            console.log("Server is running at 3010");
            
        })

    }
    catch(e)
    {
        console.error("DB error");
    }
}


initalizeDbConnection();

app.get('/',async(req,res)=>{

    const getAllUser = `select *from users;`
    const data = await db.all(getAllUser);
    res.send(data);

})

//user registration

app.post('/register',async(req,res)=>{
    const {body} = req 

    const {userName,password} = body
    const id= uuid() 

   const getUserQuery =`select *from users where user_name='${userName}';`
   
   const getUser = await db.get(getUserQuery); 

   if(getUser===undefined)
   {
    const hashPassword = await bcrypt.hash(password,10);
    const dbUserAddQuery = `insert into users values('${id}','${userName}','${hashPassword}');`

    const result = await db.run(dbUserAddQuery);
    
    res.status(201).send({success:"user successfully created"});
   
   }else{
    res.status(500).send({error:"user already exits"});
    
   }
})


//user login 

app.post('/login',async(req,res)=>{
    const {body} = req 
    console.log(body)
    

    const getUserQuery  = `select *from users where user_name='${body.userName}';`;

    const getUser = await db.get(getUserQuery);

    console.log(getUser);

    if(getUser == undefined)
    {
        res.status(501).send({error:"Invalid user!!"});
    }
    const passwordVerfiy = await bcrypt.compare(body.password,getUser.password);
    
    if(passwordVerfiy)
    {
        const playLoad = {
            userId:getUser.user_id,
            userName:getUser.user_name,
        }

        const jwtToken = jwt.sign(playLoad,SECERET_KEY,{expiresIn:"3h"}); 

        res.send({jwt_token:jwtToken});
        
    }else{
        res.status(501).send({error:"password didn't match"});
    }


})

//get all products 
app.get('/products',jwtTokenVerify,async(req,res)=>{
    const query=`select product_id,img_url,title,price,name,location,category,unit from products;`
    const result = await db.all(query);
    res.send(result);
})

app.get('/todayPicks',jwtTokenVerify,async(req,res)=>{
    const query=`select product_id,img_url,title,price,name,location,category,unit from products order by date_added desc limit 5;`
    const result = await db.all(query);
    res.send(result);
})
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

const SECRET_KEY = "F6A1R18M13E5R18S19";
const dbPath = path.join(__dirname, 'farmersMarket.db');

const db = new Database(dbPath); // better-sqlite3 is synchronous

const app = express();
app.use(express.json());
app.use(cors());

// JWT Token verification middleware
const jwtTokenVerify = (req, res, next) => {
  const authorizationHeader = req.headers['authorization'];

  if (!authorizationHeader) {
    return res.status(401).json({ error: 'Unauthorized Access' });
  }

  const token = authorizationHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Root endpoint: Get all users
app.get('/', (req, res) => {
  try {
    const getAllUser = `SELECT * FROM users;`;
    const data = db.prepare(getAllUser).all();
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// User registration
app.post('/register', async (req, res) => {
  const { userName, password } = req.body;
  const id = uuid();

  try {
    const getUserQuery = `SELECT * FROM users WHERE user_name = ?;`;
    const getUser = db.prepare(getUserQuery).get(userName);

    if (!getUser) {
      const hashPassword = await bcrypt.hash(password, 10);
      const insertQuery = `INSERT INTO users (user_id, user_name, password) VALUES (?, ?, ?);`;
      db.prepare(insertQuery).run(id, userName, hashPassword);
      res.status(201).send({ success: "User successfully created" });
    } else {
      res.status(409).send({ error: "User already exists" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// User login
app.post('/login', async (req, res) => {
  const { userName, password } = req.body;

  try {
    const getUserQuery = `SELECT * FROM users WHERE user_name = ?;`;
    const getUser = db.prepare(getUserQuery).get(userName);

    if (!getUser) {
      return res.status(401).send({ error: "Invalid user!" });
    }

    const passwordMatch = await bcrypt.compare(password, getUser.password);
    if (passwordMatch) {
      const payload = {
        userId: getUser.user_id,
        userName: getUser.user_name
      };

      const jwtToken = jwt.sign(payload, SECRET_KEY, { expiresIn: "3h" });
      res.send({ jwt_token: jwtToken });
    } else {
      res.status(401).send({ error: "Password didn't match" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get all products
app.get('/products', jwtTokenVerify, (req, res) => {
  try {
    const query = `SELECT product_id, img_url, title, price, name, location, category, unit FROM products;`;
    const result = db.prepare(query).all();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get latest 5 products
app.get('/todayPicks', jwtTokenVerify, (req, res) => {
  try {
    const query = `
      SELECT product_id, img_url, title, price, name, location, category, unit 
      FROM products 
      ORDER BY date_added DESC 
      LIMIT 5;`;
    const result = db.prepare(query).all();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Start server
app.listen(3010, () => {
  console.log("Server is running at http://localhost:3010");
});

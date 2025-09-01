const express = require("express");
const bcrypt = require("bcrypt");
const { request } = require("http");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, "user.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    console.log("DB Path:", dbPath); // Debug path
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();      // very important

// ==================== Register users ====================

app.post("/usersregister/",async(request,response) => {
  const {id,username,password,name,gender,location} = request.body;
  const hashedPassword = await bcrypt.hash(password,10) ;           // 10 is saltRounds
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`; 
  const dbUser = await db.get(selectUserQuery); 

  if(dbUser === undefined) {
    // create user in user table
    const createUserQuery = `INSERT INTO users (id,username,password,name,gender,location) VALUES
                             ('${id}',
                             '${username}',
                             '${hashedPassword}',
                             '${name}',
                             '${gender}',
                             '${location}')`;
    await db.run(createUserQuery);
    response.send("User created sucessfully");
  }else {
    // send invalid user name as response
    response.status(400);
    response.send("User already exists");
  }
});

// ==================== Login Users Authentication =================

app.post("/login/", async(request,response) => {
  const { username,password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    // user doesn't exist
    response.status(400);
    response.send("Invalid User");
  } else {
    // compare password, hashed password 
    const isPasswordMatched = await bcrypt.compare(password,dbUser.password);
    if (isPasswordMatched === true){
      const payload = { username: username };
      const jwtToken = jwt.sign(payload,"MY_SECRET_TOKEN");
      response.send({jwtToken});
    } else {
      response.status(400);
      response.send(" Invalid Password");
    }
  }
});


// ==================== GET all Users ====================
app.get("/users/", async (request, response) => {
  
  const getuserQuery = `SELECT * FROM users;`;
  const userArray = await db.all(getuserQuery);
  response.send(userArray);
});


// ==================== GET all books ====================
app.get("/books/", async (request, response) => {
  let jwtToken;
  const { offset=2,limit=6,search_q = ""} = request.query;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  
  if (jwtToken === undefined){
    response.status(401);
    response.send("Invalid JWT TOken");
  } else {
    jwt.verify(jwtToken, "My_SECRET_TOKEN", async(error,user) => {
      if(error){
        response.status(401);
        response.send("Invalid JWT TOken");
      } else {
        const getBooksQuery = `SELECT * FROM book WHERE title LIKE '%${search_q}%' LIMIT ${limit} OFFSET ${offset};`;
        const booksArray = await db.all(getBooksQuery);
        response.send(booksArray);
      }
    });
  }
});

// ==================== GET book by ID ====================
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const getBookQuery = `
    SELECT * FROM book
    WHERE id = ${bookId};
  `;
  const book = await db.get(getBookQuery);
  response.send(book);
});

// ==================== POST add new book ====================
app.post("/postbooks/", async (request, response) => {
  const { title, author, rating } = request.body;
  const addBookQuery = `
    INSERT INTO book (title, author, rating)
    VALUES ('${title}', '${author}', ${rating});
  `;
  const dbResponse = await db.run(addBookQuery);
  const bookId = dbResponse.lastID;
  response.send({ bookId: bookId });
});

// ==================== PUT update book ====================
app.put("/putbooks/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const { title, author, rating } = request.body;
  const updateBookQuery = `
    UPDATE book
    SET 
      title = '${title}',
      author = '${author}',
      rating = ${rating}
    WHERE id = ${bookId};
  `;
  await db.run(updateBookQuery);
  response.send("Book Updated Successfully");
});

// ==================== DELETE book ====================
// app.delete("/books/:bookId/", async (request, response) => {
//   const { bookId } = request.params;
//   const deleteBookQuery = `
//     DELETE FROM book
//     WHERE id = ${bookId};
//   `;
//   await db.run(deleteBookQuery);
//   response.send("Book Deleted Successfully");
// });

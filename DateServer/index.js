const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database file
const dbPath = path.join(__dirname, "user.db");
let db = null;

// JWT secret (same everywhere)
const JWT_SECRET = "MY_SECRET_TOKEN";

// ==================== Initialize DB and Server ====================
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Start server
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.error(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// ==================== Middleware 1: Authenticate JWT ====================
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401).send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, JWT_SECRET, (error, payload) => {
      if (error) {
        response.status(401).send("Invalid JWT Token");
      } else {
        request.username = payload.username; // attach user info
        next();
      }
    });
  }
};


// ==================== Middleware 1: Authenticate JWT ====================

const logger = (request,response,next) => {
  console.log(request.query);
  next();
};



// ==================== Register User ====================
app.post("/usersregister/", async (request, response) => {
  const { username, password, name, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `SELECT * FROM users WHERE username = ?`;
  const dbUser = await db.get(selectUserQuery, [username]);

  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO users (username, password, name, gender, location)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.run(createUserQuery, [
      username,
      hashedPassword,
      name,
      gender,
      location,
    ]);
    response.send("User created successfully");
  } else {
    response.status(400).send("User already exists");
  }
});

// ==================== Login User ====================
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM users WHERE username = ?`;
  const dbUser = await db.get(selectUserQuery, [username]);

  if (dbUser === undefined) {
    response.status(400).send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, JWT_SECRET);
      response.send({ jwtToken });
    } else {
      response.status(400).send("Invalid Password");
    }
  }
});

// ==================== Get User Profile ====================

app.get("/profile/",authenticateToken,async(request,response) => {
  let { username } = request;
  console.log(username);
  const selectUserQuery = `SELECT * FROM users WHERE username = ?`;
  const userDetails = await db.get(selectUserQuery);
  response.send(userDetails);
});


// ==================== Get All Users ====================
app.get("/users/", async (request, response, next) => {
  const getUsersQuery = `SELECT * FROM users;`;
  const usersArray = await db.all(getUsersQuery);
  response.send(usersArray);
});

// ================== Get All Books (with JWT auth) Using Middeleware function ====================
app.get("/books/",logger,authenticateToken, async (request, response) => {
  console.log("Get Books API")
  const { offset = 0, limit = 10, search_q = "" } = request.query;

  const getBooksQuery = `
    SELECT * FROM book
    WHERE title LIKE ?
    LIMIT ? OFFSET ?
  `;
  const booksArray = await db.all(getBooksQuery, [
    `%${search_q}%`,
    limit,
    offset,
  ]);
  response.send(booksArray);
});

// ==================== Get Book by ID ====================
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;

  const getBookQuery = `SELECT * FROM book WHERE id = ?`;
  const book = await db.get(getBookQuery, [bookId]);

  if (book) {
    response.send(book);
  } else {
    response.status(404).send("Book not found");
  }
});

// ==================== Add New Book ====================
app.post("/postbooks/", async (request, response) => {
  const { title, author, rating } = request.body;

  const addBookQuery = `
    INSERT INTO book (title, author, rating)
    VALUES (?, ?, ?)
  `;
  const dbResponse = await db.run(addBookQuery, [title, author, rating]);
  const bookId = dbResponse.lastID;

  response.send({ bookId });
});

// ==================== Update Book ====================
app.put("/putbooks/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const { title, author, rating } = request.body;

  const updateBookQuery = `
    UPDATE book
    SET title = ?, author = ?, rating = ?
    WHERE id = ?
  `;
  const result = await db.run(updateBookQuery, [
    title,
    author,
    rating,
    bookId,
  ]);

  if (result.changes === 0) {
    response.status(404).send("Book not found");
  } else {
    response.send("Book Updated Successfully");
  }
});

// ==================== Delete Book ====================
app.delete("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;

  const deleteBookQuery = `DELETE FROM book WHERE id = ?`;
  const result = await db.run(deleteBookQuery, [bookId]);

  if (result.changes === 0) {
    response.status(404).send("Book not found");
  } else {
    response.send("Book Deleted Successfully");
  }
});

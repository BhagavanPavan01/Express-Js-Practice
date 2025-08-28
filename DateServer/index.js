const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

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

initializeDBAndServer();


// ==================== GET all books ====================
app.get("/books/", async (request, response) => {
  const { offset=2,limit=6,search_q = ""} = request.query;
  const getBooksQuery = `SELECT * FROM book WHERE title LIKE '%${search_q}%' LIMIT ${limit} OFFSET ${offset};`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

// ==================== GET book by ID ====================
// app.get("/books/:bookId/", async (request, response) => {
//   const { bookId } = request.params;
//   const getBookQuery = `
//     SELECT * FROM book
//     WHERE id = ${bookId};
//   `;
//   const book = await db.get(getBookQuery);
//   response.send(book);
// });

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

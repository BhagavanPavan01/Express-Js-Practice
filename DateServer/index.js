// const express = require('express');        //  imporrt express modules
// const app = express();                     //  create object as app


// // app.get('/date',(req,res) => {             //  This function is calling date 
// //     let date = new Date();
// //     res.send(`Today's date is ${date}`);
// // });

// app.get('/page',(req,res) =>{
//     res.sendFile('./page.html',{root:__dirname});
// });

// app.listen(3000);



// =========================  Creation server in between nodejs and sqlite ==========

const express = require('express');
const { request } = require('http');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    console.log("DB Path:", dbPath);  // Debug path
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
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


// app.listen(3000,() => {
//     console.log("server is running at http://localhost:3000")
// });


// app.get("/books/",async(request,response) => {
//     const getBooksQuery = `SELECT * 
//                            FROM book
                           
// `;
//     const booksArray = await db.all(getBooksQuery);
//     response.send(booksArray);
// });


app.get("/books/:bookId/", async(request, response) => {
  const { bookId } = request.params;
  const getBooksQuery = `
                          SELECT * FROM book
                          WHERE id = ${bookId};
  `;
  const book = await db.get(getBooksQuery);
  response.send(book);
});

// Add boook API

app.post("/books/",async(request,response) => {
  const bookDetails = request.body;
  const {title,auther,rating} = bookDetails;
  const addBookQuery = `
                        INSERT INTO
                        book (title,auther,rating) VALUES(
                        '${title}',
                        ${auther},
                        ${rating}
                        );`;

  const dbResponse = await db.run(addBookQuery);
  const bookId = dbResponse.lastID;
  response.send({ bookId: bookId });
});









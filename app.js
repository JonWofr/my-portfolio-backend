//require method is used by node and is currently not the same as import. Modules can be installed globally or locally but either way they can (normally) be referenced with require or import from in the same way. The module http and body-parser are defaultJS modules which are preinstalled globally once node is installed.
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const mongoDb = require("mongodb");

//Constants
const app = express();
const server = http.createServer(app);

const dbUrl = "mongodb://localhost:27017";
const client = new mongoDb.MongoClient(dbUrl, { useUnifiedTopology: true, useNewUrlParser: true });
const database = "myportfolio";
const collection = "projects";

let col;

//Initialization
app.use(bodyParser.urlencoded({extended: true}));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

client.connect((err) => {
    if (err) throw err;
    console.log(`Successfully connected to mongoDb with URL ${dbUrl}`);

    const db = client.db(database);
    col = db.collection(collection);
    client.close();
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/projects/all", (req, res) => {
    col.find().toArray((err, result) => {
        if (err) throw err;
        console.log(`Fetched ${result.length} stored projects from the database`)
        res.send(result)
    })
})









server.listen(2019, () => {
    console.log("server is running on port 2019");
});
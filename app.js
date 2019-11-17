//require method is used by node and is currently not the same as import. Modules can be installed globally or locally but either way they can (normally) be referenced with require or import from in the same way. The module http and body-parser are defaultJS modules which are preinstalled globally once node is installed.
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const mongoDb = require("mongodb");
const dotenv = require("dotenv");

//Constants
const app = express();
const server = http.createServer(app);

const database = "myportfolio";
const collectionProjects = "projects";
const collectionSlides = "slides"

//Initialization
if (process.env.NODE_ENVIRONMENT === "development"){
    dotenv.config({
        path: "./development.env"
    });
}
else if (process.env.NODE_ENVIRONMENT === "production"){
    dotenv.config({
        path: "./production.env"
    });
}
else {
    console.log("The environment is not known. Server could not be started.")
}

app.use(bodyParser.json({limit: "20mb"}));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "OPTIONS, GET, POST, PUT, PATCH, DELETE");
    next();
});

const client = new mongoDb.MongoClient(process.env.MONGO_DB_URL, { useUnifiedTopology: true, useNewUrlParser: true });

client.connect((err) => {
    if (err) throw err;
    console.log(`Successfully connected to mongoDb with URL ${process.env.MONGO_DB_URL}`);

    const db = client.db(database);
    exports.colProjects = db.collection(collectionProjects);
    exports.colSlides = db.collection(collectionSlides)
    client.close();
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.use("/projects", require('./src/projects/routes'));
app.use(express.static("public"));

app.get("/slides", (req, res) => {
    colSlides.find().toArray((err, result) => {
        if (err) throw err;
        console.log(`Fetched ${result.length} stored slides from the database`)
        res.status(200);
        res.send(result)
    })
})

server.listen(process.env.PORT, () => {
    console.log(`server is running in ${process.env.MODE} on port ${process.env.PORT} with URL ${process.env.URL}`);
});
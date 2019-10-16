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
const collectionProjects = "projects";
const collectionSlides = "slides"

let colProjects;
let colSlides;

//Initialization
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

client.connect((err) => {
    if (err) throw err;
    console.log(`Successfully connected to mongoDb with URL ${dbUrl}`);

    const db = client.db(database);
    colProjects = db.collection(collectionProjects);
    colSlides = db.collection(collectionSlides)
    client.close();
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/projects", (req, res) => {
    colProjects.find().toArray((err, result) => {
        if (err) throw err;
        console.log(`Fetched ${result.length} stored projects from the database`)
        res.send(result)
    })
})

app.post("/projects/:projectName", (req, res) => {
    //: is used to to bind the value which stands behind the slash in the url request to the property defined here and is accessible via req.params 
    //?propertyName=value defines the property in the url request itself and is accessible via req.query
    colProjects.findOne({ "projectName": req.body.projectName }, (err, result) => {
        if (err) throw err;
        if (!result) {
            colProjects.insertOne(req.body)
                .then((result) => {
                    console.log("Successfully inserted a document into the collection", result);
                    //TODO Why is the inserted document stored inside an array?
                    res.send({"_id": result.insertedId});
                })
                .catch((error) => {
                    console.log("An error occurred trying to insert a document into the collection", error);
                })
        }
        else {
            console.log("Project with name " + req.body.projectName + " has already been inserted into the collection");
        }
    })
})

app.get("/slides", (req, res) => {
    colSlides.find().toArray((err, result) => {
        if (err) throw err;
        console.log(`Fetched ${result.length} stored slides from the database`)
        res.send(result)
    })
})









server.listen(2019, () => {
    console.log("server is running on port 2019");
});
//require method is used by node and is currently not the same as import. Modules can be installed globally or locally but either way they can (normally) be referenced with require or import from in the same way. The module http and body-parser are defaultJS modules which are preinstalled globally once node is installed.
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const mongoDb = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

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
    res.header("Access-Control-Allow-Methods", "OPTIONS, GET, POST, PUT, PATCH, DELETE");
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
        console.log(`Fetched ${result.length} stored projects from the database`);
        res.status(200);
        res.send(result);
    })
})

app.post("/projects", (req, res) => {
    //: is used to to bind the value which stands behind the slash in the url request to the property defined here and is accessible via req.params 
    //?propertyName=value defines the property in the url request itself and is accessible via req.query
    colProjects.findOne({ "projectName": req.body.projectName }, (err, result) => {
        if (err) throw err;
        if (!result) {
            colProjects.insertOne(req.body)
                .then((result) => {
                    console.log("Successfully inserted a document into the collection", result);
                    res.status(201);
                    res.send(result);
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

app.delete("/projects/:_id", (req, res) => {
    const _id = req.params._id;
    colProjects.remove({ "_id": new ObjectId(_id)}, (err, result) => {
        if (err) throw err;
        res.status(200);
        res.send(result)
    })
})

app.put("/projects/:_id", (req, res) => {
    const _id = req.params._id;
    const { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } = req.body;
    colProjects.findOne({_id: ObjectId(_id)}, (err, result) => {
        if (err) throw err;
        // If nothing matches the query null is returned
        if (result) {
            colProjects.updateOne({_id: ObjectId(_id)}, {$set: { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs }}, (err, result) => {
                if (err) throw err;
                console.log("Successfully replaced a document in the collection", result);
                res.status(200);
                res.send(req.body);
            })
        }
        else {
            console.log("There is no document with given id stored in the collection", _id);
        }
    })
})

app.get("/slides", (req, res) => {
    colSlides.find().toArray((err, result) => {
        if (err) throw err;
        console.log(`Fetched ${result.length} stored slides from the database`)
        res.status(200);
        res.send(result)
    })
})









server.listen(2019, () => {
    console.log("server is running on port 2019");
});
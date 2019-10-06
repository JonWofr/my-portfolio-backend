//require method is used by node and is currently not the same as import. Modules can be installed globally or locally but either way they can (normally) be referenced with require or import from in the same way. The module http and body-parser are defaultJS modules which are preinstalled globally once node is installed.
const express = require("./node_modules/express");
const http = require("http");
const bodyParser = require("body-parser");
const mongoDb = require("./node_modules/mongodb");

const app = express();
const server = http.createServer(app);

app.use(bodyParser.urlencoded({extended: true}));




server.listen(2019, () => {
    console.log("server is running on port 2019");
});
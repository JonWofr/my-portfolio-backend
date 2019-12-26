const fs = require('fs');
const path = require('path');
const app = require('../../app');
const ObjectId = require('mongodb').ObjectId;

exports.getAll = (req, res) => {
    app.colProjects.find().toArray((err, result) => {
        if (err) throw err;
        console.log(`Fetched ${result.length} stored projects from the database`);
        res.status(200);
        res.send(result);
    })
}


exports.insertOne = (req, res) => {
    //: is used to to bind the value which stands behind the slash in the url request to the property defined here and is accessible via req.params 
    //?propertyName=value defines the property in the url request itself and is accessible via req.query
    app.colProjects.findOne({ "projectName": req.body.projectName }, (err, result) => {
        if (err) throw err;
        if (!result) {
            // The image comes in the format of a dataUrl. Therefore we have to extract the data from this string (i.e. the Base64 encoded String) and decode it to get the String in binary format.
            // Once we have done that, we can create a Blob 
            let writeFilePromises = [];

            req.body.paragraphs.forEach((paragraph) => {
                const { url, dataUrl } = paragraph.image;

                const localFilePath = getLocalFilePathByFileName(url);
                const remoteFilePath = getRemoteFilePathByFileName(url);
                console.log("Remote filePath is ", remoteFilePath);
                console.log("Local filePath is ", localFilePath);

                try {
                    const buffer = parseDataUrlToBuffer(dataUrl);
                    writeFilePromises.push(writeFilePromise(localFilePath, buffer));
                }
                catch (e) {
                    console.log(e);
                }
                paragraph.image.url = remoteFilePath;
                paragraph.image.dataUrl = null;
            })

            Promise.all(writeFilePromises)
                .then(() => {
                    console.log("successfully created new images")
                    app.colProjects.insertOne(req.body)
                        .then((result) => {
                            console.log("Successfully inserted a document into the collection", result);
                            res.status(201);
                            res.send(result);
                        })
                        .catch((error) => {
                            console.log("An error occurred trying to insert a document into the collection", error);
                        })
                })
                .catch((err) => {
                    console.log("an error occurred in one fo the promises");
                })
        }
        else {
            console.log("Project with name " + req.body.projectName + " has already been inserted into the collection");
        }
    })
}


const getLocalFilePathByFileName = (fileName) => {
    const rootPath = path.dirname(require.main.filename);
    return `${rootPath}/public/image_uploads/${fileName}`;
}

const getRemoteFilePathByFileName = (fileName) => {
    return `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}/public/image_uploads/${fileName}`;
}

const parseDataUrlToBuffer = (dataUrl) => {
    const encodedImageData = dataUrl.split(',')[1];
    return Buffer.from(encodedImageData, "base64");
}

const writeFilePromise = (path, buffer) => {
    return new Promise((resolve) => {
        fs.writeFileSync(path, buffer);
        resolve();
    })
}


exports.deleteOne = (req, res) => {
    const _id = req.params._id;
    app.colProjects.remove({ "_id": new ObjectId(_id) }, (err, result) => {
        if (err) throw err;
        res.status(200);
        res.send(result)
    })
}

exports.updateOne = (req, res) => {
    const _id = req.params._id;
    const { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } = req.body;
    app.colProjects.findOne({ _id: ObjectId(_id) }, (err, result) => {
        if (err) throw err;
        // If nothing matches the query null is returned
        if (result) {
            const writeFilePromises = [];
            paragraphs.forEach((paragraph) => {
                if (paragraph.image.dataUrl) {
                    const { url, dataUrl } = paragraph.image;

                    const localFilePath = getLocalFilePathByFileName(url);
                    const remoteFilePath = getRemoteFilePathByFileName(url);
                    console.log("Remote filePath is ", remoteFilePath);
                    console.log("Local filePath is ", localFilePath);
    
                    try {
                        const buffer = parseDataUrlToBuffer(dataUrl);
                        writeFilePromises.push(writeFilePromise(localFilePath, buffer));
                    }
                    catch (err) {
                        throw err;
                    }
                    paragraph.image.url = remoteFilePath;
                    paragraph.image.dataUrl = null;
                }
            })
            if (writeFilePromises.length > 0) {
                Promise.all(writeFilePromises)
                .then(() => {
                    app.colProjects.updateOne({ _id: ObjectId(_id) }, { $set: { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } }, (err, result) => {
                        if (err) throw err;
                        console.log("Successfully replaced a document in the collection", result);
                        res.status(200);
                        res.send(req.body);
                    })
                })
                .catch((err) => {
                    throw err;
                })
            }
            else {
                app.colProjects.updateOne({ _id: ObjectId(_id) }, { $set: { projectName, categories, technologies, teamMembers, startDate, endDate, paragraphs } }, (err, result) => {
                    if (err) throw err;
                    console.log("Successfully replaced a document in the collection", result);
                    res.status(200);
                    res.send(req.body);
                })
            }
        }
        else {
            console.log("There is no document with given id stored in the collection", _id);
        }
    })
}

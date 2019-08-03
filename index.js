const express = require("express");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const path = require('path');

const app = express();

app.use(helmet());
app.use(bodyParser.json());

if (process.env.NODE_ENV === "production") {
    app.use(express.static("/"));
    app.use(express.static("src"));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, "index.html"));
    })
}

// if (process.env.NODE_ENV === "production") {   // Express will server up
// production assets   // like our main.js, main.css files
// app.use(express.static("client/build"));   // Express will serve up the
// index.html file   // if it does not recognize the route   const path =
// require("path");   app.get("*", (req, res) => {
// res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));   });
// }

const PORT = process.env.PORT || 8888;
app.listen(PORT);
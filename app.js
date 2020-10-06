var express = require("express");
 
var app = express();
 
app.use(express.static("public"));
 
app.set("view engine", "ejs");
app.set("views", "./views");
 
app.listen(4000);
 

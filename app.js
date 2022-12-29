require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const mongoDB = 'mongodb://127.0.0.1:27017/secretsDB';
const app = express();

mongoose.connect(mongoDB, { useNewUrlParser: true });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        dropDubs: true
    },
    password: {
        type: String,
        required: true
    }
});

const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = mongoose.model("User", userSchema);


app.get("/", function (req, res){
    res.render("home");
});

app.get("/register", function (req, res){
    res.render("register", {error: ""});
});

app.post("/register", function (req, res){
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });

    user.save(function(error){
        if(error) {
            res.render("register", {error: error});
            console.log(error);
        }
        else
            res.render("secrets");
    });
});


app.get("/login", function (req, res){
    res.render("login", {error: ""});
});

app.post("/login", function (req, res){
    User.findOne({email: req.body.username}, function(error, user){
        if(error){
            res.render("login", {error: error});
        } else if(!user){
            console.log("Username doesn't exist!")
            res.render("login", {error: "Username doesn't exist!"});
        } else if(user.password !== req.body.password){
            console.log("Wrong password!")
            res.render("login", {error: "Password is incorrect!"});
        } 
        else {
            res.render("secrets");
        }
    });
})

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function () {
    console.log("Todo list app is up and running.");

});

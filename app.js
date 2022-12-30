require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose'); mongoose.set('strictQuery', false);
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const mongoDB = 'mongodb://127.0.0.1:27017/secretsDB';
const app = express();

mongoose.connect(mongoDB, { useNewUrlParser: true });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    rolling: true, // forces resetting of max age
    cookie: {
        maxAge: 900000,
        secure: false // this should be true only when you don't want to show it for security reason
    }
}));
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
    googleId: String,
    username: String,
    secrets: [{
        type: String
    }]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id, username: profile.emails[0].value }, function (err, user) {
            //console.log(user);
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/register", function (req, res) {
    if (req.isAuthenticated())
        res.render("secrets");
    else
        res.render("register", { error: "" });
});

app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.render("register", { error: err });
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get("/login", function (req, res) {
    if (req.isAuthenticated())
        res.render("secrets");
    else
        res.render("login", { error: "" });
});

app.post("/login", function (req, res) {
    const authenticate = User.authenticate();
    authenticate(req.body.username, req.body.password, function (err, result) {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else if (!result) {
            res.render("login", { error: "Invalid username or password!" })
        } else {
            //console.log(result);
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {
        User.find({ secrets: { $ne: null } }, function (err, usersWithSecrets) {
            if (err)
                console.log(err);
            else{
                res.render("secrets", {usersWithSecrets: usersWithSecrets});
            }
        });

    }
    else
        res.redirect("/login");
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated())
        res.render("submit");
    else
        res.redirect("/login");
});

app.post("/submit", function (req, res) {
    if (!req.isAuthenticated)
        res.redirect("/login");
    else {
        //console.log(req.user);
        User.findById({ _id: req.user._id }, function (err, document) {
            if (err)
                console.log(err);
            else {
                document.secrets.push(req.body.secret);
                document.save();
                res.redirect("/secrets");
            }
        });
    }
})

app.get('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function () {
    console.log("Todo list app is up and running.");

});

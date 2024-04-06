//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt= require("mongoose-encryption");   
// const md5= require("md5");   hashing
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session= require("express-session");
const passport= require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate= require("mongoose-findorcreate");

const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "my secrets are very important",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb+srv://priyansh28:password@cluster0.cy8r8rs.mongodb.net/userDB", { useNewUrlParser: true })
// mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String

})


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:["password"] })
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// passport.use(User.createStrategy());


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// passport.serializeUser(function(user, cb) {
//     process.nextTick(function() {
//       return cb(null, {
//         id: user.id,
//         username: user.username,
//         picture: user.picture
//       });
//     });
//   });
  
//   passport.deserializeUser(function(user, cb) {
//     process.nextTick(function() {
//       return cb(null, user);
//     });
//   });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
async function (accessToken, refreshToken, profile, done) {
    try {
          console.log(profile);
        // Find or create user in your database
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            // Create new user in database
            const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
            const newUser = new User({
                username: profile.displayName,
                googleId: profile.id
            });
            user = await newUser.save();
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}
));
//   function(accessToken, refreshToken, profile, cb){
//     console.log(profile);
//     User.findOne({ googleId: profile.id })
//     .then(function(user)
//     {
//         return cb(user);
//     }) 
//     .catch(function (err)
//     {
//         console.log(err);
//     })
//   }
// ));

app.get("/", function (req, res) {
    res.render("home");
})
app.get("/auth/google",
passport.authenticate("google", { scope: ["profile"] })
);
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });
app.get("/login", function (req, res) {
    res.render("login");
})
app.get("/register", function (req, res) {
    res.render("register");
})

app.get("/secrets",function(req, res)
{
    User.find({"secret":{$ne: null}})
    .then(function(foundUser)
    {
        if(foundUser)
      {
        res.render("secrets",{userWithSecrets: foundUser});
      }   
    })
    .catch(function(err)
    {
        console.log(err);
    })
})
app.get("/submit",function(req,res)
{
    if(req.isAuthenticated())
    {
        res.render("submit");
    }
    else
    {
        res.redirect("/login");
    }
})
app.get("/logout", function(req, res,next)
{
    req.logout(function(err){
        if(err){return next(err);}
        res.redirect("/");
    });
})

app.post("/register", function (req, res) {
    User.register({username: req.body.username}, req.body.password)
    .then(function(user)
    {
        passport.authenticate("local")(req,res, function()
        {
            res.redirect("/secrets");
        })
    })
    .catch(function(err)
    {
        console.log(err);
        res.redirect("/register");
    })
})

app.post("/login", function (req, res) {

    const user= new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user)
    .then(function()
    {
        passport.authenticate("local")(req,res, function()
        {
            res.redirect("/secrets");
        })
    })
    .catch(function(err)
    {
        console.log(err);
        res.redirect("/login");
    })
})
app.post("/submit",function(req,res)
{
    const submittedSecret= req.body.secret;

   User.findById(req.user.id)
   .then(function(foundUser)
   {
      if(foundUser)
      {
        foundUser.secret= submittedSecret;
        foundUser.save();
        res.redirect("/secrets");
        
      }
   })
   .catch(function(err)
    {
        console.log(err);
    })
});


app.listen(3000, function (req, res) {
    console.log("Successfully running on port 3000");
})




//  when bcrypt is used
// app.post("/register", function (req, res) {

//     bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         })
//         newUser.save()
//             .then(function () {
//                 res.render("secrets");
//             }
//             )
//             .catch(function (err) {
//                 console.log(err);
//             })
//     });
// })

// app.post("/login", function (req, res) {
//     const username = req.body.username;
//     const password = req.body.password;

//     User.findOne({ email: username })
//         .then(function (foundUser) {
//             if (foundUser) {
//                 bcrypt.compare(password, foundUser.password, function(err, result) {
//                     if (result === true) {
//                         res.render("secrets");
//                     }
//                 });
//             }
//         })
//         .catch(function (err) {
//             console.log(err);
//         })

// })

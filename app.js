if(process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

// console.log(process.env.SECRET)

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require("path");
const methodOverride = require('method-override');
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./MODELS/user.js");
const dbUrl = process.env.MONGODB_URL;


const Listing = require("./MODELS/listing.js");


const store = MongoStore.create({
    mongoUrl: dbUrl, 
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


async function main(){
    await mongoose.connect(dbUrl);
}
main()
.then(()=>{
    console.log("Connected to DB");
}).catch((err)=>{
    console.log(err);
})

// async function main(){
//     await mongoose.connect(dbUrl);
// }

app.listen(3000,()=>{
    console.log("Listening to port 3000");
});

// app.get("/",(req,res)=>{
//     res.send("I am Root");
// });



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

// app.get("/demouser", async (req,res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student",
//     });

//     let registeredUser = await User.register(fakeUser, "helloworld"); 
//     res.send(registeredUser);
// });

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.get("/search", async (req, res) => {
    let { location } = req.query;
    const allListings = await Listing.find({location});
    res.render("listings/search", {allListings});
})

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err,req,res,next) =>{
    let {status=500, message="Something went wrong!"} = err;
    res.status(status).render("error.ejs", {message});
    //res.status(status).send(message);

});


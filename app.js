const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const bodyParser = require("body-parser");
const LocalStrategy = require("passport-local");
const LocalMongoose = require("passport-local-mongoose");
const User = require("./models/user");
const Relative = require("./models/mycircle");
const Event = require("./models/events");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const flash = require("connect-flash");
const session = require("express-session");
const NewsAPI = require("newsapi");


// --- CONFIG / CONSTANTS ---
const uri =
  process.env.DATABASEURL ||
  "mongodb+srv://vishaka:Vishaka@cluster0.u0mor.mongodb.net/alzheimers?retryWrites=true&w=majority";
const NEWSAPIKEY = process.env.NEWSAPIKEY || "a4bd82eddc284e0a8e2917379a74b49d";
const newsapi = new NewsAPI(NEWSAPIKEY);


// --- MULTER storages ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, file.fieldname + "-" + Date.now() + ext);
  },
});
const upload = multer({ storage: storage });


const storageCircle = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const base = path.join("uploads", req.user.username);
      const relDir = path.join(base, req.body.relName);

      await fsp.mkdir(relDir, { recursive: true });
      cb(null, relDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, file.fieldname + "-" + Date.now() + ext);
  },
});
const uploadCircle = multer({ storage: storageCircle });


// --- Passport + Express setup ---
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "KEYTEST",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// set locals
app.use(function (req, res, next) {
  res.locals.CurrentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// --- DB Connect for mongoose usage ---
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Mongoose connected"))
  .catch((e) => console.error("Mongoose connect error:", e));

// --- Helper functions ---
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}

function getRandom(arr, n) {
  if (!Array.isArray(arr)) return [];
  var result = new Array(n),
    len = arr.length,
    taken = new Array(len);
  if (n > len) throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

const SAGETestGenerate = () => {
  let optionsBool = [true, false];
  let question1 = "Sometimes when I’m looking for something, I forget what it is that I’m looking for.";
  let answer1 = "false";
  let question2 = "My friends and family seem to think I’m more forgetful now than I used to be.";
  let answer2 = "false";
  let question3 = "It’s hard for me to concentrate for even an hour.";
  let answer3 = "false";
  let question4 = "I frequently repeat myself.";
  let answer4 = "false";
  let randbill = Math.floor(Math.random() * 30) + 30;
  let randMoneyGiven = Math.floor(Math.random() * 30) + 50;
  let question5 = `You are buying ${randbill} dollars of groceries. How much change would you receive back from a ${randMoneyGiven} dollar bill?`;
  let answer5 = randMoneyGiven - randbill;
  let options5 = [answer5 + 2, answer5 - 4, answer5];

  let question6 = "What is the date and day today?";
  let answer6 = new Date();
  let choice1 = new Date(answer6);
  let choice2 = new Date(answer6);
  choice1.setDate(choice1.getDate() + 15);
  choice2.setDate(choice2.getDate() - 12);
  let options6 = [choice2.toDateString(), choice1.toDateString(), answer6.toDateString()];
  answer6 = answer6.toDateString().slice(0, 3);

  const test = {};
  test["Q1"] = { question: question1, answer: answer1, options: optionsBool };
  test["Q2"] = { question: question2, answer: answer2, options: optionsBool };
  test["Q3"] = { question: question3, answer: answer3, options: optionsBool };
  test["Q4"] = { question: question4, answer: answer4, options: optionsBool };
  test["Q5"] = { question: question5, answer: answer5, options: options5 };
  test["Q6"] = { question: question6, answer: answer6, options: options6 };
  return test;
};

const getSAGEScore = (answers, test) => {
  let score_arr = [0];
  for (let i = 1; i <= 6; i++) {
    if (test[`Q${i}`].answer == answers[`answer${i}`]) {
      score_arr.push(1);
    } else {
      score_arr.push(0);
    }
  }
  return score_arr;
};

function checkReminders(data) {
  const now = new Date();
  const currDay = now.getDay();
  const timeStart = now.getHours();
  const minStart = now.getMinutes();
  const resReminders = [];

  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].days.length; j++) {
      if (String(data[i].days[j]) === String(currDay)) {
        const [hour, min] = data[i].time.split(":").map(Number);

        const diffHours = hour - timeStart;
        const diffMinutes = min - minStart;

        // Reminder within next 2 hours
        if ((diffHours > 0 && diffHours <= 2) || (diffHours === 0 && diffMinutes >= 0)) {
          resReminders.push(data[i]);
        }
      }
    }
  }

  return resReminders;
}


// --- Routes ---

app.get("/", (req, res) => {
  res.render("landing.ejs");
});

app.get("/home", isLoggedIn, async (req, res) => {
  let myreminders = [];
  let msg = "";
  let client;
  try {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const collection = client.db("alzheimers").collection("events");
    const data = await collection.find({ patUserName: req.user.username }).toArray();
    myreminders = checkReminders(data);
    if (myreminders.length === 0) {
      msg = "No upcoming reminders (for 2 hours at least)";
    }
    res.render("homepage.ejs", { myreminders: myreminders, msg: msg });
  } catch (err) {
    console.error("Error in /home:", err);
    req.flash("error", "Server error");
    res.redirect("/");
  } finally {
    if (client) await client.close();
  }
});

app.get("/register", (req, res) => {
  res.render("auth/register.ejs");
});

app.post("/register", upload.single("DP"), async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash("error", "Profile picture is required.");
      return res.redirect("/register");
    }

    const dpPath = path.join(__dirname, "uploads", req.file.filename);
    const dpData = await fsp.readFile(dpPath);

    const newUser = new User({
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      DP: {
        data: dpData,
        contentType: req.file.mimetype || "image/png",
      },
    });

    User.register(newUser, req.body.password, function (err, user) {
      if (err) {
        req.flash("error", "A user with the same username already exists! Choose another Username.");
        console.log(err);
        return res.redirect("/register");
      } else {
        req.flash("success", "You have been registered successfully");
        passport.authenticate("local")(req, res, function () {
          res.redirect("/login");
        });
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    req.flash("error", "Server error during registration");
    res.redirect("/register");
  }
});

app.get("/login", (req, res) => {
  res.render("auth/login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
  })
);

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }
    req.flash("success", "Successfully Logged Out");
    res.redirect("/");
  });
});

// GET: display news based on query param
// ---------------- NEWS SECTION ----------------

// GET: display Indian Alzheimer/dementia/brain-health news
app.get("/news", isLoggedIn, async (req, res) => {
  try {
    // Fetch news specifically for India about Alzheimer/dementia/brain health
    const response = await newsapi.v2.topHeadlines({
      q: "Alzheimer OR dementia OR brain health",
      country: "in", // only India
      language: "en",
      pageSize: 50, // increase number of articles
    });

    if (!response.articles || response.articles.length === 0) {
      console.log("No news for India, fetching general Alzheimer news...");
      
      // fallback to global news
      const fallback = await newsapi.v2.everything({
        q: "Alzheimer OR dementia OR brain health",
        language: "en",
        sortBy: "publishedAt",
        pageSize: 50,
      });

      return res.render("newsapp/newspage", {
        news: fallback.articles,
      });
    }

    // Render only Indian news
    res.render("newsapp/newspage", {
      news: response.articles,
    });
  } catch (e) {
    console.error("News fetch error:", e.message);
    req.flash("error", "Could not fetch news right now. Please try again later.");
    res.redirect("/home");
  }
});





// --- ENTERTAINMENT PAGE ---
app.get("/entertainment", isLoggedIn, (req, res) => {
  // No data needed, just render the page
  res.render("entertainment.ejs");
});






// GET add video page
app.get("/addvideos", isLoggedIn, (req, res) => {
  res.render("addVideos.ejs", {
    success: req.flash("success"),
    error: req.flash("error")
  });
});

// POST add video
app.post("/addvideos", isLoggedIn, async (req, res) => {
  let client;
  try {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const collection = client.db("alzheimers").collection("users");

    // Add video ID to user's videos array (avoid duplicates)
    await collection.updateOne(
      { _id: ObjectId(req.user._id) },
      { $addToSet: { videos: req.body.videoid } }
    );

    req.flash("success", "Added video successfully");
    res.redirect("/addvideos");
  } catch (err) {
    console.error("Add videos error:", err);
    req.flash("error", "Could not add video");
    res.redirect("/addvideos");
  } finally {
    if (client) await client.close();
  }
});


app.get("/games", isLoggedIn, async (req, res) => {
  let myreminders = [];
  let msg = "";
  let client;
  try {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const eventsCol = client.db("alzheimers").collection("events");
    const data = await eventsCol.find({ patUserName: req.user.username }).toArray();
    myreminders = checkReminders(data);
    if (myreminders.length === 0) {
      msg = "No upcoming reminders (for 2 hours at least)";
    }
    res.render("games.ejs", { myreminders: myreminders, msg: msg });
  } catch (err) {
    console.error("Games error:", err);
    req.flash("error", "Server error");
    res.redirect("/home");
  } finally {
    if (client) await client.close();
  }
});

app.get("/memorygame", isLoggedIn, (req, res) => {
  res.render("memoryGame.ejs");
});

app.get("/quiz", (req, res) => {
  res.render("quiz.ejs");
});

app.get("/circle", isLoggedIn, async (req, res) => {
  let myreminders = [];
  let msg = "";
  let client;
  try {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    const eventsCol = client.db("alzheimers").collection("events");
    const eventsData = await eventsCol.find({ patUserName: req.user.username }).toArray();
    myreminders = checkReminders(eventsData);
    if (myreminders.length === 0) msg = "No upcoming reminders (for 2 hours at least)";

    const relativesCol = client.db("alzheimers").collection("relatives");
    const relativesData = await relativesCol.find({ patUserName: req.user.username }).toArray();

    res.render("myCircle.ejs", {
      result: relativesData,
      myreminders: myreminders,
      msg: msg,
    });
  } catch (err) {
    console.error("Circle error:", err);
    req.flash("error", "Server error");
    res.redirect("/home");
  } finally {
    if (client) await client.close();
  }
});

app.get("/circleupload", isLoggedIn, (req, res) => {
  res.render("myCircleUpload.ejs");
});

app.post("/circleupload", uploadCircle.array("files"), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.flash("error", "No files uploaded");
      return res.redirect("/circleupload");
    }

    let photos = [];
    for (let f of req.files) {
      const filePath = path.join(__dirname, f.path);
      const buf = await fsp.readFile(filePath);
      photos.push({
        data: buf,
        contentType: f.mimetype || "image/png",
        path: f.path,
      });
    }

    const newRelative = {
      patUserName: req.user.username,
      relName: req.body.relName,
      relation: req.body.relation,
      photos: photos,
    };

    let client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
      await client.connect();
      const collection = client.db("alzheimers").collection("relatives");
      await collection.insertOne(newRelative);
      req.flash("success", "Relative added successfully");
      res.redirect("/circleupload");
    } catch (err) {
      console.error("Insert relative error:", err);
      req.flash("error", "Could not add relative");
      res.redirect("/circleupload");
    } finally {
      await client.close();
    }
  } catch (err) {
    console.error("circleupload error:", err);
    req.flash("error", "Server error uploading files");
    res.redirect("/circleupload");
  }
});

app.get("/guesswho", isLoggedIn, async (req, res) => {
  let client;
  try {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const collection = client.db("alzheimers").collection("relatives");
    const data = await collection.find({ patUserName: req.user.username }).toArray();

    const maxind = Math.min(data.length, 5);
    const randarray = getRandom(data, maxind);
    let allnames = data.map((obj) => obj.relName);
    let all_questions = [];
    for (let obj of randarray) {
      let randpicind = Math.floor(Math.random() * obj.photos.length);
      let randphoto = obj.photos[randpicind];
      let answer = obj.relName;
      let ansind = allnames.indexOf(answer);
      let option2 = allnames[(ansind + 1) % allnames.length];
      let options = [answer, option2];
      all_questions.push({ photo: randphoto, options, answer });
    }

    req.session.guessWhoQuestions = all_questions;
    res.render("guesswho", { all_questions: all_questions });
  } catch (err) {
    console.error("guesswho error:", err);
    req.flash("error", "Server error");
    res.redirect("/games");
  } finally {
    if (client) await client.close();
  }
});

app.post("/guesswho/checkanswer", isLoggedIn, async (req, res) => {
  try {
    const all_questions = req.session.guessWhoQuestions || [];
    let myanswer = [];
    let boolarr = [];
    let score = 0;
    let correctansarr = all_questions.map((obj) => obj.answer);
    const indices = all_questions.length;

    for (let i = 1; i <= indices; i++) {
      const key = "Choice" + i;
      const value = req.body[key];
      myanswer[i - 1] = value;
      if (correctansarr[i - 1] === value) {
        score += 1;
        boolarr[i - 1] = true;
      } else {
        boolarr[i - 1] = false;
      }
    }

    let client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
      await client.connect();
      const usersCol = client.db("alzheimers").collection("users");
      await usersCol.updateOne({ _id: ObjectId(req.user._id) }, { $push: { scores: score } });
    } catch (err) {
      console.error("Updating score error:", err);
    } finally {
      await client.close();
    }

    res.render("score", {
      boolarr: boolarr,
      correctansarr: correctansarr,
      myanswer: myanswer,
      score: score,
      all_questions: all_questions,
    });
  } catch (err) {
    console.error("guesswho checkanswer error:", err);
    req.flash("error", "Server error");
    res.redirect("/games");
  }
});

app.get("/video", isLoggedIn, async (req, res) => {
  try {
    let client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
      await client.connect();
      const relativesCol = client.db("alzheimers").collection("relatives");
      const data = await relativesCol.find({ patUserName: req.user.username }).toArray();

      let labels = data.map((d) => d.relName);
      let pathArr = [];
      for (let i = 0; i < data.length; i++) {
        const p = data[i].photos ? data[i].photos.map((ph) => ph.path) : [];
        pathArr.push(p);
      }

      const folderName = path.join("uploads", req.user.username);
      let relativesDirs = [];
      try {
        const files = await fsp.readdir(folderName, { withFileTypes: true });
        relativesDirs = files.filter((item) => item.isDirectory()).map((item) => item.name);
      } catch (err) {
        if (err.code === "ENOENT") {
          relativesDirs = [];
        } else {
          throw err;
        }
      }

      const famphotos = {};
      const famphotosFiles = [];
      for (let rel of relativesDirs) {
        const relPath = path.join(folderName, rel);
        const filesX = await fsp.readdir(relPath);
        const ff = [];
        for (let fname of filesX) {
          const filePath = path.join(relPath, fname);
          const v = await fsp.readFile(filePath);
          const base64String = v.toString("base64");
          ff.push(base64String);
        }
        famphotos[rel] = ff;
        famphotosFiles.push(filesX);
      }

      res.render("videoRec.ejs", {
        labels: labels,
        path: pathArr,
        famphotos: famphotos,
        famphotosFiles: famphotosFiles,
      });
    } finally {
      await client.close();
    }
  } catch (err) {
    console.error("Video route error:", err);
    req.flash("error", "Server error");
    res.redirect("/home");
  }
});

app.get("/events", isLoggedIn, async (req, res) => {   let msg = "";   try {     const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });     await client.connect();     const collection = client.db("alzheimers").collection("events");     const data = await collection.find({ patUserName: req.user.username }).toArray();     const result = checkReminders(data);     if (result.length === 0) {       msg = "No upcoming reminders (for 2 hours at least)";     }     await client.close();     res.render("events.ejs", { result: result, msg: msg });   } catch (err) {     console.error("Events error:", err);     req.flash("error", "Server error");     res.redirect("/home");   } });



// --- EVENTS ADD ---
// --- EVENTS ADD ---
// GET: display the add reminder page
app.get("/eventsadd", isLoggedIn, (req, res) => {
  res.render("eventsadd", {
    error: req.flash("error"),
    success: req.flash("success")
  });
});


app.post("/eventsadd", isLoggedIn, async (req, res) => {
  try {
    // Collect selected days
    const days = [];
    for (let d = 0; d <= 6; d++) {
      if (req.body[d] === "on" || req.body[d] === d.toString()) days.push(d.toString());
    }

    // Validate time input
    const timeValue = req.body.time; // Expected "HH:MM"
    if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
      req.flash("error", "Invalid time format. Please use HH:MM.");
      return res.redirect("/eventsadd");
    }

    // Validate message/tag
    const tag = req.body.tag?.trim();
    if (!tag) {
      req.flash("error", "Message cannot be empty.");
      return res.redirect("/eventsadd");
    }

    // Create new event object
    const newEvent = {
      patUserName: req.user.username,
      days: days,
      time: timeValue,
      tag: tag,
    };

    // Insert into MongoDB
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const collection = client.db("alzheimers").collection("events");
    await collection.insertOne(newEvent);
    await client.close();

    req.flash("success", "Reminder added successfully!");
    res.redirect("/eventsadd");
  } catch (err) {
    console.error("Events add error:", err);
    req.flash("error", "Server error. Could not add reminder.");
    res.redirect("/eventsadd");
  }
});




// SAGE TEST
app.get("/games/SAGE", (req, res) => {
  const testData = SAGETestGenerate();
  req.session.sageTest = testData; // store per-session
  res.render("SAGE", { testData: testData });
});

app.post("/games/SAGE", isLoggedIn, async (req, res) => {
  try {
    const test = req.session.sageTest;
    if (!test) {
      req.flash("error", "SAGE test expired. Please try again.");
      return res.redirect("/games/SAGE");
    }
    const score_arr = getSAGEScore(req.body, test);
    let myScore = 0;
    score_arr.forEach((item) => (myScore += item));

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const collection = client.db("alzheimers").collection("users");
    await collection.updateOne({ _id: ObjectId(req.user._id) }, { $push: { sageScores: myScore } });
    await client.close();

    res.render("SageScore", { myScore: myScore });
  } catch (err) {
    console.error("SAGE post error:", err);
    req.flash("error", "Server error");
    res.redirect("/games");
  }
});

app.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const collection = client.db("alzheimers").collection("users");
    const dataArr = await collection.find({ username: req.user.username }).toArray();
    await client.close();

    if (!dataArr || dataArr.length === 0) {
      req.flash("error", "User data not found");
      return res.redirect("/home");
    }

    const data = dataArr[0];
    let lastTenScores = [];
    let lastTenScoresSage = [];

    let start = Math.max(0, (data.scores || []).length - 10);
    let startSage = Math.max(0, (data.sageScores || []).length - 10);

    for (let i = start; i < (data.scores || []).length; i++) {
      lastTenScores.push({ y: data.scores[i] });
    }
    for (let i = startSage; i < (data.sageScores || []).length; i++) {
      lastTenScoresSage.push({ y: data.sageScores[i] });
    }

    let message1 = "";
    if ((data.scores || []).length >= 2) {
      if (data.scores[data.scores.length - 1] >= data.scores[data.scores.length - 2]) {
        message1 = "You are showing great improvement!";
      } else {
        message1 = "Keep working harder, you'll do great!";
      }
    }

    res.render("dashboard.ejs", {
      lastScores: lastTenScores,
      lastScoresSage: lastTenScoresSage,
      message: message1,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    req.flash("error", "Server error");
    res.redirect("/home");
  }
});


// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log("Server Started at http://localhost:" + PORT + "/");
});

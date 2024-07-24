const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
});
const User = mongoose.model("User", userSchema);

// Exercise Schema
const exerciseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Create a new user
app.post("/api/users", async (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const user = new User({ username });
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, { __v: 0 }).exec();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log an exercise for a user
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: "description and duration are required" });
  }

  const exerciseDate = date ? new Date(date) : new Date();

  try {
    const exercise = new Exercise({
      userId: _id,
      description,
      duration,
      date: exerciseDate,
    });
    const savedExercise = await exercise.save();

    const user = await User.findById(_id).exec();
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: _id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user exercise log
app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id).exec();
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const query = { userId: _id };
    if (from) query.date = { $gte: new Date(from) };
    if (to) query.date = { ...query.date, $lte: new Date(to) };

    const exercises = await Exercise.find(query)
      .limit(Number(limit) || 0)
      .exec();

    res.json({
      username: user.username,
      count: exercises.length,
      _id: _id,
      log: exercises.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

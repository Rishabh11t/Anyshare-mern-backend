const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Create uploads folder if not exists
const fs = require("fs");
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Schema for file info
const FileSchema = new mongoose.Schema({
  filename: String,
  uniqueId: String,
});
const FileModel = mongoose.model("File", FileSchema);

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const uniqueId = Math.floor(10000 + Math.random() * 90000).toString();

    const newFile = new FileModel({
      filename: req.file.filename,
      uniqueId,
    });

    await newFile.save();
    res.json({ message: "Upload successful", unique: uniqueId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download endpoint
app.get("/download/:uniqueId", async (req, res) => {
  try {
    const file = await FileModel.findOne({ uniqueId: req.params.uniqueId });
    if (!file) return res.status(404).send("File not found");

    const filePath = path.join(__dirname, "uploads", file.filename);
    res.download(filePath, (err) => {
      if (!err) {
        // Delete file after download
        fs.unlinkSync(filePath);
        file.deleteOne();
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error downloading file");
  }
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Define the storage path
const storageDir = path.join(__dirname, "../tender_files");

// Ensure the directory exists
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir); // Save files to the specified directory
  },
  filename: (req, file, cb) => {
    // Customize the filename (e.g., add timestamp to avoid name conflicts)
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Module to check authenticateToken
const { authenticateToken } = require("../controllers/auth");

// Import controllers
const {
  createTender,
  viewOpenTenders,
  viewClosedTenders,
  editTenders,
  changeFile,
} = require("../controllers/tender");

// Route to handle file upload and tender creation
router.post(
  "/createTender",
  authenticateToken,
  upload.array("files", 5), // "files" is the field name, allowing up to 5 files
  createTender
);
//route to update the uploaded file by uploading another file
router.post(
  "/changeFile",
  authenticateToken,
  upload.single("file"),
  changeFile
);

router.get("/getTenders", viewOpenTenders);
router.get("/getClosedTenders", viewClosedTenders);
router.post("/editTenders", authenticateToken, editTenders);

module.exports = router;

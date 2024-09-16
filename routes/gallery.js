const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../db"); // MySQL connection pool
const router = express.Router();

// Define the storage path
const storageDir = path.join(__dirname, "../Gallery/events");

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

// File filter to accept only images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv/;
  const mimeType = allowedTypes.test(file.mimetype.toLowerCase());
  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (mimeType && extName) {
    return cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 50MB
  fileFilter: fileFilter,
});

// Module to check authenticateToken
const { authenticateToken } = require("../controllers/auth");

// Import controllers
const {
  createEvent,
  viewEvents,
  viewEventGallery,
  deleteEventImage,
} = require("../controllers/gallery");

// Serve uploaded files (images/videos) statically
router.use("/event_files", express.static(storageDir));

// Route to handle file upload and event creation
router.post(
  "/createEvent",
  authenticateToken,
  upload.fields([
    { name: "event_img", maxCount: 1 }, // Single image for the event_img field
    { name: "files", maxCount: 100 }, // Multiple files for event_documents
  ]),
  createEvent
);

router.get("/viewEvents", viewEvents);
router.get("/viewEventGallery", viewEventGallery);
router.delete("/deleteEventImage", authenticateToken, deleteEventImage);

module.exports = router;

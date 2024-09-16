const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../db"); // MySQL connection pool
const router = express.Router();

// Define the storage path for project files
const storageDir = path.join(__dirname, "../Gallery/projects");

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

// Import controllers for projects
const {
  createProject,
  viewProjects,
  viewProjectGallery,
  deleteProjectFile,
} = require("../controllers/projects"); // Change to 'projects' controller

// Serve uploaded files (images/videos) statically
router.use("/project_files", express.static(storageDir));

// Route to handle file upload and project creation
router.post(
  "/createProject",
  authenticateToken,
  upload.fields([
    { name: "project_img", maxCount: 1 }, // Single image for the project_img field
    { name: "files", maxCount: 100 }, // Multiple files for project_files
  ]),
  createProject
);

// Routes to view projects and gallery
router.get("/viewProjects", viewProjects);
router.get("/viewProjectGallery", viewProjectGallery);

// Route to delete project file
router.delete("/deleteProjectFile", authenticateToken, deleteProjectFile);

module.exports = router;

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");
const db = require("./db");
const cors = require("cors");
const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use cors middleware before defining routes
app.use(cors(corsConfig));
app.options("", cors(corsConfig));
// Serve static files from the /tender_files directory
app.use("/tender_files", express.static(path.join(__dirname, "tender_files")));
app.use("/Gallery", express.static(path.join(__dirname, "Gallery")));

// Load environment variables
dotenv.config();
// Use cors middleware before defining routes
// app.use(cors(corsConfig));
// app.options("", cors(corsConfig));

//adding routes
const auth_route = require("./routes/auth");
const tender = require("./routes/tender");
const gallery = require("./routes/gallery");
const projects = require("./routes/projects");

app.use(auth_route);
app.use(tender);
app.use(gallery);
app.use(projects);

// Storage setup for file uploads using multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Routes

// Admin login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err || results.length === 0)
        return res.status(400).json({ message: "User not found" });

      const user = results[0];
      const passwordValid = bcrypt.compareSync(password, user.password);

      if (!passwordValid)
        return res.status(401).json({ message: "Invalid password" });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token });
    }
  );
});

// // Form submission with file upload (after login)
// app.post(
//   "/submit-form",
//   authenticateToken,
//   upload.single("file"),
//   (req, res) => {
//     const { someField } = req.body;
//     const filePath = req.file.path;

//     // Process the form data and save the file path in the database
//     res.json({ message: "Form submitted", filePath });
//   }
// );

// Add event with multiple images and videos
// app.post(
//   "/add-event",
//   authenticateToken,
//   upload.array("files", 10),
//   (req, res) => {
//     const { eventName } = req.body;

//     db.query(
//       "INSERT INTO events (event_name) VALUES (?)",
//       [eventName],
//       (err, result) => {
//         if (err) return res.status(500).json({ message: "Database error" });

//         const eventId = result.insertId;

//         const files = req.files.map((file) => {
//           const fileType = file.mimetype.startsWith("image")
//             ? "image"
//             : "video";
//           return [eventId, fileType, file.path];
//         });

//         db.query(
//           "INSERT INTO files (event_id, file_type, file_path) VALUES ?",
//           [files],
//           (err) => {
//             if (err)
//               return res
//                 .status(500)
//                 .json({ message: "Failed to upload files" });
//             res.json({ message: "Event created with files" });
//           }
//         );
//       }
//     );
//   }
// );

// Start server
app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});

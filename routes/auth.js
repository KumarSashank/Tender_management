const { Router } = require("express");
// const { authenticateToken } = require('../controllers/auth');
const { adminSignIn, verifyToken } = require("../controllers/auth");
const router = Router();

// router.post("/create_qps", createQPS);
// router.post("/create_nos", createNOS);
router.post("/adminSignIn", adminSignIn);
router.get("/verifyToken", verifyToken);

// router.post("/signup", signupUser); // Route for user signup
// router.post("/signin/:role", signinUser); // Route for user sign in with role parameter
// router.post("/createSSC", createSSC); // Route for creating SSC

router.get("/hello", (req, res) => {
  res.send("Hello, World!");
});

module.exports = router;

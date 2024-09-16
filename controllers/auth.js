const path = require("path");
const express = require("express");
const jwt = require("jsonwebtoken");

const secretKey = process.env.SECRET_KEY;
const db = require("../db");

// export  Middleware for JWT authentication to use in other files
module.exports.authenticateToken = (req, res, next) => {
  const token =
    req.header("Authorization") && req.header("Authorization").split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

//verify token and send client, the token is valid to load specific page
module.exports.verifyToken = (req, res) => {
  const token =
    req.header("Authorization") && req.header("Authorization").split(" ")[1];
  console.log(token);
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    res.status(200).json({ message: "Token is valid" });
    console.log({ message: "Token is valid" });
  });
};
// admin login route
module.exports.adminSignIn = async (req, res) => {
  const { username, password } = req.body;

  if (username == "admin" && password == "admin@12345") {
    const token = jwt.sign({ id: username }, secretKey, {
      expiresIn: "1h",
    });
    res.json({ token });
  } else {
    res.status(400).json({ message: "Incorrect username or password" });
  }
};

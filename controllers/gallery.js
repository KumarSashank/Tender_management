const express = require("express");
const fs = require("fs");
const { authenticateToken } = require("../controllers/auth");
const path = require("path");
const util = require("util");
const unlinkAsync = util.promisify(fs.unlink);
const pool = require("../db"); // MySQL connection pool

// create a controller to create an event and upload files
module.exports.createEvent = async (req, res) => {
  const { event_name } = req.body;
  console.log("Event_name: ", event_name);

  // Get the single event image and other files
  const eventImg = req.files?.event_img ? req.files.event_img[0] : null;
  const files = req.files?.files || [];

  console.log("Event image:", eventImg);
  console.log("Other files:", files);

  // Ensure that the event image is uploaded
  if (!eventImg) {
    return res.status(400).json({ message: "Event image is required" });
  }

  // Ensure that other files are uploaded
  if (files.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one other file is required" });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Path for event_img
    const eventImgPath = `/events/${eventImg.filename}`;

    // Insert event name and event image into the 'events' table
    const [eventResult] = await connection.execute(
      "INSERT INTO events (event_name, event_img) VALUES (?, ?)",
      [event_name, eventImgPath]
    );
    const eventId = eventResult.insertId;

    // Insert all other files into the 'event_documents' table
    const fileInsertPromises = files.map((file) => {
      const relativePath = `/events/${file.filename}`;
      return connection.execute(
        "INSERT INTO event_files (event_id, files_name, files_path) VALUES (?, ?, ?)",
        [eventId, file.originalname, relativePath]
      );
    });

    await Promise.all(fileInsertPromises);
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: "Event created successfully",
      eventId: eventId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create event" });
  }
};

module.exports.viewEvents = async (req, res) => {
  const BASE_URL = "http://localhost:3000/Gallery"; // Change this to your actual base URL
  try {
    const [events] = await pool.query("SELECT * FROM events");

    // Map through the events to modify the event_img path
    const eventsWithFullImgUrl = events.map((event) => {
      return {
        ...event,
        event_img: `${BASE_URL}${event.event_img}`, // Construct the full URL for the event_img
      };
    });

    res.json(eventsWithFullImgUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get events" });
  }
};

module.exports.viewEventGallery = async (req, res) => {
  const { eventId } = req.query;
  console.log("event id : ", eventId);
  try {
    //retrieve the event name
    const [event] = await pool.query(
      "SELECT event_name FROM events WHERE id = ?",
      [eventId]
    );

    // Retrieve event files from the database, including file ID
    const [files] = await pool.query(
      "SELECT id AS file_id, files_name, files_path FROM event_files WHERE event_id = ?",
      [eventId]
    );

    // Base URL for accessing static files
    const baseUrl = `${req.protocol}://${req.get("host")}/Gallery`;

    // Construct the file URLs with file ID, file name, and file URL
    const filesWithUrls = files.map((file) => ({
      fileId: file.file_id,
      fileName: file.files_name,
      fileUrl: `${baseUrl}${file.files_path}`, // Combine base URL with the stored path
    }));

    // Send the response with the files, their IDs, names, and URLs
    res.json({
      eventId: eventId,
      eventName: event[0].event_name,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get event files" });
  }
};

module.exports.deleteEventImage = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "File ID is required" });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Get the file path from the 'event_files' table using the provided id
    const [fileResult] = await connection.execute(
      "SELECT files_path FROM event_files WHERE id = ?",
      [id]
    );

    if (fileResult.length === 0) {
      connection.release();
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = fileResult[0].files_path;

    // Resolve the full path to the old file
    const absoluteOldFilePath = path.join(
      __dirname,
      "..",
      "/Gallery",
      filePath
    );
    console.log("Old File Path : ", absoluteOldFilePath);

    //2.  Delete the old file from the server
    try {
      await unlinkAsync(absoluteOldFilePath);
      console.log("Uploaded file deleted successfully.");
      // console.log("File accessed");
      // await fs.unlink(absoluteOldFilePath);
      // console.log(`Deleted old file: ${absoluteOldFilePath}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("Old file not found, skipping deletion");
      } else {
        throw error;
      }
    }

    try {
      // 3. Delete the corresponding row from the 'event_files' table
      await connection.execute("DELETE FROM event_files WHERE id = ?", [id]);

      // 4. Commit the transaction and release the connection
      await connection.commit();
      connection.release();

      res.status(200).json({ message: "File deleted successfully" });
    } catch (dbError) {
      console.error(`Error deleting database record: ${dbError}`);
      await connection.rollback();
      connection.release();
      res
        .status(500)
        .json({ message: "Failed to delete record from database" });
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

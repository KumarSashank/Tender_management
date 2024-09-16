// For Projects
const express = require("express");
const fs = require("fs");
const { authenticateToken } = require("../controllers/auth");
const path = require("path");
const util = require("util");
const unlinkAsync = util.promisify(fs.unlink);
const pool = require("../db"); // MySQL connection pool

// create a controller to create a project and upload files
module.exports.createProject = async (req, res) => {
  const { project_name } = req.body;
  console.log("Project Name: ", project_name);

  // Get the single project image and other files
  const projectImg = req.files?.project_img ? req.files.project_img[0] : null;
  const files = req.files?.files || [];

  console.log("Project image:", projectImg);
  console.log("Other files:", files);

  // Ensure that the project image is uploaded
  if (!projectImg) {
    return res.status(400).json({ message: "Project image is required" });
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

    // Path for project_img
    const projectImgPath = `/projects/${projectImg.filename}`;

    // Insert project name and project image into the 'projects' table
    const [projectResult] = await connection.execute(
      "INSERT INTO projects (project_name, project_img) VALUES (?, ?)",
      [project_name, projectImgPath]
    );
    const projectId = projectResult.insertId;

    // Insert all other files into the 'project_files' table
    const fileInsertPromises = files.map((file) => {
      const relativePath = `/projects/${file.filename}`;
      return connection.execute(
        "INSERT INTO project_files (project_id, files_name, files_path) VALUES (?, ?, ?)",
        [projectId, file.originalname, relativePath]
      );
    });

    await Promise.all(fileInsertPromises);
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: "Project created successfully",
      projectId: projectId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create project" });
  }
};

module.exports.viewProjects = async (req, res) => {
  const BASE_URL = "http://localhost:3000/Gallery"; // Change this to your actual base URL
  try {
    const [projects] = await pool.query("SELECT * FROM projects");

    // Map through the projects to modify the project_img path
    const projectsWithFullImgUrl = projects.map((project) => {
      return {
        ...project,
        project_img: `${BASE_URL}${project.project_img}`, // Construct the full URL for the project_img
      };
    });

    res.json(projectsWithFullImgUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get projects" });
  }
};

module.exports.viewProjectGallery = async (req, res) => {
  const { projectId } = req.query;
  console.log("Project ID: ", projectId);
  try {
    // Retrieve the project name
    const [project] = await pool.query(
      "SELECT project_name FROM projects WHERE id = ?",
      [projectId]
    );

    // Retrieve project files from the database, including file ID
    const [files] = await pool.query(
      "SELECT id AS file_id, files_name, files_path FROM project_files WHERE project_id = ?",
      [projectId]
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
      projectId: projectId,
      projectName: project[0].project_name,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get project files" });
  }
};

module.exports.deleteProjectFile = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "File ID is required" });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Get the file path from the 'project_files' table using the provided id
    const [fileResult] = await connection.execute(
      "SELECT files_path FROM project_files WHERE id = ?",
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

    // 2. Delete the old file from the server
    try {
      await fs.promises.unlink(absoluteOldFilePath);
      console.log("Uploaded file deleted successfully.");
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("Old file not found, skipping deletion");
      } else {
        throw error;
      }
    }

    // 3. Delete the corresponding row from the 'project_files' table
    await connection.execute("DELETE FROM project_files WHERE id = ?", [id]);

    // 4. Commit the transaction and release the connection
    await connection.commit();
    connection.release();

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ message: "Server error" });
  }
};

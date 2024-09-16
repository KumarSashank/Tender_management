const express = require("express");
const fs = require("fs");
const { authenticateToken } = require("../controllers/auth");
const path = require("path");
const util = require("util");
const unlinkAsync = util.promisify(fs.unlink);

//create a controller to create tender

// controllers/tender.js

const pool = require("../db"); // MySQL connection pool

module.exports.createTender = async (req, res) => {
  const { tender_notice_no, project_work, issuing_authority } = req.body;
  console.log("Tender_notice_no: ", tender_notice_no);
  console.log("Project_work: ", project_work);
  console.log("Issuing_authority: ", issuing_authority);

  const files = req.files;
  console.log(files);

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert tender into the `tenders` table
    const [tenderResult] = await connection.execute(
      "INSERT INTO tenders (tender_notice_no, project_work, issuing_authority) VALUES (?, ?, ?)",
      [tender_notice_no, project_work, issuing_authority]
    );

    const tenderId = tenderResult.insertId;

    // Insert file details into the `files` table
    const fileInsertPromises = files.map((file) => {
      const relativePath = `/tender_files/${file.filename}`; // Use relative path
      return connection.execute(
        "INSERT INTO tender_documents (tender_id, document_name, document_path) VALUES (?, ?, ?)",
        [tenderId, file.originalname, relativePath]
      );
    });
    // Wait for all file inserts to complete
    await Promise.all(fileInsertPromises);

    // Commit the transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: "Tender created successfully",
      tenderId: tenderId,
    });
  } catch (error) {
    console.error(error);

    // If any error occurs, rollback the transaction
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    res.status(500).json({ message: "Failed to create tender" });
  }
};

module.exports.viewOpenTenders = async (req, res) => {
  try {
    const [tendersWithDocuments] = await pool.query(`
      SELECT 
          t.id AS tender_id,
          t.tender_notice_no,
          t.project_work,
          t.issuing_authority,
          t.uploaded_at AS tender_created_at,
          td.id AS document_id,
          td.document_name,
          td.document_path,
          td.uploaded_at AS document_created_at
      FROM 
          tenders t
      LEFT JOIN 
          tender_documents td ON t.id = td.tender_id
      WHERE 
          t.status = 1;  -- Include this line only if 'status' exists
    `);

    // Transform the results into the desired structure
    const result = tendersWithDocuments.reduce((acc, tender) => {
      const {
        tender_id,
        tender_notice_no,
        project_work,
        issuing_authority,
        tender_created_at,
        document_id,
        document_name,
        document_path,
      } = tender;

      // Check if the tender is already in the accumulator
      let existingTender = acc.find((item) => item.tender_id === tender_id);

      if (!existingTender) {
        // If the tender does not exist in the result, create a new object
        existingTender = {
          tender_id,
          tender_notice_no,
          project_work,
          issuing_authority,
          tender_created_at,
          documents: [], // Initialize an empty array for documents
        };
        acc.push(existingTender);
      }

      // Push the document details with the URL into the documents array
      if (document_id) {
        // Only add if there is a document
        const fileUrl = `${req.protocol}://${req.get("host")}${document_path}`;
        existingTender.documents.push({
          document_id,
          document_name,
          document_url: fileUrl, // Use the URL instead of the file path
        });
      }

      return acc;
    }, []);

    // Send the transformed data as a JSON response
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch tenders with documents" });
  }
};

module.exports.viewClosedTenders = async (req, res) => {
  try {
    const [tendersWithDocuments] = await pool.query(`
      SELECT 
          t.id AS tender_id,
          t.tender_notice_no,
          t.project_work,
          t.issuing_authority,
          t.uploaded_at AS tender_created_at,
          td.id AS document_id,
          td.document_name,
          td.document_path,
          td.uploaded_at AS document_created_at
      FROM 
          tenders t
      LEFT JOIN 
          tender_documents td ON t.id = td.tender_id
      WHERE 
          t.status = 0;  -- Filtering for closed tenders (status = 0)
    `);

    // Transform the results into the desired structure
    const result = tendersWithDocuments.reduce((acc, tender) => {
      const {
        tender_id,
        tender_notice_no,
        project_work,
        issuing_authority,
        tender_created_at,
        document_id,
        document_name,
        document_path,
      } = tender;

      // Check if the tender is already in the accumulator
      let existingTender = acc.find((item) => item.tender_id === tender_id);

      if (!existingTender) {
        // If the tender does not exist in the result, create a new object
        existingTender = {
          tender_id,
          tender_notice_no,
          project_work,
          issuing_authority,
          tender_created_at,
          documents: [], // Initialize an empty array for documents
        };
        acc.push(existingTender);
      }

      // Push the document path into the documents array
      if (document_id) {
        // Only add if there is a document
        existingTender.documents.push({
          document_id,
          document_name,
          document_path,
        });
      }

      return acc;
    }, []);

    // Send the transformed data as a JSON response
    res.json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch closed tenders with documents" });
  }
};

module.exports.editTenders = async (req, res) => {
  try {
    const { tender_notice_no, project_work, issuing_authority, status, id } =
      req.body;

    console.log(tender_notice_no);
    console.log(project_work);
    console.log(issuing_authority);
    console.log(status);
    console.log(id);
    // const {id}=req.params;
    const [result] = await pool.query(
      "UPDATE tenders SET tender_notice_no=?,project_work=?,issuing_authority=? ,status=? WHERE id=? ;",
      [tender_notice_no, project_work, issuing_authority, status, id]
    );
    res.json({ message: "Tender updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update tender" });
  }
};

module.exports.changeFile = async (req, res) => {
  try {
    const { document_name, document_path, id } = req.body;
    console.log("Document Name : ", document_name);
    console.log("Document Path : ", document_path);
    console.log("ID : ", id);

    // Resolve the full path to the old file
    const absoluteOldFilePath = path.join(__dirname, "..", document_path);
    console.log("Old File Path : ", absoluteOldFilePath);

    // Delete the old file from the server
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

    // Get the uploaded file information
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No new file uploaded" });
    }

    // Construct the new file path (relative to the server)
    const newFilePath = `/tender_files/${file.filename}`; // file.filename is generated by multer

    // Update the file path in the database
    const [result] = await pool.query(
      "UPDATE tender_documents SET document_name=?, document_path=? WHERE id=?",
      [document_name, newFilePath, id]
    );

    // Send success response
    res.json({ message: "File updated successfully", newFilePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update file" });
  }
};

module.getTender = async (req, res) => {
  try {
    const { id } = req.params;
    const [tender] = await pool.query("SELECT * FROM tenders WHERE id=?", [id]);
    //send response with document links
    res.json(tender[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch tender" });
  }
};

-- Active: 1726388516787@@127.0.0.1@3306@Tender_management
-- Create the `tenders` table
CREATE TABLE tenders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tender_notice_no VARCHAR(100) NOT NULL,
    project_work VARCHAR(255) NOT NULL,
    issuing_authority VARCHAR(255) NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1, -- Boolean: 1 (Active), 0 (Closed)
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the `tender_documents` table
CREATE TABLE tender_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tender_id INT NOT NULL, -- Foreign key to the tenders table
    document_name VARCHAR(255) NOT NULL, -- Name of the document (e.g., "RFP", "Corrigendum", "Addendum")
    document_path VARCHAR(255) NOT NULL, -- Path to the uploaded document
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE
);

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL, -- Name of the event (e.g., "RFP", "Corrigendum", "Addendum")
    event_img TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL, -- Foreign key to the tenders table
    files_name VARCHAR(255) NOT NULL, -- Name of the document (e.g., "RFP", "Corrigendum", "Addendum")
    files_path VARCHAR(255) NOT NULL, -- Path to the uploaded document
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL, -- Name of the event (e.g., "RFP", "Corrigendum", "Addendum")
    project_img TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL, -- Foreign key to the tenders table
    files_name VARCHAR(255) NOT NULL, -- Name of the document (e.g., "RFP", "Corrigendum", "Addendum")
    files_path VARCHAR(255) NOT NULL, -- Path to the uploaded document
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES events (id) ON DELETE CASCADE
);

DROP TABLE events;

SELECT * FROM projects;

SELECT * FROM tender_documents;

SHOW TABLES;
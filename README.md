# quizlet-to-docx

A Node.js API utility to fetch Quizlet sets and export the questions and answers to a formatted .docx Word document. The tool processes the flashcard data from Quizlet public URLs and highlights correct answers in red.

# Features

- Fetches flashcard data from Quizlet sets using their public URLs.
- Exports the data as a .docx Word document.
- Highlights correct answers in red for clarity.
- Supports CORS to allow cross-origin requests.

# Prerequisites

- Node.js: Version 14 or higher.
- Puppeteer dependencies: Install system dependencies for Puppeteer as required by your operating system:
  - Puppeteer troubleshooting guide.

# Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/khoahocmai/quizlet-to-docx.git
   cd quizlet-to-word-docx
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

# API Usage

## Endpoint

**GET /quizlet-set/:setId**

Fetches a Quizlet set and exports it as a Word document.

---

## Parameters:

- **:setId**: The unique ID of the Quizlet set.  
   Example: `123456789` in the URL `https://quizlet.com/123456789`.

---

## Response

- **Success**:  
  Returns a confirmation message and saves the Word document as `questions.docx`.

- **Failure**:  
  Returns a `404` or `500` error with a detailed description.

---

## Example Request

```bash
curl http://localhost:3000/quizlet-set/123456789
```

# Dependencies

- **Express**: Web framework for building the API.
- **Puppeteer-extra**: A headless browser for scraping Quizlet.
- **puppeteer-extra-plugin-stealth**: Avoid detection while scraping.
- **docx**: Library for generating .docx Word files.
- **fs**: File system operations for saving documents.

👨‍💻 [Created by khoahocmai](https://github.com/khoahocmai)

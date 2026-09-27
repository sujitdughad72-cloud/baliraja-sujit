# BaliRaja - Local Setup Guide

This project is built with React, Vite, and Tailwind CSS. Follow these steps to run it on your local machine.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Setup Instructions

1. **Download the Code:**
   - Use the **Settings** menu in AI Studio Build to **Export to ZIP** or **Export to GitHub**.
   - Extract the ZIP file to a folder on your computer.

2. **Install Dependencies:**
   - Open your terminal (Command Prompt, PowerShell, or Terminal).
   - Navigate to the project folder:
     ```bash
     cd path/to/your/project
     ```
   - Run the install command:
     ```bash
     npm install
     ```

3. **Configure Environment Variables:**
   - Create a new file named `.env` in the root directory (same place as `package.json`).
   - Add your Gemini API Key to this file:
     ```env
     GEMINI_API_KEY=your_api_key_here
     ```
   - **Note:** Do NOT share this `.env` file or commit it to public repositories.

4. **Run the Development Server:**
   - Start the app by running:
     ```bash
     npm run dev
     ```
   - The app will usually be available at `http://localhost:3000` (or the port shown in your terminal).

## Project Structure

- `src/`: Contains the main React components and logic.
- `services/geminiService.ts`: Handles AI features.
- `firebase.ts`: Firebase configuration (requires setup in Firebase Console for local use).

## Important Note on Firebase

To use Firebase features (Database/Auth) locally, you will need to:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable Firestore and Authentication (Google Provider).
3. Update `firebase-applet-config.json` with your own project credentials.

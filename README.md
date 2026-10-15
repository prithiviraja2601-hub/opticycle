# OptiCycle

**Optical Biosensing & Colorimetry — Experimental Research Prototype**

OptiCycle is a research prototype designed to capture images of colorimetric biosensing patches, calibrate images using a reference color card, and analyze patch colors using optical colorimetry.

## Features

- **Patch Scanner:** Capture or upload patch images.
- **Image Quality Check:** Assess image sharpness, lighting, glare, and reference-card visibility.
- **Color Calibration:** Use a six-target reference card to reduce lighting and camera-related color variation.
- **Color Analysis:** Extract RGB and HEX values from patch images.
- **Scan History:** Store and review previous scan results, where supported.
- **Experimental Cycle Insights:** Display estimated cycle information when the required user-provided data is available.

**Important:** OptiCycle is an experimental research prototype. Its color analysis is not clinically validated and must not be used to diagnose medical conditions, confirm ovulation, or make treatment decisions.

## Technology Stack

- Frontend: React / Vite / TypeScript (confirm against the current project configuration)
- Backend: Node.js / Express (if configured in the project)
- Image processing: Color extraction and reference-based calibration

## Project Structure

```text
opticycle/
├── app/
├── data/
├── server/
├── src/
├── index.html
├── package.json
├── server.ts
└── README.md
```

The exact structure may vary as the project develops.

## Getting Started

### Prerequisites

- Node.js and npm, if required by the project
- Git
- A modern web browser

### Installation

1. Clone the repository:

   ```bash
   git clone YOUR_REPOSITORY_URL
   cd YOUR_REPOSITORY_FOLDER
   ```

2. Install dependencies using the package manager specified by the project.

   ```bash
   npm install
   ```

3. Configure the required environment variables using the example environment file, if provided.

4. Start the application using the development command defined in `package.json`.

   ```bash
   npm run dev
   ```

Check the project's scripts before running these commands; the frontend and backend may need separate startup commands.

## Environment Variables

Create a local `.env` file if required by the application. Use `.env.example` as a reference.

Do not commit API keys, passwords, database credentials, or other secrets to GitHub. Only document the variables actually required by the project.

## Testing

Verify the following:

- Image upload and camera capture work.
- Image quality checks handle poor lighting and blurry images.
- Reference colors can be detected and calibration can be performed.
- RGB and HEX values are displayed correctly.
- Invalid images and missing reference cards produce appropriate errors.
- Scan history and API endpoints work where implemented.
- Experimental results are clearly labeled.

## Documentation

Add a Technical Design Document describing the system architecture, data flow, calibration approach, API endpoints, and limitations.

Add representative sample data and test cases that do not contain personal or sensitive information.

## License

A license has not yet been specified. Add a `LICENSE` file after selecting an appropriate license.

## Disclaimer

OptiCycle is intended for research and demonstration purposes only. Its outputs are experimental and are not a substitute for professional medical advice or clinically validated testing.

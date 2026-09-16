# FocusForge — Smart Task Prioritizer

FocusForge is a responsive, local-first productivity dashboard built with **HTML, CSS and vanilla JavaScript**.

Instead of being a basic to-do list, FocusForge calculates an **explainable Focus Score** for each open task using priority, due-date urgency, overdue status, current workflow status and estimated effort.

## Features

- Create, edit and delete tasks
- Backlog / Doing / Done workflow
- Priority levels and categories
- Due dates and effort estimates
- Rule-based **Focus Score**
- Top 3 focus recommendations
- Search, filters and sorting
- Today and overdue views
- Completion analytics
- 25-minute focus timer
- Light / dark theme
- LocalStorage persistence
- JSON export and import
- Responsive RTL interface
- No framework and no external dependency

## Focus Score

The score is deterministic and explainable. It uses:

- task priority
- proximity to due date
- overdue penalties
- whether a task is already in progress
- estimated effort

The app does **not** claim to use AI.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Web Storage API (LocalStorage)
- File / Blob APIs for JSON backup
- Dialog API

## Run Locally

No build step is required.

1. Clone the repository.
2. Open `index.html` in your browser.

For development, using VS Code Live Server is recommended.

## Suggested GitHub Pages Deployment

1. Push the project to GitHub.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Save.

## Project Structure

```text
focusforge-smart-task-manager/
├── index.html
├── style.css
├── script.js
└── README.md
```

## What This Project Demonstrates

- DOM manipulation
- event delegation
- state management without a framework
- persistence with LocalStorage
- deterministic prioritization logic
- filtering and sorting
- responsive UI design
- accessibility-aware markup
- import/export workflows
- timer state and intervals

## Next Improvements

- drag-and-drop workflow
- recurring tasks
- keyboard shortcuts
- focus-session history
- chart-based productivity analytics

---

Built as a portfolio project for learning and demonstrating frontend fundamentals.

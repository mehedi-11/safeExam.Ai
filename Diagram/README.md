# safeExam.Ai — System Diagrams & Visual Models

All diagrams representing the system architecture, use case interactions, examination lifecycle, database design, violation decision matrix, and network resilience protocols.

---

## 📁 Directory Structure & Formats Available

Each diagram is provided in three formats:
1. **SVG (`.svg`)**: Scalable Vector Graphics for infinite zoom, crystal-clear printing, and embedding in PowerPoint or Word.
2. **PNG (`.png`)**: Ultra-high-resolution raster images for direct inclusion in documents, markdown, or web pages.
3. **Mermaid (`.mmd`)**: Standard Mermaid syntax definitions for Git rendering and IDE diagrams.

---

## 🖼️ Diagram Catalog

### 1. [System Architecture Diagram](01_System_Architecture_Diagram.svg)
- **Formats:** [SVG](01_System_Architecture_Diagram.svg) | [PNG](01_System_Architecture_Diagram.png) | [Mermaid](01_System_Architecture_Diagram.mmd)
- **Description:** 3-Tier model illustrating Presentation & Edge AI Tier (React 18, Agent ELI YOLOv11 model running in-browser), Application Gateway Tier (Node.js/Express with Demerit scoring and Heartbeat scanner), and Persistence Tier (MongoDB Atlas collections).

### 2. [Use Case Diagram](02_Use_Case_Diagram.svg)
- **Formats:** [SVG](02_Use_Case_Diagram.svg) | [PNG](02_Use_Case_Diagram.png) | [Mermaid](02_Use_Case_Diagram.mmd)
- **Description:** Interactions across three actors: **Student** (Login, Camera permission, Answering, Modals), **Teacher** (Exam creation, Live Roster tabs, Filtered logs, Grading), and **Agent ELI** (Edge inference, shortcut trapping, 10-demerit limit).

### 3. [System Workflow & Activity Lifecycle](03_System_Workflow_Activity_Diagram.svg)
- **Formats:** [SVG](03_System_Workflow_Activity_Diagram.svg) | [PNG](03_System_Workflow_Activity_Diagram.png) | [Mermaid](03_System_Workflow_Activity_Diagram.mmd)
- **Description:** End-to-end flowchart covering login, agreement, active surveillance loop, progressive penalty accumulation, and auto-submit triggers.

### 4. [Database Design (ER Diagram)](04_Database_ER_Diagram.svg)
- **Formats:** [SVG](04_Database_ER_Diagram.svg) | [PNG](04_Database_ER_Diagram.png) | [Mermaid](04_Database_ER_Diagram.mmd)
- **Description:** Complete Entity-Relationship schema defining `Users`, `Exams`, `ExamQuestions`, `StudentExams`, and `ProctoringLogs` with foreign keys, data types, and cardinalities.

### 5. [Proctoring & Violation Decision Flowchart](05_Proctoring_Violation_Decision_Flowchart.svg)
- **Formats:** [SVG](05_Proctoring_Violation_Decision_Flowchart.svg) | [PNG](05_Proctoring_Violation_Decision_Flowchart.png) | [Mermaid](05_Proctoring_Violation_Decision_Flowchart.mmd)
- **Description:** Decision tree specifying exact penalties (shortcuts: 1st warn/2nd +1, reload: instant auto-submit, tab switch: +2/countdown, network loss: 5-min hold, phone: 5s confirm modal, 10 demerits: auto-submit).

### 6. [Network Fail-Safe & Heartbeat Sequence Diagram](06_Network_Hold_and_Failure_Sequence_Diagram.svg)
- **Formats:** [SVG](06_Network_Hold_and_Failure_Sequence_Diagram.svg) | [PNG](06_Network_Hold_and_Failure_Sequence_Diagram.png) | [Mermaid](06_Network_Hold_and_Failure_Sequence_Diagram.mmd)
- **Description:** Sequence diagram detailing 10s ping heartbeats, `window.offline` handling, unclosable 5-minute hold modal, and dual fail-safe auto-submission (client timer + backend scanner).

---

## 🌐 Interactive Visual Gallery
Open [`index.html`](index.html) in any browser to view and explore all diagrams interactively.

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

PDF_FILENAME = r"c:\Users\A\Desktop\Mehedi Desktop\Project\safeExam.Ai\SafeExam_AI_Complete_Project_Report.pdf"
DIAGRAM_DIR = r"c:\Users\A\Desktop\Mehedi Desktop\Project\safeExam.Ai\Diagram"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        if self._pageNumber == 1:
            # Suppress header and footer on cover page
            return
        
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header line & text
        self.drawString(40, 810, "SafeExam.AI — Complete Project Report | Primeasia University")
        self.drawRightString(A4[0] - 40, 810, "Dept. of Computer Science & Engineering")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(40, 804, A4[0] - 40, 804)
        
        # Footer line & text
        self.line(40, 42, A4[0] - 40, 42)
        self.setFont("Helvetica", 8)
        self.drawString(40, 30, "Developed by MD Mehedi Hasan & MST Onamika Jannat Ara | Live: safeexamnet.netlify.app")
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(A4[0] - 40, 30, page_str)
        self.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        PDF_FILENAME,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#0F172A"),
        alignment=1, # Center
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#E11D48"),
        alignment=1,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8,
        alignment=4 # Justify
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )

    caption_style = ParagraphStyle(
        'Caption_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        alignment=1,
        spaceBefore=4,
        spaceAfter=12
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B")
    )

    story = []

    # -------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("PRIMEASIA UNIVERSITY", ParagraphStyle('UnivHeader', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor("#475569"), alignment=1)))
    story.append(Paragraph("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", ParagraphStyle('DeptHeader', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=colors.HexColor("#64748B"), alignment=1)))
    story.append(Spacer(1, 35))
    
    # Decorative line
    story.append(HRFlowable(width="60%", thickness=2, color=colors.HexColor("#E11D48"), spaceBefore=0, spaceAfter=30))

    story.append(Paragraph("SafeExam.AI", title_style))
    story.append(Paragraph("An AI-Driven Automated Proctoring and Online Examination System", subtitle_style))
    story.append(Paragraph("FINAL YEAR CAPSTONE PROJECT & TECHNICAL SPECIFICATION REPORT", ParagraphStyle('ReportTag', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=colors.HexColor("#0F172A"), alignment=1)))

    story.append(Spacer(1, 40))

    # Details Box Table
    info_data = [
        [
            Paragraph("<b>SUBMITTED BY:</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor("#0F172A"))),
            Paragraph("<b>SUPERVISED BY:</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor("#0F172A")))
        ],
        [
            Paragraph("<b>MD Mehedi Hasan</b><br/>Student ID: 232004048<br/>Dept. of Computer Science & Engineering<br/>Primeasia University", body_style),
            Paragraph("<b>Sharmin Rashid</b><br/>Lecturer<br/>Dept. of Computer Science & Engineering<br/>Primeasia University", body_style)
        ],
        [
            Paragraph("<b>MST Onamika Jannat Ara</b><br/>Student ID: 232005048<br/>Dept. of Computer Science & Engineering<br/>Primeasia University", body_style),
            Paragraph("<b>LIVE PRODUCTION URL:</b><br/><font color='#E11D48'><b>https://safeexamnet.netlify.app</b></font><br/>Backend: REST API Architecture", body_style)
        ]
    ]

    t_info = Table(info_data, colWidths=[250, 250])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_info)

    story.append(Spacer(1, 50))
    story.append(Paragraph("Date: Academic Session 2026 | Dhaka, Bangladesh", ParagraphStyle('DateText', fontName='Helvetica', fontSize=9, textColor=colors.HexColor("#64748B"), alignment=1)))
    story.append(PageBreak())

    # -------------------------------------------------------------
    # 1. INTRODUCTION
    # -------------------------------------------------------------
    story.append(Paragraph("1. Introduction", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    
    intro_p1 = (
        "<b>SafeExam.AI</b> is an advanced, enterprise-grade online examination and AI-driven automated proctoring platform "
        "engineered to uphold academic integrity within modern decentralized education. As online education, distance learning, "
        "and remote certifications continue to expand worldwide, the absence of physical invigilators has introduced critical "
        "trust vulnerabilities. Traditional remote assessments are severely compromised by unauthorized collaboration, external "
        "web searches, secondary smartphone usage, and impersonation. SafeExam.AI structurally resolves these issues by combining "
        "client-side edge artificial intelligence with rigorous browser-level security enforcement."
    )
    story.append(Paragraph(intro_p1, body_style))

    intro_p2 = (
        "Unlike commercial proctoring tools that require students to install intrusive, kernel-level software or browser extensions "
        "that collect massive amounts of invasive personal data, SafeExam.AI operates entirely within standard modern web browsers. "
        "By deploying the custom-trained <b>Agent ELI</b> computer vision neural network (powered by optimized YOLOv11 and TensorFlow.js), "
        "the student's webcam stream is evaluated frame-by-frame locally on their device. The system immediately identifies security "
        "infractions such as candidate absence, multiple unauthorized individuals in the camera frame, mobile phone usage, and "
        "unauthorized tab navigation. Coupled with built-in network fault-tolerance and automated evaluation, SafeExam.AI delivers a "
        "complete, credible, and privacy-respecting testing ecosystem for educational institutions."
    )
    story.append(Paragraph(intro_p2, body_style))

    # -------------------------------------------------------------
    # 2. MAIN OBJECTIVES
    # -------------------------------------------------------------
    story.append(Paragraph("2. Main Objectives", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("The primary objectives guiding the design, engineering, and implementation of SafeExam.AI are:", body_style))
    
    objs = [
        "<b>Enforce Academic Integrity with Real-Time AI:</b> Deploy continuous client-side computer vision to eliminate cheating by autonomously detecting face absence, multiple faces, and unauthorized electronic devices (smartphones, calculators, headphones).",
        "<b>Secure the Browser Runtime Environment:</b> Prevent candidate access to unauthorized external materials by disabling tab switching, window minimization, keyboard shortcuts, developer inspect tools, and right-click context menus.",
        "<b>Ensure Network Fault-Tolerance and Zero Data Loss:</b> Protect candidates against sudden power outages (load-shedding) or network interruptions through continuous answer auto-saving and an unclosable 5-minute freeze window.",
        "<b>Streamline Examination Workflow and Grading:</b> Automate the end-to-end examination lifecycle, including question catalog creation, timed scheduling, instant objective scoring, and teacher grading tools for descriptive submissions.",
        "<b>Empower Learners through Diagnostic AI Insights:</b> Go beyond punitive proctoring by analyzing student performance data using artificial intelligence (Agent ELI & Gemini) to pinpoint weak subject topics and recommend targeted study strategies.",
        "<b>Unify Multi-Role Institutional Administration:</b> Provide integrated, role-based governance portals for Administrators, Instructors, and Candidates with live proctoring feeds, forensic incident logging, and data export capabilities."
    ]
    for obj in objs:
        story.append(Paragraph(f"• {obj}", bullet_style))

    # -------------------------------------------------------------
    # 3. LITERATURE REVIEW
    # -------------------------------------------------------------
    story.append(Spacer(1, 6))
    story.append(Paragraph("3. Literature Review", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    lit_intro = (
        "To establish a solid scientific and engineering foundation, an extensive literature review was conducted evaluating "
        "existing online assessment paradigms, conventional computer-based testing platforms, and academic supervision methods "
        "commonly utilized across Bangladesh and global educational institutions."
    )
    story.append(Paragraph(lit_intro, body_style))

    story.append(Paragraph("<b>Analysis of Common Assessment Platforms in Bangladesh:</b>", h2_style))
    
    lit_tools = [
        ("Google Forms & Google Classroom:", "Extensively deployed across Bangladeshi schools, colleges, and university departments for routine quizzes. However, Google Forms possesses zero integrity mechanisms: candidates can freely open parallel tabs, search search engines, query generative AI models, or collaborate over messaging apps without any detection."),
        ("Moodle LMS (e.g., BUET, BRACU, DIU BLC):", "Serves as the benchmark institutional Learning Management System in Bangladesh for midterms and final exams. While Moodle is robust for managing question banks and randomized question ordering, it lacks native automated webcam proctoring, face tracking, or tab-lock safeguards without requiring expensive commercial third-party plugins."),
        ("Zoom & Google Meet (Manual Video Proctoring):", "The dominant emergency proctoring method where instructors request 40 to 60 students to enable webcams during examinations. Cognitive load studies prove it is practically impossible for a single human invigilator to monitor dozens of low-resolution video tiles simultaneously. Students routinely exploit camera blind spots to conceal notes or secondary devices."),
        ("Microsoft Teams & Canvas LMS:", "Popular in private universities and international programs. While effective for enterprise collaboration and gradebook tracking, their built-in quiz modules fail to prevent desktop multitasking, external device usage, or impersonation fraud."),
        ("Commercial AI Proctoring Suites (Proctorio, Respondus LockDown Browser):", "Global commercial tools rely on invasive, heavyweight desktop installations that raise severe privacy alarms among students, degrade operating system performance, and impose prohibitively expensive enterprise licensing costs on Bangladeshi universities.")
    ]
    for name, desc in lit_tools:
        story.append(Paragraph(f"• <b>{name}</b> {desc}", bullet_style))

    lit_gap = (
        "<b>The Research & Engineering Gap:</b> Existing platforms fall into two extremes: either they are completely vulnerable "
        "to academic dishonesty (Google Forms, basic Moodle), or they are excessively intrusive, costly, and technically cumbersome "
        "(heavy commercial proctoring software). SafeExam.AI bridges this critical divide by delivering a lightweight, zero-install, "
        "100% browser-based AI proctoring system that guarantees institutional security while simultaneously supporting student academic growth."
    )
    story.append(Paragraph(lit_gap, body_style))

    # -------------------------------------------------------------
    # 4. PROBLEM STATEMENTS AND OFFERED SOLUTION
    # -------------------------------------------------------------
    story.append(Spacer(1, 6))
    story.append(Paragraph("4. Problem Statements and Offered Solution", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>The Core Problem Statements:</b>", h2_style))
    probs = [
        "<b>Rampant Academic Dishonesty:</b> Unproctored remote exams allow widespread cheating via unauthorized mobile devices, secondary monitors, textbooks, and physical assistance from individuals present in the room.",
        "<b>Unrestricted Browser & Desktop Multitasking:</b> Candidates exploit unmonitored browser environments to browse search engines, exchange answers over Discord/WhatsApp, and generate answers using AI chatbots.",
        "<b>Human Invigilator Fatigue:</b> Demanding teachers to visually supervise dozens of webcam feeds over video calls creates severe cognitive exhaustion and inevitably results in overlooked infractions.",
        "<b>Network and Power Fragility in Bangladesh:</b> Frequent internet latency drops and unexpected power load-shedding cause premature exam disconnections, destroying unsaved student answers and inducing panic.",
        "<b>Absence of Diagnostic Learning Feedback:</b> Conventional examination software simply outputs a raw numerical grade, completely failing to diagnose why a student underperformed or how they can improve."
    ]
    for p in probs:
        story.append(Paragraph(f"• {p}", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>The SafeExam.AI Offered Solution:</b>", h2_style))
    
    sol_table_data = [
        [Paragraph("<b>Identified Problem</b>", ParagraphStyle('TH1', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor("#0F172A"))),
         Paragraph("<b>SafeExam.AI Engineered Solution</b>", ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor("#0F172A")))],
        [Paragraph("Unauthorized physical devices and external helpers", body_style),
         Paragraph("<b>Agent ELI AI Vision:</b> Continuous client-side object detection identifying smartphones, electronic items, multiple faces, or candidate absence.", body_style)],
        [Paragraph("Browser tab switching and external web search", body_style),
         Paragraph("<b>Browser Lockdown Engine:</b> Traps keyboard shortcuts (Ctrl+C, Ctrl+V, Alt+Tab, F12), prevents window blur, and flags navigation events with demerit points.", body_style)],
        [Paragraph("Human proctor exhaustion and monitoring gaps", body_style),
         Paragraph("<b>Automated Demerit & Incident Logging:</b> Autonomous AI violation logging with cumulative demerit tracking (auto-submission at 10 demerits) and live teacher console.", body_style)],
        [Paragraph("Frequent internet disconnects and load-shedding", body_style),
         Paragraph("<b>Real-Time Auto-Save & 5-Min Freeze Window:</b> Saves every answer instantaneously and suspends exam countdown for 5 minutes during network drops.", body_style)],
        [Paragraph("Raw test score without learning feedback", body_style),
         Paragraph("<b>Subject Insights AI:</b> Diagnoses topic-level performance, identifies academic weaknesses, and synthesizes personalized study suggestions.", body_style)]
    ]
    t_sol = Table(sol_table_data, colWidths=[200, 315])
    t_sol.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_sol)

    story.append(PageBreak())

    # -------------------------------------------------------------
    # 5. WHAT'S NEW IN MY PROJECT (NOVELTY & KEY DIFFERENTIATORS)
    # -------------------------------------------------------------
    story.append(Paragraph("5. What's New in My Project (Novelty & Innovations)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "SafeExam.AI distinguishes itself from existing commercial software and academic research prototypes through several "
        "distinct technological breakthroughs designed specifically for performance, privacy, and educational impact:", body_style
    ))

    news = [
        ("Zero-Installation Client-Side Edge Inference:", "Unlike competitors requiring proprietary browser downloads or root-level background agents, SafeExam.AI runs neural network object detection directly in the browser via WebAssembly and WebGL acceleration. Any student with Google Chrome, Edge, or Firefox can take proctored tests instantly."),
        ("Privacy-Preserving Local Stream Processing:", "Video frames captured by the student's webcam are analyzed entirely inside the client browser. No raw video feed is transmitted to or stored on backend servers during normal operation, saving massive network bandwidth and rigorously protecting student privacy."),
        ("Progressive Demerit Penalty Scoring Engine:", "Rather than abruptly ejecting candidates upon a single false trigger, SafeExam.AI implements an atomic demerit scoring model. Minor events trigger gentle on-screen warnings, while repeated infractions accumulate demerit points. Only when 10 demerit points are accumulated does the system force-submit the exam."),
        ("Unclosable 5-Minute Offline Hold Resiliency:", "Engineered specifically for infrastructure conditions in developing countries, the system monitors network state via 10-second client-server heartbeats. If connectivity drops, the test enters an unclosable 5-minute pause modal, halting the exam timer and preventing answer loss until reconnection."),
        ("Constructive AI Learning Diagnostics (Beyond Punitive Proctoring):", "Conventional proctoring is purely punitive. SafeExam.AI incorporates an AI Subject Insights engine that evaluates student answers, maps their understanding against course syllabi, and generates tailored study advice to improve future performance."),
        ("Unified Institutional Ecosystem with Event Hosting:", "In addition to standard academic midterms and finals, SafeExam.AI integrates a complete Events Manager for hosting competitive university programming contests, departmental quizzes, and mock tests with public self-registration.")
    ]
    for title, desc in news:
        story.append(Paragraph(f"• <b>{title}</b> {desc}", bullet_style))

    # -------------------------------------------------------------
    # 6. SYSTEM ARCHITECTURE AND USING TECHNOLOGY
    # -------------------------------------------------------------
    story.append(Spacer(1, 8))
    story.append(Paragraph("6. System Architecture and Using Technology", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    arch_text = (
        "SafeExam.AI follows a modular, scalable <b>3-Tier Architecture</b> ensuring strict separation of concerns, high "
        "fault-tolerance, and low-latency interaction. The system is split across the Presentation & Edge AI Tier, the Application "
        "& Controller Tier, and the Persistence & Audit Tier."
    )
    story.append(Paragraph(arch_text, body_style))

    arch_tiers = [
        ("1. Presentation & Edge AI Tier (Client Layer):", "Built with React.js 18, Vite, and Tailwind CSS. Hosts the candidate exam environment (ExamInterface.jsx), the teacher surveillance console (TeacherProctoring.jsx), and the admin portal. Integrates WebRTC webcam video streams directly with Agent ELI (custom-trained YOLOv11 and TensorFlow.js models) running client-side. Enforces browser event guards intercepting shortcuts, window blur, and page reloads."),
        ("2. Application & Controller Tier (Backend Gateway):", "Powered by Node.js and Express.js REST APIs. Features secure JWT authentication middleware, an atomic Proctor Controller for recording demerits and immutable audit logs, a background Heartbeat Monitor scanning for disconnected students, and an automated grading engine for objective questions."),
        ("3. Persistence & Audit Tier (Database Layer):", "Constructed on MongoDB Atlas NoSQL cloud database. Utilizes optimized Mongoose schemas across 14 collections including Users, Exams, ExamQuestions, StudentExams, and ProctoringLogs to maintain ACID-compliant transactional integrity and complete auditability.")
    ]
    for title, desc in arch_tiers:
        story.append(Paragraph(f"• <b>{title}</b> {desc}", bullet_style))

    # Image: Architecture Diagram
    img_arch_path = os.path.join(DIAGRAM_DIR, "01_System_Architecture_Diagram.png")
    if os.path.exists(img_arch_path):
        story.append(Spacer(1, 6))
        story.append(Image(img_arch_path, width=500, height=310))
        story.append(Paragraph("Figure 1: SafeExam.AI 3-Tier System Architecture and Data Flow Model", caption_style))

    # -------------------------------------------------------------
    # 7. ADVANTAGES OF THIS PROJECT
    # -------------------------------------------------------------
    story.append(Spacer(1, 6))
    story.append(Paragraph("7. Advantages of this Project", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("SafeExam.AI offers distinct strategic advantages across all institutional stakeholders:", body_style))

    advs = [
        ("For Educational Institutions:", "Drastically slashes exam operational expenses by over 80% by removing the necessity to hire, schedule, and coordinate human invigilators. Scales effortlessly to thousands of simultaneous exam candidates without server degradation."),
        ("For Teachers and Instructors:", "Eliminates cognitive fatigue from manual video monitoring. Provides instant automated MCQ grading, intuitive manual grading interfaces for descriptive submissions, one-click result publishing, and forensic audit logs with timestamped evidence."),
        ("For Students and Candidates:", "Eliminates the anxiety of intrusive desktop software installations. Ensures 100% fairness by curbing academic dishonesty, protects work against sudden electricity/internet failures, and provides constructive AI diagnostic feedback to support their learning."),
        ("For Technical Operations:", "Ultra-low bandwidth footprint because video frames are processed on the edge rather than streamed continuously to cloud servers. Highly resilient, responsive, and secure against malicious manipulation.")
    ]
    for role, text in advs:
        story.append(Paragraph(f"• <b>{role}</b> {text}", bullet_style))

    story.append(PageBreak())

    # -------------------------------------------------------------
    # 8. DERIVE ALL FEATURES (ADMIN, TEACHERS, STUDENTS)
    # -------------------------------------------------------------
    story.append(Paragraph("8. Comprehensive System Features by Role", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    # Admin Features
    story.append(Paragraph("<b>8.1. Administrator Management Portal</b>", h2_style))
    admin_feats = [
        "<b>Executive KPI Statistics:</b> Real-time counters for Total Students, Total Faculty, Lifetime Exams Created, Completed Exams, and Active Live Exams.",
        "<b>Event Ecosystem Metrics:</b> Visual tracking of total institutional events, currently live events, closed events, and student registrations.",
        "<b>Top Performer Leaderboards:</b> Ranked tables displaying Top 5 Teachers (by exams created), Top 10 Students (by average percentage score), and Top Events (by enrollment).",
        "<b>Interactive Analytics Charts (Recharts):</b> Visual distribution of monthly exams scheduled and categorical breakdowns of AI proctoring cheating alerts.",
        "<b>Teacher Governance:</b> Review, approve, or reject pending teacher signups; manually add approved teachers; suspend or activate teacher accounts; delete teachers; and bulk import teachers via CSV.",
        "<b>Student Directory Governance:</b> View all student profiles, enroll new students, activate/suspend accounts, inspect student exam history via detailed modal, delete accounts, and bulk import students via CSV.",
        "<b>Data Export Capabilities:</b> One-click export of complete Teacher and Student rosters into professional CSV spreadsheets and formatted PDF reports.",
        "<b>Universal Exam Directory:</b> Global visibility of all exams created across departments, filtering by course/instructor, and safe deletion of inactive exams.",
        "<b>Live Proctoring Surveillance:</b> Direct administrative access to active proctoring feeds (/admin/proctoring/:examId) to inspect student video feeds and AI incident logs in real time.",
        "<b>Super Admin Governance:</b> Manage platform credentials, update system configuration, and exclusively create new System Administrator accounts."
    ]
    for feat in admin_feats:
        story.append(Paragraph(f"• {feat}", bullet_style))

    # Teacher Features
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>8.2. Teacher Examination & Proctoring Console</b>", h2_style))
    teacher_feats = [
        "<b>Instructor Dashboard:</b> Live summary counters displaying total exams authored, currently active exams, completed submissions, and quick action shortcuts.",
        "<b>Comprehensive Exam Builder:</b> Create, edit, and delete exams with course codes, duration limits, scheduled dates, passing marks, and private exam passcodes.",
        "<b>Dynamic Question Bank:</b> Author Multiple Choice Questions (with custom option counts and designated correct answers) and descriptive/written questions with point values and reordering.",
        "<b>One-Click Live State Control:</b> Start and stop live examinations manually, or let the automated background worker manage lifecycle timing.",
        "<b>Live Proctoring Console (TeacherProctoring.jsx):</b> Real-time surveillance room displaying candidate counts (Joined, In-Exam, Submitted), live violation log feeds (3-second polling), and individual student filter tabs.",
        "<b>Automated & Manual Grading:</b> Instant automated score compilation for MCQs; dedicated answersheet viewer for grading subjective descriptive answers manually.",
        "<b>Result Publishing Control:</b> Publish or unpublish exam results individually per candidate or globally for the entire examination cohort.",
        "<b>Forensic Incident Reports:</b> Download detailed AI incident logs and student attendance rosters for academic disciplinary committee reviews.",
        "<b>Institutional Events Manager:</b> Create competitive coding contests, quizzes, and mock tests with a full-featured ReactQuill rich-text editor and manage registered candidates."
    ]
    for feat in teacher_feats:
        story.append(Paragraph(f"• {feat}", bullet_style))

    # Student Features
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>8.3. Student Exam Workspace & Learning Portal</b>", h2_style))
    student_feats = [
        "<b>Student Academic Dashboard:</b> Overview showing overall average score percentage, total completed exams, active tests, and upcoming schedules.",
        "<b>Secure Passcode-Protected Access:</b> Multi-attempt passcode modal with an automated 10-minute temporary lockout after 3 consecutive invalid password attempts.",
        "<b>Proctored Exam Workspace (ExamInterface.jsx):</b> Full-screen examination environment with webcam preview, question navigation grid, and live countdown timer.",
        "<b>Client-Side Anti-Cheating Surveillance:</b> Continuous real-time detection of face absence, multiple faces, prohibited mobile devices, and window blur / tab switching.",
        "<b>Instant Auto-Save Engine:</b> Automatically commits student answer selections to the database immediately upon clicking, preventing loss of progress.",
        "<b>Unclosable 5-Minute Network Freeze Modal:</b> Automatically freezes test timer and prevents answer loss during internet drops, resuming smoothly upon reconnection.",
        "<b>AI Subject Insights & Diagnostic Suggestions:</b> Integrated AI analysis (Agent ELI & Gemini) that breaks down test performance and provides actionable study recommendations.",
        "<b>Event Discovery & Registration:</b> Browse upcoming university events, hackathons, and mock exams, and register with one click.",
        "<b>Transparent Results & Answersheet Review:</b> Inspect published exam grades, passing status, and answer evaluations."
    ]
    for feat in student_feats:
        story.append(Paragraph(f"• {feat}", bullet_style))

    story.append(PageBreak())

    # -------------------------------------------------------------
    # 9. SYSTEM USE CASE AND RELATED DIAGRAMS
    # -------------------------------------------------------------
    story.append(Paragraph("9. System Use Case and Related Diagrams", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "To provide a comprehensive architectural, operational, and behavioral specification, SafeExam.AI is modeled through "
        "six unified UML and engineering diagrams detailing every facet of user interaction, decision trees, and network resilience.", body_style
    ))

    # Use Case Diagram
    story.append(Paragraph("<b>9.1. System Use Case Diagram</b>", h2_style))
    story.append(Paragraph(
        "The Use Case Diagram models the system boundaries and direct interactions between the three primary actors: "
        "<b>Student</b> (exam authentication, webcam verification, answer submission, insights review), <b>Teacher</b> (exam creation, "
        "question cataloging, live surveillance, grading, and publishing), and the autonomous actor <b>Agent ELI</b> (continuous webcam "
        "inference, shortcut trapping, atomic demerit scoring, and auto-submit enforcement).", body_style
    ))
    img_usecase_path = os.path.join(DIAGRAM_DIR, "02_Use_Case_Diagram.png")
    if os.path.exists(img_usecase_path):
        story.append(Image(img_usecase_path, width=490, height=300))
        story.append(Paragraph("Figure 2: SafeExam.AI System Use Case Diagram detailing Actor Interactions", caption_style))

    story.append(Spacer(1, 8))

    # Workflow Diagram
    story.append(Paragraph("<b>9.2. System Workflow & Examination Lifecycle</b>", h2_style))
    story.append(Paragraph(
        "The System Workflow Activity Diagram outlines the end-to-end examination lifecycle: teacher configuration -> student passcode entry "
        "and camera check -> continuous surveillance loop (auto-save, demerit checks, heartbeat) -> multi-trigger termination (normal, timer, or 10 demerits) -> "
        "instant MCQ evaluation and AI insights synthesis.", body_style
    ))
    img_workflow_path = os.path.join(DIAGRAM_DIR, "03_System_Workflow_Activity_Diagram.png")
    if os.path.exists(img_workflow_path):
        story.append(Image(img_workflow_path, width=490, height=300))
        story.append(Paragraph("Figure 3: SafeExam.AI System Workflow & Activity Lifecycle Diagram", caption_style))

    story.append(PageBreak())

    # Database ER Diagram
    story.append(Paragraph("<b>9.3. Database Entity-Relationship (ER) Schema</b>", h2_style))
    story.append(Paragraph(
        "The Database Schema outlines the data models stored in MongoDB Atlas. It specifies entities including Users, Teachers, Students, "
        "Exams, ExamQuestions, StudentExams, StudentAnswers, Events, EventRegistrations, and ProctoringLogs with primary/foreign keys, "
        "data types, and referential constraints.", body_style
    ))
    img_er_path = os.path.join(DIAGRAM_DIR, "04_Database_ER_Diagram.png")
    if os.path.exists(img_er_path):
        story.append(Image(img_er_path, width=490, height=300))
        story.append(Paragraph("Figure 4: Complete MongoDB Entity-Relationship (ER) Database Schema", caption_style))

    story.append(Spacer(1, 8))

    # Proctoring Violation Decision Flowchart
    story.append(Paragraph("<b>9.4. Proctoring Violation Decision Flowchart</b>", h2_style))
    story.append(Paragraph(
        "The Decision Flowchart details the exact mathematical penalty accumulation matrix enforced during testing: "
        "forbidden shortcuts trigger warnings on first offense and +1 demerit thereafter; tab switches incur +2 demerits; "
        "mobile phones trigger instant confirm prompts; and reaching 10 cumulative demerit points triggers immediate automated exam submission.", body_style
    ))
    img_violation_path = os.path.join(DIAGRAM_DIR, "05_Proctoring_Violation_Decision_Flowchart.png")
    if os.path.exists(img_violation_path):
        story.append(Image(img_violation_path, width=490, height=300))
        story.append(Paragraph("Figure 5: Proctoring Violation Demerit Accumulation Decision Matrix", caption_style))

    story.append(PageBreak())

    # Network Hold Diagram
    story.append(Paragraph("<b>9.5. Network Fail-Safe & Heartbeat Sequence Diagram</b>", h2_style))
    story.append(Paragraph(
        "The Network Sequence Diagram details the dual client-server heartbeat loop: 10-second client ping heartbeats, window.offline handling, "
        "activation of the unclosable 5-minute freeze modal, timer pause, and dual fail-safe auto-submission if offline status exceeds 5 minutes.", body_style
    ))
    img_net_path = os.path.join(DIAGRAM_DIR, "06_Network_Hold_and_Failure_Sequence_Diagram.png")
    if os.path.exists(img_net_path):
        story.append(Image(img_net_path, width=490, height=300))
        story.append(Paragraph("Figure 6: Network Hold and Fail-Safe Heartbeat Sequence Diagram", caption_style))

    story.append(Spacer(1, 8))

    # -------------------------------------------------------------
    # 10. WHY PEOPLE WILL USE THIS?
    # -------------------------------------------------------------
    story.append(Paragraph("10. Why People Will Use This? (Value Proposition)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "The adoption of SafeExam.AI is driven by compelling real-world value propositions addressing the urgent operational and "
        "pedagogical requirements of modern educational institutions:", body_style
    ))

    reasons = [
        ("1. Zero Installation Barrier:", "Students do not need to install complicated, device-slowing executable programs. Anyone with a web browser can open the link and take exams immediately on Windows, macOS, or Linux."),
        ("2. Tailored for Developing Country Infrastructure:", "Built with low-bandwidth Edge AI inference and an unclosable 5-minute network hold window, SafeExam.AI thrives in environments experiencing frequent internet drops and power load-shedding."),
        ("3. Eliminates Severe Institutional Cost:", "Hiring dozens of human invigilators for every exam is financially unsustainable. SafeExam.AI automates visual proctoring and MCQ grading at near-zero marginal cost per student."),
        ("4. Trust and Accredited Credibility:", "Universities and online certification programs can confidently issue accredited degrees and certificates knowing that remote scores reflect honest, uncompromised student mastery."),
        ("5. Educational Empathy (Constructive Feedback):", "Unlike purely punitive monitoring tools that create student anxiety, SafeExam.AI helps students learn from their test mistakes through AI-driven diagnostic subject suggestions."),
        ("6. All-in-One Multi-Purpose Platform:", "Serves as an integrated solution for regular semester midterms, final examinations, pop quizzes, and public university programming hackathons.")
    ]
    for title, desc in reasons:
        story.append(Paragraph(f"• <b>{title}</b> {desc}", bullet_style))

    # -------------------------------------------------------------
    # 11. CONCLUSION
    # -------------------------------------------------------------
    story.append(Spacer(1, 6))
    story.append(Paragraph("11. Conclusion & Future Work", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    concl_p1 = (
        "<b>SafeExam.AI: An AI-Driven Automated Proctoring and Online Examination System</b> represents a significant leap forward "
        "in remote educational assessment. By successfully harmonizing client-side edge artificial intelligence, strict anti-tamper "
        "browser controls, fault-tolerant network recovery protocols, and personalized academic feedback, the project proves that "
        "online examinations can be conducted with uncompromising security and absolute fairness without imposing heavy technical or "
        "financial burdens on educational institutions."
    )
    story.append(Paragraph(concl_p1, body_style))

    concl_p2 = (
        "<b>Future Enhancements:</b> Moving forward, the platform will expand to include acoustic anomaly detection (identifying "
        "whispers and background voices), a dedicated mobile application for smartphones, and generative AI integration enabling "
        "teachers to automatically generate balanced exam questions directly from uploaded lecture slides or PDF textbooks."
    )
    story.append(Paragraph(concl_p2, body_style))

    concl_p3 = (
        "The project has been fully developed, rigorously tested across edge-case scenarios, and successfully deployed to live "
        "cloud production at <b>https://safeexamnet.netlify.app</b>, establishing a dependable, scalable benchmark for the future "
        "of digital academic assessment."
    )
    story.append(Paragraph(concl_p3, body_style))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF build successful:", PDF_FILENAME)

if __name__ == "__main__":
    build_pdf()

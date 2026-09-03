const mongoose = require('mongoose');
require('dotenv').config();
const Teacher = require('./src/models/Teacher');
const Exam = require('./src/models/Exam');
const Question = require('./src/models/ExamQuestion');
const connectDB = require('./src/config/db');

const courses = [
  { name: 'Data Science and Algorithm', code: 'CSE-101' },
  { name: 'Web Technologies', code: 'CSE-102' },
  { name: 'Machine Learning', code: 'CSE-103' }
];

const mcqQuestions = {
  'Data Science and Algorithm': [
    { q: "Which data structure uses LIFO?", opts: ["Queue", "Stack", "Tree", "Graph"], ans: "B" },
    { q: "What is the time complexity of binary search?", opts: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], ans: "C" },
    { q: "Which algorithm is used for shortest path?", opts: ["Dijkstra", "Kruskal", "Prim", "DFS"], ans: "A" },
    { q: "Which data structure is used in BFS?", opts: ["Stack", "Queue", "Array", "Linked List"], ans: "B" },
    { q: "What is the worst-case time for QuickSort?", opts: ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"], ans: "B" },
    { q: "What is a hash table used for?", opts: ["Sorting", "Fast data retrieval", "Graph traversal", "Tree balancing"], ans: "B" },
    { q: "Which of these is a greedy algorithm?", opts: ["Fibonacci", "Huffman Coding", "Merge Sort", "Binary Search"], ans: "B" },
    { q: "What does dynamic programming use?", opts: ["Divide and conquer", "Memoization", "Greedy approach", "Backtracking"], ans: "B" },
    { q: "What is the height of a balanced binary tree?", opts: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], ans: "B" },
    { q: "Which sorting algorithm is stable?", opts: ["Merge Sort", "Quick Sort", "Heap Sort", "Selection Sort"], ans: "A" }
  ],
  'Web Technologies': [
    { q: "What does HTML stand for?", opts: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Markup Language"], ans: "A" },
    { q: "Which tag is used for the largest heading?", opts: ["<h6>", "<heading>", "<h1>", "<head>"], ans: "C" },
    { q: "What does CSS stand for?", opts: ["Cascading Style Sheets", "Computer Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"], ans: "A" },
    { q: "Which property changes the background color?", opts: ["color", "bgcolor", "background-color", "bg-color"], ans: "C" },
    { q: "Inside which HTML element do we put the JavaScript?", opts: ["<script>", "<js>", "<javascript>", "<scripting>"], ans: "A" },
    { q: "How do you write 'Hello World' in an alert box?", opts: ["alertBox('Hello World');", "msgBox('Hello World');", "msg('Hello World');", "alert('Hello World');"], ans: "D" },
    { q: "Which of these is a JavaScript framework?", opts: ["React", "Laravel", "Django", "Spring"], ans: "A" },
    { q: "What does API stand for?", opts: ["Application Programming Interface", "Advanced Programming Interface", "Application Process Interface", "Advanced Process Interface"], ans: "A" },
    { q: "Which HTTP method is used to update data?", opts: ["GET", "POST", "PUT", "DELETE"], ans: "C" },
    { q: "What is the default port for HTTP?", opts: ["443", "80", "8080", "21"], ans: "B" }
  ],
  'Machine Learning': [
    { q: "What is supervised learning?", opts: ["Learning with labeled data", "Learning with unlabeled data", "Learning by trial and error", "Learning from environment"], ans: "A" },
    { q: "Which is a classification algorithm?", opts: ["Linear Regression", "K-Means", "Logistic Regression", "PCA"], ans: "C" },
    { q: "What does PCA stand for?", opts: ["Principal Component Analysis", "Primary Component Analysis", "Principal Cluster Analysis", "Primary Cluster Analysis"], ans: "A" },
    { q: "Which algorithm is used for clustering?", opts: ["Decision Tree", "Random Forest", "K-Means", "SVM"], ans: "C" },
    { q: "What is overfitting?", opts: ["Model performs well on training and testing data", "Model performs poor on training but well on testing", "Model performs well on training but poor on testing", "Model performs poor on both"], ans: "C" },
    { q: "Which metric is used for regression?", opts: ["Accuracy", "F1-Score", "Mean Squared Error", "Precision"], ans: "C" },
    { q: "What is the purpose of an activation function?", opts: ["To initialize weights", "To introduce non-linearity", "To calculate loss", "To update weights"], ans: "B" },
    { q: "Which is not a type of neural network?", opts: ["CNN", "RNN", "KNN", "GAN"], ans: "C" },
    { q: "What is gradient descent used for?", opts: ["To increase loss", "To minimize loss", "To add noise", "To normalize data"], ans: "B" },
    { q: "What is a hyperparameter?", opts: ["A parameter learned during training", "A parameter set before training", "A feature in the dataset", "A label in the dataset"], ans: "B" }
  ]
};

const writtenQuestionsMid = {
  'Data Science and Algorithm': [
    "Explain the concept of time complexity with examples.",
    "Describe the differences between an Array and a Linked List.",
    "How does a Hash Table work? Explain collision resolution.",
    "Explain the Divide and Conquer strategy.",
    "Write an algorithm to perform Binary Search."
  ],
  'Web Technologies': [
    "Explain the differences between HTML, CSS, and JavaScript.",
    "What is the Box Model in CSS?",
    "Describe the concept of DOM (Document Object Model).",
    "Explain the differences between GET and POST requests.",
    "What is a RESTful API and what are its key constraints?"
  ],
  'Machine Learning': [
    "Explain the difference between Supervised and Unsupervised learning.",
    "Describe how Linear Regression works.",
    "What is Overfitting and how can it be prevented?",
    "Explain the K-Means clustering algorithm.",
    "What is Cross-Validation and why is it used?"
  ]
};

const writtenQuestionsFinal = {
  'Data Science and Algorithm': [
    "Compare and contrast BFS and DFS algorithms.",
    "Explain Dynamic Programming and provide an example problem.",
    "Describe how Dijkstra's algorithm finds the shortest path.",
    "Explain AVL Trees and how they maintain balance.",
    "Discuss the time and space complexity of Merge Sort and Quick Sort."
  ],
  'Web Technologies': [
    "Explain the architecture of a modern web application (Frontend, Backend, Database).",
    "Describe the concept of State Management in frontend frameworks.",
    "What are WebSockets and how do they differ from HTTP?",
    "Explain Cross-Site Scripting (XSS) and how to prevent it.",
    "Discuss the role of a reverse proxy in web deployment."
  ],
  'Machine Learning': [
    "Explain the architecture of a Convolutional Neural Network (CNN).",
    "Describe the concept of Gradient Descent and its variants.",
    "What are Support Vector Machines (SVM) and the Kernel trick?",
    "Explain the differences between Bagging and Boosting ensemble methods.",
    "Discuss the ethical considerations and potential biases in Machine Learning models."
  ]
};

const runSeed = async () => {
  try {
    await connectDB();
    console.log('Database connected.');

    const teacherEmail = "firegamingv8@gmail.com";
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) {
      console.error('Teacher not found:', teacherEmail);
      process.exit(1);
    }

    const today = new Date();
    today.setDate(today.getDate() + 1); // Set exams to tomorrow

    for (const course of courses) {
      // 1. Class Test
      const classTest = await Exam.create({
        teacher_id: teacher._id,
        title: `${course.name} - Class Test`,
        description: 'Monthly Class Test',
        exam_date: today,
        duration_minutes: 60,
        total_marks: 10,
        is_live: false,
        course_name: course.name,
        course_code: course.code,
        university_name: 'Primeasia University',
        max_attempts: 1,
        questions_count: 10
      });

      const mcqDocs = mcqQuestions[course.name].map(q => ({
        exam_id: classTest._id,
        type: 'MCQ',
        question_type: 'mcq',
        question_text: q.q,
        marks: 1,
        option_a: q.opts[0],
        option_b: q.opts[1],
        option_c: q.opts[2],
        option_d: q.opts[3],
        correct_option: q.ans
      }));
      await Question.collection.insertMany(mcqDocs);
      console.log(`Created Class Test for ${course.name} with 10 MCQs.`);

      // 2. Mid Term
      const midTerm = await Exam.create({
        teacher_id: teacher._id,
        title: `${course.name} - Mid Term Exam`,
        description: 'Mid Semester Examination',
        exam_date: today,
        duration_minutes: 60,
        total_marks: 30,
        is_live: false,
        course_name: course.name,
        course_code: course.code,
        university_name: 'Primeasia University',
        max_attempts: 1,
        questions_count: 5
      });

      const midDocs = writtenQuestionsMid[course.name].map(q => ({
        exam_id: midTerm._id,
        type: 'Written',
        question_type: 'descriptive',
        question_text: q,
        marks: 6
      }));
      await Question.collection.insertMany(midDocs);
      console.log(`Created Mid Term for ${course.name} with 5 Written Questions.`);

      // 3. Final Exam
      const finalExam = await Exam.create({
        teacher_id: teacher._id,
        title: `${course.name} - Final Exam`,
        description: 'Final Semester Examination',
        exam_date: today,
        duration_minutes: 60,
        total_marks: 50,
        is_live: false,
        course_name: course.name,
        course_code: course.code,
        university_name: 'Primeasia University',
        max_attempts: 1,
        questions_count: 5
      });

      const finalDocs = writtenQuestionsFinal[course.name].map(q => ({
        exam_id: finalExam._id,
        type: 'Written',
        question_type: 'descriptive',
        question_text: q,
        marks: 10
      }));
      await Question.collection.insertMany(finalDocs);
      console.log(`Created Final Exam for ${course.name} with 5 Written Questions.`);
    }

    console.log('Successfully created all specific exams and questions!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exams:', error);
    process.exit(1);
  }
};

runSeed();

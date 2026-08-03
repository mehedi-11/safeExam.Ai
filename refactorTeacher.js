const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/TeacherDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add isManageQuestionsModalOpen state
content = content.replace(
  /const \[isQuestionModalOpen, setIsQuestionModalOpen\] = useState\(false\);/,
  `const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);\n  const [isManageQuestionsModalOpen, setIsManageQuestionsModalOpen] = useState(false);`
);

// 2. Remove 'set_questions' from Sidebar
content = content.replace(
  /\s*\{\s*id:\s*'set_questions',\s*label:\s*'Set Questions',\s*icon:\s*FileQuestion\s*\},/,
  ''
);

// 3. Add Manage Questions button in table row actions
const editButtonRegex = /(<button onClick=\{\(\) => \{\s*setExamForm\(\{[\s\S]*?\}\);\s*setIsEditingExam\(true\);\s*setIsExamModalOpen\(true\);\s*\}\} className="p-1\.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">\s*<Edit size=\{16\} \/>\s*<\/button>)/;
content = content.replace(editButtonRegex, `$1\n                            <button onClick={() => { setSelectedExamId(exam.id); fetchQuestions(exam.id); setIsManageQuestionsModalOpen(true); }} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Manage Questions">\n                              <FileQuestion size={16} />\n                            </button>`);

// 4. Update handleSaveExam
const saveExamRegex = /const handleSaveExam = async \(e\) => \{[\s\S]*?catch \(err\) \{/;
const newSaveExam = `const handleSaveExam = async (e) => {
    e.preventDefault();
    try {
      if (isEditingExam) {
        await api.put(\`/teacher/exams/\${examForm.id}\`, examForm);
        triggerSuccess('Exam updated successfully');
        setIsExamModalOpen(false);
        fetchData();
      } else {
        const res = await api.post('/teacher/exams', examForm);
        triggerSuccess('Exam scheduled successfully');
        setIsExamModalOpen(false);
        fetchData();
        setSelectedExamId(res.data.examId);
        fetchQuestions(res.data.examId);
        setIsManageQuestionsModalOpen(true);
      }
    } catch (err) {`;
content = content.replace(saveExamRegex, newSaveExam);

// 5. Convert Set Questions Tab to Modal
const tabStart = content.indexOf("{/* TAB: SET QUESTIONS */}");
const tabEndString = "          {/* TAB: EXAM RESULTS */}";
const tabEnd = content.indexOf(tabEndString);

if (tabStart !== -1 && tabEnd !== -1) {
  // We extract the questions list part.
  // We know the questions list is inside a div with "max-h-[500px] overflow-y-auto"
  const qListStartRegex = /questions\.length === 0 \? \([\s\S]*?<div className="border border-dashed[\s\S]*?<\/div>\s*\) : \([\s\S]*?<div className="space-y-4 max-h-\[500px\] overflow-y-auto pr-2">/;
  const match = content.match(qListStartRegex);
  
  // We can just construct the new Modal manually, it's safer.
  const modalCode = `      {/* Modal: Manage Questions */}
      <Modal isOpen={isManageQuestionsModalOpen} onClose={() => setIsManageQuestionsModalOpen(false)} title="Manage Questions">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-150 pb-4">
            <div>
              <h4 className="font-bold text-dark-900">
                {exams.find(e => e.id === (typeof selectedExamId === 'string' ? parseInt(selectedExamId) : selectedExamId))?.title || 'Exam Questions'}
              </h4>
              <p className="text-xs text-gray-500">Add, edit or delete questions for this exam.</p>
            </div>
            <button 
              onClick={() => {
                setQuestionForm({ id: null, question_text: '', marks: 1, option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
                setIsEditingQuestion(false);
                setIsQuestionModalOpen(true);
              }}
              className="tomato-btn py-2 text-xs flex items-center gap-1 shrink-0"
            >
              <Plus size={14} />
              <span>Add Question</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="border border-dashed border-gray-200 bg-gray-50/50 py-12 rounded-xl text-center text-xs text-gray-400">
              No questions added to this exam yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {questions.map((q, qidx) => (
                <div key={q.id} className="border border-gray-150 bg-white p-5 rounded-xl relative hover:border-gray-300 transition-colors">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => {
                        setQuestionTab(q.type);
                        setQuestionForm({
                          id: q.id,
                          question_text: q.question_text,
                          marks: q.marks,
                          option_a: q.option_a || '',
                          option_b: q.option_b || '',
                          option_c: q.option_c || '',
                          option_d: q.option_d || '',
                          correct_option: q.correct_option || 'A'
                        });
                        setIsEditingQuestion(true);
                        setIsQuestionModalOpen(true);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-3 mb-3 pr-16">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                      {q.type}
                    </span>
                    <span className="bg-tomato-50 text-tomato-600 border border-tomato-100 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                      {q.marks} Mark(s)
                    </span>
                    <p className="font-bold text-sm text-dark-900 leading-tight">
                      Q{qidx + 1}: {q.question_text}
                    </p>
                  </div>

                  {q.type === 'MCQ' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 pl-20">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt} className={\`p-2 rounded-lg border \${q.correct_option === opt ? 'bg-green-50 border-green-200 text-green-700 font-semibold' : 'border-gray-100 text-gray-500'}\`}>
                          {opt}) {q[\`option_\${opt.toLowerCase()}\`]}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'Written' && (
                    <div className="pl-20">
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 text-xs text-gray-400 italic">
                        Students will type their answer in a text box.
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>\n\n`;

  // Remove the old tab
  content = content.substring(0, tabStart) + tabEndString + content.substring(tabEnd + tabEndString.length);

  // Inject modal before "Modal: Add/Edit Question"
  const modalInjectIndex = content.indexOf("{/* Modal: Add/Edit Question */}");
  if (modalInjectIndex !== -1) {
    content = content.substring(0, modalInjectIndex) + modalCode + content.substring(modalInjectIndex);
  }
}

// 6. Check for NoQuestionsModal behavior
// We need to fix the behavior of Go To Set Questions
const goToSetQuestionsRegex = /setIsNoQuestionsModalOpen\(false\);\s*setActiveTab\('set_questions'\);\s*setSelectedExamId\(examForm\.id\);\s*fetchQuestions\(examForm\.id\);/;
const goToSetQuestionsNew = `setIsNoQuestionsModalOpen(false);\n              setSelectedExamId(examForm.id);\n              fetchQuestions(examForm.id);\n              setIsManageQuestionsModalOpen(true);`;
content = content.replace(goToSetQuestionsRegex, goToSetQuestionsNew);

// Also replace the warning text in the NoQuestionsModal
const warningTextRegex = /Please go to the <strong>Set Questions<\/strong> tab to add questions first./;
content = content.replace(warningTextRegex, `Please click <strong>Go to Set Questions</strong> to add questions first.`);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactoring complete.');

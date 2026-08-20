const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/TeacherDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: handleTogglePublishResults
const target1 = `  const handleTogglePublishResults = async (examId, currentStatus) => {
    try {
      await api.put(\`/teacher/exams/\${examId}/publish\`, { results_published: !currentStatus });
      triggerSuccess(\`Exam results \${!currentStatus ? 'published' : 'unpublished'} successfully!\`);
      fetchData(); 
    } catch (err) {
      setError("Error updating publish status");
    }
  };`;
const replace1 = `  const handleTogglePublishResults = async (examId, studentId, currentStatus) => {
    try {
      await api.put(\`/teacher/exams/\${examId}/students/\${studentId}/publish\`, { results_published: !currentStatus });
      triggerSuccess(\`Student result \${!currentStatus ? 'published' : 'unpublished'} successfully!\`);
      fetchExamResults(examId);
    } catch (err) {
      setError("Error updating publish status");
    }
  };`;
content = content.replace(target1, replace1);

// Fix 2: Add Proctor Exam button
const target2 = `                          <td className="py-3 px-4 text-right space-x-2">
                            {exam.event_id ? (`;
const replace2 = `                          <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => navigate(\`/teacher/exam/\${exam.id}/proctor\`)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Proctor Exam"
                              >
                                <ShieldCheck size={16} />
                              </button>
                            {exam.event_id ? (`;
content = content.replace(target2, replace2);

// Fix 3: Remove global publish block
const target3 = `                </div>
                {selectedResultExamId && (() => {
                  const selectedExam = exams.find(e => e.id == selectedResultExamId);
                  if(!selectedExam) return null;
                  const isPublished = selectedExam.results_published;
                  return (
                    <button
                      onClick={() => handleTogglePublishResults(selectedExam.id, isPublished)}
                      className={\`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all \${
                        isPublished 
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                        : "bg-tomato-500 text-white shadow-md shadow-tomato-500/20 hover:bg-tomato-600"
                      }\`}
                    >
                      {isPublished ? (
                        <>
                          <EyeOff size={16} /> Unpublish Results
                        </>
                      ) : (
                        <>
                          <Eye size={16} /> Publish Results
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>`;
const replace3 = `                </div>
              </div>`;
content = content.replace(target3, replace3);

// Fix 4: Add individual publish button
const target4 = `                                <button
                                  onClick={() =>
                                    handleViewAnswers(res.student_id, res.name)
                                  }
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors"
                                >
                                  View Answersheet
                                </button>
                              </td>`;
const replace4 = `                                <button
                                  onClick={() =>
                                    handleViewAnswers(res.student_id, res.name)
                                  }
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors"
                                >
                                  View Answersheet
                                </button>
                                <button
                                  onClick={() =>
                                    handleTogglePublishResults(selectedResultExamId, res.student_id, res.results_published)
                                  }
                                  className={\`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors \${
                                    res.results_published
                                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    : "bg-green-50 text-green-600 hover:bg-green-100"
                                  }\`}
                                >
                                  {res.results_published ? (
                                    <>
                                      <EyeOff size={12} /> Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={12} /> Publish
                                    </>
                                  )}
                                </button>
                              </td>`;
content = content.replace(target4, replace4);

// Fix 5: Add ShieldCheck import
if (!content.includes('ShieldCheck')) {
  content = content.replace('ShieldAlert,', 'ShieldAlert, ShieldCheck,');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated TeacherDashboard.jsx');

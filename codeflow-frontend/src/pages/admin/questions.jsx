import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FaEdit, FaTrash, FaPlus, FaFileUpload, FaCopy } from 'react-icons/fa';

import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion, getQuestionByIdForAdmin, createBulkQuestions } from '@/services/problemService';
import { getAllCourses } from '@/services/courseService';
import { getAllTopics } from '@/services/topicService';
import Spinner from '@/components/Spinner';

const initialFormState = {
    title: '',
    description: '',
    difficulty: 'Easy',
    course: '',
    topic: '',
    sampleTestCases: '[]',
    hiddenTestCases: '[]',
    starter_cpp: '',
    starter_java: '',
    starter_python: '',
    driver_cpp: '',
    driver_java: '',
    driver_python: '',
    solutions: [],
};

const AdminQuestions = () => {
    const [questions, setQuestions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(initialFormState);
    const [bulkJson, setBulkJson] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [allCourses, setAllCourses] = useState([]);
    const [allTopics, setAllTopics] = useState([]);
    const [filteredTopics, setFilteredTopics] = useState([]);

    const router = useRouter();

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await getAllQuestions();
            setQuestions(res.data || []);
        } catch (error) {
            toast.error('Failed to fetch questions.');
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    useEffect(() => {
        const fetchDropdownData = async () => {
            if (isModalOpen) {
                try {
                    const [coursesRes, topicsRes] = await Promise.all([
                        getAllCourses(),
                        getAllTopics(),
                    ]);
                    setAllCourses(coursesRes.data);
                    setAllTopics(topicsRes.data);

                    if (currentQuestion.course) {
                        setFilteredTopics(topicsRes.data.filter(t => t.course === currentQuestion.course));
                    }
                } catch (error) {
                    toast.error("Failed to load courses or topics.");
                }
            }
        };
        fetchDropdownData();
    }, [isModalOpen, currentQuestion.course]);
    
    useEffect(() => {
        if (router.isReady && router.query.edit && questions.length > 0) {
            const questionToEdit = questions.find(q => q._id === router.query.edit);
            if (questionToEdit) {
                handleOpenModal(questionToEdit);
            }
        }
    }, [router.isReady, router.query, questions]);

    const handleOpenModal = async (question = null) => {
        if (question) {
            try {
                const res = await getQuestionByIdForAdmin(question._id);
                const fullQuestionData = res.data;

                setIsEditing(true);
                setCurrentQuestion({
                    ...initialFormState,
                    ...fullQuestionData,
                    course: fullQuestionData.course?._id || '',
                    topic: fullQuestionData.topic?._id || '',
                    sampleTestCases: JSON.stringify(fullQuestionData.sampleTestCases || [], null, 2),
                    hiddenTestCases: JSON.stringify(fullQuestionData.hiddenTestCases || [], null, 2),
                    solutions: fullQuestionData.solutions || [],
                });
                setIsModalOpen(true);
            } catch (error) {
                toast.error("Failed to fetch full question details.");
            }
        } else {
            setIsEditing(false);
            setCurrentQuestion(initialFormState);
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        router.push('/admin/questions', undefined, { shallow: true });
    };

    const handleChange = (e) => setCurrentQuestion({ ...currentQuestion, [e.target.name]: e.target.value });

    const handleCourseChange = (e) => {
        const courseId = e.target.value;
        setCurrentQuestion({ ...currentQuestion, course: courseId, topic: '' });
        setFilteredTopics(allTopics.filter(topic => topic.course === courseId));
    };

    const handleTopicChange = (e) => {
        const topicId = e.target.value;
        const selectedTopic = allTopics.find(t => t._id === topicId);
        if (selectedTopic && selectedTopic.course !== currentQuestion.course) {
            setCurrentQuestion({ ...currentQuestion, topic: topicId, course: selectedTopic.course });
            setFilteredTopics(allTopics.filter(t => t.course === selectedTopic.course));
        } else {
            setCurrentQuestion({ ...currentQuestion, topic: topicId });
        }
    };

    const handleSolutionChange = (index, field, value) => {
        const updatedSolutions = [...currentQuestion.solutions];
        updatedSolutions[index][field] = value;
        setCurrentQuestion({ ...currentQuestion, solutions: updatedSolutions });
    };

    const addSolution = () => {
        setCurrentQuestion({
            ...currentQuestion,
            solutions: [...currentQuestion.solutions, { language: 'cpp', approach: 'Bruteforce', explanation: '', code: '' }]
        });
    };

    const removeSolution = (index) => {
        const updatedSolutions = currentQuestion.solutions.filter((_, i) => i !== index);
        setCurrentQuestion({ ...currentQuestion, solutions: updatedSolutions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentQuestion.course || !currentQuestion.topic) {
            return toast.error("Please select both a course and a topic.");
        }
        try {
            const payload = {
                ...currentQuestion,
                sampleTestCases: JSON.parse(currentQuestion.sampleTestCases),
                hiddenTestCases: JSON.parse(currentQuestion.hiddenTestCases),
            };
            
            if (isEditing) {
                await updateQuestion(currentQuestion._id, payload);
                toast.success('Question updated successfully!');
            } else {
                await createQuestion(payload);
                toast.success('Question created successfully!');
            }
            fetchQuestions();
            handleCloseModal();
        } catch (error) {
            toast.error('Failed to save question. Check JSON format for test cases.');
            console.error("Save question error:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await deleteQuestion(id);
                toast.success('Question deleted successfully!');
                fetchQuestions();
            } catch (error) {
                toast.error('Failed to delete question.');
            }
        }
    };

    const handleBulkSubmit = async () => {
        try {
            const parsedData = JSON.parse(bulkJson);
            if (!Array.isArray(parsedData)) {
                return toast.error("JSON must be an array of objects: [...]");
            }
            
            const loadingToast = toast.loading("Processing & Uploading...");
            await createBulkQuestions(parsedData);
            
            toast.dismiss(loadingToast);
            toast.success(`Successfully uploaded ${parsedData.length} questions!`);
            
            setBulkJson('');
            setIsBulkModalOpen(false);
            fetchQuestions();
        } catch (error) {
            console.error(error);
            const errorData = error.response?.data;
            
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                toast.error(
                    <div>
                        <p className="font-bold">Upload Failed:</p>
                        <ul className="list-disc pl-4 text-xs">
                            {errorData.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                            {errorData.errors.length > 3 && <li>...and more</li>}
                        </ul>
                    </div>, 
                    { duration: 6000 }
                );
            } else {
                toast.error(errorData?.msg || "Invalid JSON or Server Error.");
            }
        }
    };

    const copyTemplate = () => {
        const template = [
            {
                "title": "Example Title",
                "description": "Description here...",
                "difficulty": "Easy",
                "course": "COURSE_ID_HERE",
                "topic": "TOPIC_ID_HERE",
                "sampleTestCases": [{"input": {"nums": [1]}, "output": 1}],
                "hiddenTestCases": [{"input": {"nums": [2]}, "output": 2}],
                "starter_cpp": "// code",
                "driver_cpp": "// driver",
                "solutions": []
            }
        ];
        navigator.clipboard.writeText(JSON.stringify(template, null, 2));
        toast.success("Template copied to clipboard!");
    };

    // Premium Badges for Difficulty
    const difficultyColor = { 
        'Easy': 'text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs font-bold', 
        'Medium': 'text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-xs font-bold', 
        'Hard': 'text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 text-xs font-bold' 
    };
    
    if (loading) {
        return <AdminLayout><Spinner /></AdminLayout>;
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800">Problem Management</h1>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsBulkModalOpen(true)} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-sm bg-white">
                        <FaFileUpload className="mr-2"/> Import JSON
                    </Button>
                    <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 shadow-md text-white">
                        <FaPlus className="mr-2"/> Add New Question
                    </Button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider rounded-tl-xl">Title</th>
                                <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Difficulty</th>
                                <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map((q, index) => (
                                <tr key={q._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-slate-800 font-medium">{q.title}</td>
                                    <td className="p-4">
                                        <span className={difficultyColor[q.difficulty]}>{q.difficulty}</span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => handleOpenModal(q)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Edit">
                                            <FaEdit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(q._id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors" title="Delete">
                                            <FaTrash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {questions.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-slate-500">No questions found. Click "Add New Question" to create one.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Bulk Import Modal --- */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">Bulk Import Questions</h2>
                            <Button variant="outline" size="sm" onClick={copyTemplate} className="text-xs border-slate-200 shadow-sm hover:bg-slate-50">
                                <FaCopy className="mr-2 text-slate-500"/> Copy JSON Template
                            </Button>
                        </div>
                        
                        <p className="text-slate-600 text-sm mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            Paste a JSON array of question objects below. Ensure you use valid <strong className="text-blue-800">Course IDs</strong> and <strong className="text-blue-800">Topic IDs</strong> from your database.
                        </p>

                        <textarea 
                            className="flex-grow w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-800 shadow-inner resize-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder='[ { "title": "Problem 1", ... } ]'
                            value={bulkJson}
                            onChange={(e) => setBulkJson(e.target.value)}
                        ></textarea>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setIsBulkModalOpen(false)} className="border-slate-200">Cancel</Button>
                            <Button onClick={handleBulkSubmit} disabled={!bulkJson.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Upload Questions</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Create/Edit Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 flex-shrink-0">{isEditing ? 'Edit Question' : 'Add New Question'}</h2>
                        
                        <div className="overflow-y-auto pr-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 pb-4 custom-scrollbar">
                            
                            {/* --- Column 1: Core Details --- */}
                            <div className="flex flex-col gap-5">
                                <div className="border-b border-slate-200 pb-2 mb-2">
                                    <h3 className="text-lg text-indigo-700 font-bold">Categorization</h3>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Course</label>
                                    <select name="course" value={currentQuestion.course} onChange={handleCourseChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all" required>
                                        <option value="">-- Select Course --</option>
                                        {allCourses.map(course => (<option key={course._id} value={course._id}>{course.title}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Topic</label>
                                    <select name="topic" value={currentQuestion.topic} onChange={handleTopicChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all" required disabled={!currentQuestion.course && filteredTopics.length === 0}>
                                        <option value="">-- Select Topic --</option>
                                        {filteredTopics.map(topic => (<option key={topic._id} value={topic._id}>{topic.title}</option>))}
                                    </select>
                                </div>

                                <div className="border-b border-slate-200 pb-2 mb-2 mt-4">
                                    <h3 className="text-lg text-indigo-700 font-bold">Problem Details</h3>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Title</label>
                                    <input type="text" name="title" value={currentQuestion.title} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all" required />
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Difficulty</label>
                                    <select name="difficulty" value={currentQuestion.difficulty} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all">
                                        <option>Easy</option>
                                        <option>Medium</option>
                                        <option>Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Description (Markdown/HTML)</label>
                                    <textarea name="description" value={currentQuestion.description} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-inner transition-all" rows="12" required></textarea>
                                </div>
                            </div>

                            {/* --- Column 2: Technical Details --- */}
                            <div className="flex flex-col gap-5">
                                <div className="border-b border-slate-200 pb-2 mb-2">
                                    <h3 className="text-lg text-indigo-700 font-bold">Test Cases</h3>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Sample Test Cases (JSON)</label>
                                    <textarea name="sampleTestCases" value={currentQuestion.sampleTestCases} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm text-slate-800 focus:bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" rows="6"></textarea>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Hidden Test Cases (JSON)</label>
                                    <textarea name="hiddenTestCases" value={currentQuestion.hiddenTestCases} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm text-slate-800 focus:bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" rows="6"></textarea>
                                </div>

                                <div className="border-b border-slate-200 pb-2 mb-2 mt-4">
                                    <h3 className="text-lg text-indigo-700 font-bold">Code Templates</h3>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">C++ Starter</label>
                                    <textarea name="starter_cpp" value={currentQuestion.starter_cpp} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-800 shadow-inner focus:bg-white focus:outline-none focus:border-indigo-500 transition-all" rows="4"></textarea>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Java Starter</label>
                                    <textarea name="starter_java" value={currentQuestion.starter_java} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-800 shadow-inner focus:bg-white focus:outline-none focus:border-indigo-500 transition-all" rows="4"></textarea>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-semibold text-slate-700">Python Starter</label>
                                    <textarea name="starter_python" value={currentQuestion.starter_python} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-slate-800 shadow-inner focus:bg-white focus:outline-none focus:border-indigo-500 transition-all" rows="4"></textarea>
                                </div>
                            </div>

                            {/* --- Column 3: Solutions --- */}
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                    <h3 className="text-lg text-indigo-700 font-bold">Official Solutions</h3>
                                    <Button type="button" size="sm" onClick={addSolution} className="h-8 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm border border-indigo-200"><FaPlus className="mr-1.5"/>Add</Button>
                                </div>
                                <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {currentQuestion.solutions.map((sol, index) => (
                                        <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-bold text-slate-700 text-sm">Solution #{index + 1}</h4>
                                                <button type="button" onClick={() => removeSolution(index)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"><FaTrash size={14}/></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <select value={sol.language} onChange={(e) => handleSolutionChange(index, 'language', e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none">
                                                    <option value="cpp">C++</option>
                                                    <option value="java">Java</option>
                                                    <option value="python">Python</option>
                                                </select>
                                                <select value={sol.approach} onChange={(e) => handleSolutionChange(index, 'approach', e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none">
                                                    <option>Bruteforce</option>
                                                    <option>Better</option>
                                                    <option>Optimal</option>
                                                </select>
                                            </div>
                                            <label className="block mb-1 text-xs font-bold text-slate-500 uppercase tracking-wide">Explanation</label>
                                            <textarea value={sol.explanation} onChange={(e) => handleSolutionChange(index, 'explanation', e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none mb-3" rows="3"></textarea>
                                            
                                            <label className="block mb-1 text-xs font-bold text-slate-500 uppercase tracking-wide">Code</label>
                                            <textarea value={sol.code} onChange={(e) => handleSolutionChange(index, 'code', e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg font-mono text-xs text-slate-200 shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500" rows="8"></textarea>
                                        </div>
                                    ))}
                                    {currentQuestion.solutions.length === 0 && (
                                        <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                                            <p className="text-sm text-slate-500">No solutions added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-5 mt-auto border-t border-slate-200 flex-shrink-0">
                            <Button type="button" variant="outline" onClick={handleCloseModal} className="border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">{isEditing ? 'Update Question' : 'Create Question'}</Button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminQuestions;
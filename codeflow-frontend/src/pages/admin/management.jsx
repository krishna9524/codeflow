import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getAllCourses, createCourse, updateCourse, deleteCourse } from '@/services/courseService';
import { getAllTopics, createTopic, updateTopic, deleteTopic } from '@/services/topicService';
import { getAllQuestions, deleteQuestion } from '@/services/problemService';
import api from '@/services/api';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

const AdminManagement = () => {
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('course');
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [coursesRes, topicsRes, questionsRes] = await Promise.all([
                getAllCourses(),
                getAllTopics(),
                getAllQuestions()
            ]);
            setCourses(coursesRes.data || []);
            setTopics(topicsRes.data || []);
            setQuestions(questionsRes.data || []);
        } catch (error) {
            toast.error("Failed to load management data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (type, item = null) => {
        setModalMode(type);
        if (item) {
            setIsEditing(true);
            setCurrentItem({ ...item });
        } else {
            setIsEditing(false);
            setCurrentItem(type === 'course' ? { title: '', description: '' } : { title: '', description: '', course: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
        setImageFile(null);
        setIsEditing(false);
    };

    const handleChange = (e) => {
        setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
    };
    
    const handleDelete = async (type, id) => {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        if (confirm(`Are you sure you want to delete this ${typeName}? This may also delete its children (e.g., topics, problems).`)) {
            try {
                if (type === 'course') await deleteCourse(id);
                else if (type === 'topic') await deleteTopic(id);
                else if (type === 'question') await deleteQuestion(id);
                toast.success(`${typeName} deleted successfully!`);
                fetchData();
            } catch (error) {
                toast.error(`Failed to delete ${typeName}.`);
            }
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        let data = { ...currentItem };

        if (modalMode === 'course' && imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            try {
                const res = await api.post('/upload/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                data.imageUrl = res.data.filePath;
            } catch (error) {
                console.error("Upload error:", error.response?.data || error.message);
                const errorMsg = error.response?.data?.msg || "Image upload failed! The server rejected the request.";
                return toast.error(errorMsg);
            }
        }

        try {
            if (isEditing) {
                if (modalMode === 'course') await updateCourse(data._id, data);
                else if (modalMode === 'topic') await updateTopic(data._id, data);
            } else {
                if (modalMode === 'course') await createCourse(data);
                else if (modalMode === 'topic') await createTopic(data);
            }
            toast.success(`${modalMode.charAt(0).toUpperCase() + modalMode.slice(1)} ${isEditing ? 'updated' : 'created'} successfully!`);
            handleCloseModal();
            fetchData();
        } catch (error) {
            toast.error(`Failed to save ${modalMode}.`);
        }
    };

    if (loading) {
        return <AdminLayout><Spinner /></AdminLayout>;
    }

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800">Content Management</h1>
                <p className="text-slate-500 mt-2">Manage your courses, topics, and organize your curriculum.</p>
            </div>
            
            <Tabs defaultValue="courses" className="w-full">
                <TabsList className="bg-slate-100/80 p-1.5 rounded-xl inline-flex mb-6 border border-slate-200 shadow-sm">
                    <TabsTrigger value="courses" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-6 py-2 transition-all font-medium text-slate-600">Courses</TabsTrigger>
                    <TabsTrigger value="topics" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-6 py-2 transition-all font-medium text-slate-600">Topics</TabsTrigger>
                    <TabsTrigger value="questions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-6 py-2 transition-all font-medium text-slate-600">Questions</TabsTrigger>
                </TabsList>

                {[
                    { type: 'course', items: courses, title: 'Courses' },
                    { type: 'topic', items: topics, title: 'Topics' },
                    { type: 'question', items: questions, title: 'Questions' }
                ].map(tab => (
                    <TabsContent key={tab.type} value={tab.type + 's'} className="animate-in fade-in-50 duration-300">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Existing {tab.title}</h2>
                                    <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mt-1 inline-block">{tab.items.length} Total</span>
                                </div>
                                {tab.type !== 'question' && (
                                    <Button onClick={() => handleOpenModal(tab.type)} className="bg-indigo-600 hover:bg-indigo-700 shadow-md text-white">
                                        <FaPlus className="mr-2"/> Add New {tab.title.slice(0, -1)}
                                    </Button>
                                )}
                            </div>
                            
                            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                                {tab.items.length === 0 ? (
                                    <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl">
                                        <p className="text-slate-500 font-medium">No {tab.title.toLowerCase()} found.</p>
                                    </div>
                                ) : (
                                    tab.items.map(item => (
                                        <div key={item._id} className="p-4 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                                            <span className="font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">{item.title}</span>
                                            <div className="flex gap-2">
                                                {tab.type === 'question' ? (
                                                    <Link href={`/admin/questions?edit=${item._id}`}>
                                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">
                                                            <FaEdit size={15}/>
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(tab.type, item)} className="h-9 w-9 p-0 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">
                                                        <FaEdit size={15}/>
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" onClick={() => handleDelete(tab.type, item._id)} className="h-9 w-9 p-0 text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-colors">
                                                    <FaTrash size={15}/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="border-b border-slate-100 pb-3 mb-2">
                            <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit' : 'Create'} {modalMode.charAt(0).toUpperCase() + modalMode.slice(1)}</h2>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title</label>
                            <input type="text" placeholder={`Enter ${modalMode} title...`} name="title" value={currentItem?.title || ''} onChange={handleChange} className="w-full p-3 bg-white rounded-lg border border-slate-300 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                            <textarea placeholder="Enter a brief description..." name="description" value={currentItem?.description || ''} onChange={handleChange} className="w-full p-3 bg-white rounded-lg border border-slate-300 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" rows="4"></textarea>
                        </div>
                        
                        {modalMode === 'topic' && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Course</label>
                                <select name="course" value={currentItem?.course || ''} onChange={handleChange} className="w-full p-3 bg-white rounded-lg border border-slate-300 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required>
                                    <option value="">-- Select Parent Course --</option>
                                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                                </select>
                            </div>
                        )}
                        
                        {modalMode === 'course' && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Image (Optional)</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"/>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={handleCloseModal} className="border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">{isEditing ? 'Save Changes' : 'Create ' + modalMode.charAt(0).toUpperCase() + modalMode.slice(1)}</Button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminManagement;
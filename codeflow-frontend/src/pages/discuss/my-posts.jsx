// frontend/pages/discuss/my-posts.jsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@/services/api';
import useAuth from '@/hooks/useAuth';
import DiscussionCard from '@/components/discuss/DiscussionCard';
import IdentityCard from '@/components/discuss/IdentityCard'; 
import Spinner from '@/components/Spinner';
import { FileText, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

const MyPostsPage = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        const fetchMyPosts = async () => {
            try {
                // Call the new backend endpoint we just made
                const { data } = await api.get(`/discussions/user/${user._id}`);
                setPosts(data);
            } catch (err) {
                console.error("Failed to fetch my posts", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchMyPosts();
        }
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#F3F2EF]"><Spinner size="xl" /></div>;
    }

    return (
        <>
            <Head>
                <title>My Posts & Articles | CodeFlow</title>
            </Head>

            <div className="min-h-screen bg-[#F3F2EF] py-6 font-sans">
                <div className="max-w-[1128px] mx-auto px-4">
                    
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <ArrowLeft size={20} className="text-gray-600"/>
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="fill-current" size={24}/> My Posts & Articles
                            </h1>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="hidden lg:block lg:col-span-3">
                            <IdentityCard user={user} />
                        </div>

                        <div className="lg:col-span-6">
                            {posts.length > 0 ? (
                                <div className="space-y-2">
                                    {posts.map(post => (
                                        <DiscussionCard 
                                            key={post._id} 
                                            post={post} 
                                            currentUser={user} 
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-8 text-center">
                                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText size={32} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">You haven't posted anything yet</h3>
                                    <p className="text-gray-500 mt-2 mb-6">Share your knowledge, ask questions, or write an article.</p>
                                    <Link href="/discuss" className="text-blue-600 font-semibold hover:underline">
                                        Go to Feed to create a post
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:block lg:col-span-3">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
                                <p className="text-xs text-gray-500 mb-3">
                                    Want to write a long-form tutorial or share a project?
                                </p>
                                <Link href="/discuss/create" className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1">
                                    <Plus size={16} /> Write an Article
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default MyPostsPage;
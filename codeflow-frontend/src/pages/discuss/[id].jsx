import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import DiscussionCard from '@/components/discuss/DiscussionCard'; // 👉 THE MAGIC COMPONENT
import Spinner from '@/components/Spinner';

// 1. SSR Data Fetching
export async function getServerSideProps(context) {
    const { id } = context.params;
    let initialThread = null;
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
        const res = await fetch(`${baseUrl}/discussions/${id}`);
        if (res.ok) initialThread = await res.json();
    } catch (err) { console.error("SSR Error:", err); }

    if (!initialThread) return { notFound: true };
    return { props: { initialThread } };
}

const ThreadDetailPage = ({ initialThread }) => {
    const router = useRouter();
    const { user } = useAuth();
    const [thread, setThread] = useState(initialThread);

    // Refresh data on mount to ensure we have the absolute latest comments/reactions
    useEffect(() => {
        if (initialThread?._id) {
            api.get(`/discussions/${initialThread._id}`)
                .then(res => setThread(res.data))
                .catch(console.error);
        }
    }, [initialThread]);

    if (!thread) return <div className="min-h-screen flex items-center justify-center"><Spinner size="xl" /></div>;

    return (
        <>
            <Head>
                <title>{thread.title || 'Post'} | CodeFlow</title>
            </Head>

            <div className="min-h-screen bg-[#F3F2EF] pt-6 pb-20 font-sans">
                {/* Centered layout for distraction-free reading */}
                <div className="max-w-[750px] mx-auto px-4">
                    
                    <button 
                        onClick={() => router.push('/discuss')} 
                        className="mb-4 flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
                    </button>

                    <div className="w-full">
                        {/* 🔥 REUSING YOUR POWERFUL FEED COMPONENT 🔥
                            This automatically brings over all your nested comments, 
                            LinkedIn-style reaction popups, and connection tracking!
                        */}
                        <DiscussionCard 
                            post={thread} 
                            currentUser={user} 
                            isDetailedView={true} // In case you want to automatically expand comments inside the component
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ThreadDetailPage;
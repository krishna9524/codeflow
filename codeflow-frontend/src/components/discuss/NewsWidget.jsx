import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import api from '@/services/api';
import { Skeleton } from "@/components/ui/skeleton";
import useAuth from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/router'; // 1. 👉 ADD THIS IMPORT

const NewsWidget = () => {
    const { user } = useAuth(); 
    const [newsItems, setNewsItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter(); // 2. 👉 INITIALIZE ROUTER

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchNews = async () => {
            try {
                const res = await api.get('/discussions/news');
                setNewsItems(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error("Failed to fetch news");
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [user]);

    if (!user) return null; 
    if (loading) return <div className="bg-white p-4 rounded-lg border border-gray-300"><Skeleton className="h-20 w-full"/></div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sticky top-20">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-gray-900">Trending on CodeFlow</h2>
                <Info size={14} className="text-gray-500 cursor-pointer" />
            </div>

            <ul className="space-y-4">
                {newsItems.length > 0 ? newsItems.map((item, index) => {
                    
                    let displayTitle = item.title && item.title !== "Post" ? item.title : "";
                    if (!displayTitle && item.content) {
                        displayTitle = item.content
                            .replace(/<[^>]*>?/gm, '') 
                            .replace(/&nbsp;/g, ' ')   
                            .trim()
                            .substring(0, 60) + "...";
                    }
                    if (!displayTitle) displayTitle = "Trending Discussion";

                    const timeAgo = item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : "Recently";
                    const readers = item.views ? `${item.views} readers` : `${item.reactionCount || 0} reactions`;

                    return (
                        <li 
                            key={item._id || index} 
                            className="cursor-pointer group"
                            // 3. 👉 ADD THE ONCLICK NAVIGATOR HERE
                            onClick={() => router.push(`/discuss/${item._id}`)} 
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-gray-400 mt-1.5 text-[6px] flex-shrink-0">●</span>
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-800 group-hover:text-[#0a66c2] group-hover:underline line-clamp-2 break-all">
                                        {displayTitle}
                                    </h3>
                                    <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                                        <span>{timeAgo}</span>
                                        <span>•</span>
                                        <span>{readers}</span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                }) : (
                    <p className="text-xs text-gray-500">Interact with posts to see personalized news.</p>
                )}
            </ul>
        </div>
    );
};

export default NewsWidget;
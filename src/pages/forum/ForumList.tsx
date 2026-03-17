import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Plus, Pin, Lock, ThumbsUp, Eye, Clock, Tag, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ForumPost, ForumCategory } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES: { value: ForumCategory | ''; label: string; color: string }[] = [
  { value: '', label: 'All Topics', color: '' },
  { value: 'general', label: 'General', color: 'text-gray-300 bg-gray-800' },
  { value: 'hydraulics', label: 'Hydraulics', color: 'text-blue-300 bg-blue-900/50' },
  { value: 'engine', label: 'Engine', color: 'text-red-300 bg-red-900/50' },
  { value: 'electrical', label: 'Electrical', color: 'text-yellow-300 bg-yellow-900/50' },
  { value: 'transmission', label: 'Transmission', color: 'text-green-300 bg-green-900/50' },
  { value: 'diagnostics', label: 'Diagnostics', color: 'text-cyan-300 bg-cyan-900/50' },
  { value: 'tips', label: 'Tips & Tricks', color: 'text-orange-300 bg-orange-900/50' },
  { value: 'tools', label: 'Tools', color: 'text-teal-300 bg-teal-900/50' },
  { value: 'other', label: 'Other', color: 'text-gray-400 bg-gray-800' },
];

const CATEGORY_STYLES: Record<string, string> = {
  general: 'text-gray-300 bg-gray-800',
  hydraulics: 'text-blue-300 bg-blue-900/50',
  engine: 'text-red-300 bg-red-900/50',
  electrical: 'text-yellow-300 bg-yellow-900/50',
  transmission: 'text-green-300 bg-green-900/50',
  diagnostics: 'text-cyan-300 bg-cyan-900/50',
  tips: 'text-orange-300 bg-orange-900/50',
  tools: 'text-teal-300 bg-teal-900/50',
  other: 'text-gray-400 bg-gray-800',
};

const CAN_POST_ROLES = ['mechanic', 'technician', 'electrician', 'admin'];

export default function ForumList() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ForumCategory | ''>('');
  const [search, setSearch] = useState('');

  const canPost = profile && CAN_POST_ROLES.includes(profile.role);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      let query = supabase
        .from('forum_posts')
        .select('*, author:profiles!forum_posts_author_id_fkey(id, name, role, avatar_url)')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(50);

      if (category) query = query.eq('category', category);

      const { data } = await query;
      let results = (data || []) as ForumPost[];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(p =>
          p.title.toLowerCase().includes(s) ||
          p.body.toLowerCase().includes(s) ||
          p.tags?.some(t => t.toLowerCase().includes(s))
        );
      }

      if (user) {
        const ids = results.map(p => p.id);
        if (ids.length > 0) {
          const { data: reactions } = await supabase
            .from('forum_reactions')
            .select('target_id')
            .eq('user_id', user.id)
            .eq('target_type', 'post')
            .in('target_id', ids);

          const reactedIds = new Set((reactions || []).map(r => r.target_id));
          results = results.map(p => ({ ...p, user_reacted: reactedIds.has(p.id) }));
        }
      }

      setPosts(results);
      setLoading(false);
    };
    fetchPosts();
  }, [category, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const fetchPosts = async () => {
      setLoading(true);
      let query = supabase
        .from('forum_posts')
        .select('*, author:profiles!forum_posts_author_id_fkey(id, name, role, avatar_url)')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(50);

      if (category) query = query.eq('category', category);
      const { data } = await query;
      let results = (data || []) as ForumPost[];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(p =>
          p.title.toLowerCase().includes(s) ||
          p.body.toLowerCase().includes(s) ||
          p.tags?.some(t => t.toLowerCase().includes(s))
        );
      }
      setPosts(results);
      setLoading(false);
    };
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <MessageCircle className="w-6 h-6 text-yellow-400" />
                <h1 className="text-3xl font-black text-white">Mechanic Forum</h1>
              </div>
              <p className="text-gray-400">Discuss challenges, share tips, and help fellow mechanics and electricians</p>
            </div>
            {canPost ? (
              <Link
                to="/forum/new"
                className="flex-shrink-0 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> New Post
              </Link>
            ) : user ? (
              <div className="flex-shrink-0 flex items-center gap-2 bg-gray-800 text-gray-500 text-sm px-4 py-2.5 rounded-xl border border-gray-700">
                <Lock className="w-4 h-4" /> Mechanics only
              </div>
            ) : (
              <Link
                to="/login"
                className="flex-shrink-0 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Sign in to post
              </Link>
            )}
          </div>

          <form onSubmit={handleSearch} className="mt-6 flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics, questions..."
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-500 rounded-xl py-3 px-4 outline-none transition-colors"
            />
            <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-6 py-3 rounded-xl transition-colors">
              Search
            </button>
          </form>

          <div className="mt-4 flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  category === cat.value
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300 text-sm">
              <Link to="/login" className="font-semibold underline">Sign in</Link> as a mechanic or electrician to post questions and reply to discussions.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading forum..." /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No discussions yet</h3>
            <p className="text-gray-400 mb-6">Be the first to start a conversation.</p>
            {canPost && (
              <Link to="/forum/new" className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-5 py-2.5 rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> Start Discussion
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ x: 2 }}
              >
                <Link
                  to={`/forum/${post.id}`}
                  className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {post.is_pinned && (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        {post.is_locked && (
                          <span className="flex items-center gap-1 text-gray-500 text-xs">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_STYLES[post.category] || 'bg-gray-800 text-gray-400'}`}>
                          {post.category}
                        </span>
                      </div>

                      <h3 className="text-white font-semibold text-base group-hover:text-yellow-400 transition-colors line-clamp-1">
                        {post.title}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{post.body}</p>

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <Tag className="w-3 h-3 text-gray-600" />
                          {post.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">#{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 text-xs font-bold">
                            {post.author?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-gray-400">{post.author?.name}</span>
                          <span className="text-gray-600 capitalize text-xs">· {post.author?.role}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> {post.reply_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {post.view_count}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

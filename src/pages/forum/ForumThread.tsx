import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageCircle, ThumbsUp, CheckCircle, Lock, Send, Pin, Trash2, CornerDownRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ForumPost, ForumReply } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

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

export default function ForumThread() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<ForumReply | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [postReacted, setPostReacted] = useState(false);
  const [reactedReplies, setReactedReplies] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canPost = profile && CAN_POST_ROLES.includes(profile.role);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!postId) return;

    const fetchData = async () => {
      setLoading(true);

      await supabase.rpc('increment_forum_view_count', { p_post_id: postId }).catch(() => {
        supabase.from('forum_posts').update({ view_count: 0 }).eq('id', postId);
      });

      const [{ data: postData }, { data: repliesData }] = await Promise.all([
        supabase
          .from('forum_posts')
          .select('*, author:profiles!forum_posts_author_id_fkey(id, name, role, avatar_url)')
          .eq('id', postId)
          .maybeSingle(),
        supabase
          .from('forum_replies')
          .select('*, author:profiles!forum_replies_author_id_fkey(id, name, role, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true }),
      ]);

      setPost(postData as ForumPost | null);

      let replyList = (repliesData || []) as ForumReply[];

      if (user) {
        const allIds = [postId, ...replyList.map(r => r.id)];
        const { data: reactions } = await supabase
          .from('forum_reactions')
          .select('target_id, target_type')
          .eq('user_id', user.id)
          .in('target_id', allIds);

        const postReactedSet = new Set(
          (reactions || []).filter(r => r.target_type === 'post').map(r => r.target_id)
        );
        const replyReactedSet = new Set(
          (reactions || []).filter(r => r.target_type === 'reply').map(r => r.target_id)
        );
        setPostReacted(postReactedSet.has(postId));
        setReactedReplies(replyReactedSet);
      }

      const { data: reactionCounts } = await supabase
        .from('forum_reactions')
        .select('target_id, target_type')
        .in('target_id', replyList.map(r => r.id))
        .eq('target_type', 'reply');

      const countMap: Record<string, number> = {};
      (reactionCounts || []).forEach(r => {
        countMap[r.target_id] = (countMap[r.target_id] || 0) + 1;
      });
      replyList = replyList.map(r => ({ ...r, reaction_count: countMap[r.id] || 0 }));

      setReplies(replyList);
      setLoading(false);
    };

    fetchData();
  }, [postId, user]);

  const handleReact = async (targetId: string, targetType: 'post' | 'reply') => {
    if (!user) { navigate('/login'); return; }

    const isReacted = targetType === 'post' ? postReacted : reactedReplies.has(targetId);

    if (isReacted) {
      await supabase
        .from('forum_reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType);
    } else {
      await supabase.from('forum_reactions').insert({
        user_id: user.id,
        target_id: targetId,
        target_type: targetType,
      });
    }

    if (targetType === 'post') {
      setPostReacted(!isReacted);
    } else {
      setReactedReplies(prev => {
        const next = new Set(prev);
        if (isReacted) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
      setReplies(prev => prev.map(r =>
        r.id === targetId
          ? { ...r, reaction_count: (r.reaction_count || 0) + (isReacted ? -1 : 1) }
          : r
      ));
    }
  };

  const handleSubmitReply = async () => {
    if (!user || !postId || !replyText.trim()) return;
    if (!canPost) { toast.error('Only mechanics and electricians can reply.'); return; }
    setSubmitting(true);

    const { error } = await supabase.from('forum_replies').insert({
      post_id: postId,
      author_id: user.id,
      parent_reply_id: replyTo?.id || null,
      body: replyText.trim(),
    });

    if (!error) {
      const { data: newReply } = await supabase
        .from('forum_replies')
        .select('*, author:profiles!forum_replies_author_id_fkey(id, name, role, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (newReply) {
        setReplies(prev => [...prev, { ...newReply as ForumReply, reaction_count: 0 }]);
      }
      setReplyText('');
      setReplyTo(null);
      toast.success('Reply posted!');
    } else {
      toast.error('Failed to post reply.');
    }
    setSubmitting(false);
  };

  const handleMarkAccepted = async (replyId: string, current: boolean) => {
    if (!isAdmin && post?.author_id !== user?.id) return;
    await supabase.from('forum_replies').update({ is_accepted_answer: !current }).eq('id', replyId);
    setReplies(prev => prev.map(r => ({ ...r, is_accepted_answer: r.id === replyId ? !current : false })));
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return;
    await supabase.from('forum_replies').delete().eq('id', replyId);
    setReplies(prev => prev.filter(r => r.id !== replyId));
    toast.success('Reply deleted.');
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this entire post?')) return;
    await supabase.from('forum_posts').delete().eq('id', postId!);
    toast.success('Post deleted.');
    navigate('/forum');
  };

  const startReplyTo = (reply: ForumReply) => {
    setReplyTo(reply);
    textareaRef.current?.focus();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
      <div className="text-center">
        <MessageCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Post not found</h3>
        <Link to="/forum" className="text-yellow-400 hover:text-yellow-300">Back to Forum</Link>
      </div>
    </div>
  );

  const topReplies = replies.filter(r => !r.parent_reply_id);
  const childReplies = replies.filter(r => r.parent_reply_id);

  const AvatarBadge = ({ name, role }: { name?: string; role?: string }) => (
    <div className="flex-shrink-0 flex flex-col items-center gap-1">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-sm">
        {name?.charAt(0) || '?'}
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded text-center leading-tight capitalize ${
        role === 'admin' ? 'bg-red-900/50 text-red-300' :
        role === 'electrician' ? 'bg-yellow-900/50 text-yellow-300' :
        'bg-gray-800 text-gray-400'
      }`}>
        {role}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/forum" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Forum
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <AvatarBadge name={post.author?.name} role={post.author?.role} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {post.is_pinned && <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold"><Pin className="w-3 h-3" /> Pinned</span>}
                    {post.is_locked && <span className="flex items-center gap-1 text-gray-500 text-xs"><Lock className="w-3 h-3" /> Locked</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_STYLES[post.category] || 'bg-gray-800 text-gray-400'}`}>
                      {post.category}
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-white">{post.title}</h1>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <span className="text-gray-300 font-medium">{post.author?.name}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>

                  <p className="text-gray-300 mt-4 leading-relaxed whitespace-pre-wrap">{post.body}</p>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => handleReact(post.id, 'post')}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        postReacted ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${postReacted ? 'fill-yellow-400' : ''}`} />
                      Helpful
                    </button>
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MessageCircle className="w-4 h-4" /> {post.reply_count} replies
                    </span>
                    {(isAdmin || post.author_id === user?.id) && (
                      <button
                        onClick={handleDeletePost}
                        className="ml-auto flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Post
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {replies.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-white font-bold text-sm px-1">{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</h2>
              {topReplies.map(reply => {
                const children = childReplies.filter(r => r.parent_reply_id === reply.id);
                const isAccepted = reply.is_accepted_answer;
                const reacted = reactedReplies.has(reply.id);

                return (
                  <motion.div
                    key={reply.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`bg-gray-900 border rounded-xl overflow-hidden ${isAccepted ? 'border-green-700' : 'border-gray-800'}`}
                  >
                    {isAccepted && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border-b border-green-800/50">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-xs font-semibold">Accepted Answer</span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <AvatarBadge name={reply.author?.name} role={reply.author?.role} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">{reply.author?.name}</span>
                            <span className="text-gray-600 text-xs">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                          </div>
                          <p className="text-gray-300 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-800">
                            <button
                              onClick={() => handleReact(reply.id, 'reply')}
                              className={`flex items-center gap-1 text-xs font-medium transition-colors ${reacted ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${reacted ? 'fill-yellow-400' : ''}`} />
                              {reply.reaction_count || 0}
                            </button>
                            {!post.is_locked && canPost && (
                              <button
                                onClick={() => startReplyTo(reply)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                              >
                                <CornerDownRight className="w-3.5 h-3.5" /> Reply
                              </button>
                            )}
                            {(isAdmin || post.author_id === user?.id) && (
                              <button
                                onClick={() => handleMarkAccepted(reply.id, isAccepted)}
                                className={`flex items-center gap-1 text-xs transition-colors ${isAccepted ? 'text-green-400' : 'text-gray-600 hover:text-green-400'}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> {isAccepted ? 'Unmark' : 'Mark as Answer'}
                              </button>
                            )}
                            {(isAdmin || reply.author_id === user?.id) && (
                              <button
                                onClick={() => handleDeleteReply(reply.id)}
                                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-400 transition-colors ml-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {children.length > 0 && (
                      <div className="border-t border-gray-800 bg-gray-950/40">
                        {children.map(child => (
                          <div key={child.id} className="p-4 pl-8 border-b border-gray-800/50 last:border-0">
                            <div className="flex items-start gap-3">
                              <CornerDownRight className="w-4 h-4 text-gray-700 flex-shrink-0 mt-1" />
                              <AvatarBadge name={child.author?.name} role={child.author?.role} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-semibold text-sm">{child.author?.name}</span>
                                  <span className="text-gray-600 text-xs">{formatDistanceToNow(new Date(child.created_at), { addSuffix: true })}</span>
                                </div>
                                <p className="text-gray-300 text-sm mt-1 leading-relaxed whitespace-pre-wrap">{child.body}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <button
                                    onClick={() => handleReact(child.id, 'reply')}
                                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${reactedReplies.has(child.id) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                                  >
                                    <ThumbsUp className={`w-3.5 h-3.5 ${reactedReplies.has(child.id) ? 'fill-yellow-400' : ''}`} />
                                    {child.reaction_count || 0}
                                  </button>
                                  {(isAdmin || child.author_id === user?.id) && (
                                    <button
                                      onClick={() => handleDeleteReply(child.id)}
                                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-400 transition-colors ml-auto"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {!post.is_locked && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              {canPost ? (
                <>
                  <h3 className="text-white font-semibold mb-3">
                    {replyTo ? (
                      <span className="flex items-center gap-2">
                        <CornerDownRight className="w-4 h-4 text-yellow-400" />
                        Replying to <span className="text-yellow-400">{replyTo.author?.name}</span>
                        <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-gray-300 text-xs ml-1">(cancel)</button>
                      </span>
                    ) : 'Post a Reply'}
                  </h3>
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Share your knowledge, ask for clarification, or provide a solution..."
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 outline-none transition-colors resize-none text-sm"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSubmitReply}
                      disabled={submitting || !replyText.trim()}
                      className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/40 disabled:cursor-not-allowed text-gray-900 font-bold py-2.5 px-5 rounded-xl transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </>
              ) : user ? (
                <div className="text-center py-4">
                  <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Only mechanics and electricians can reply to forum posts.</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">
                    <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold">Sign in</Link> to join the discussion.
                  </p>
                </div>
              )}
            </div>
          )}

          {post.is_locked && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-2 text-gray-500">
              <Lock className="w-4 h-4" />
              <span className="text-sm">This thread is locked. No new replies allowed.</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

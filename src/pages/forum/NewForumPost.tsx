import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Tag, X, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ForumCategory } from '../../types';
import toast from 'react-hot-toast';

const CATEGORIES: { value: ForumCategory; label: string }[] = [
  { value: 'general', label: 'General Discussion' },
  { value: 'hydraulics', label: 'Hydraulics' },
  { value: 'engine', label: 'Engine' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'diagnostics', label: 'Diagnostics' },
  { value: 'tips', label: 'Tips & Tricks' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'other', label: 'Other' },
];

const CAN_POST_ROLES = ['mechanic', 'technician', 'electrician', 'admin'];

export default function NewForumPost() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ForumCategory>('general');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!user || !profile) {
    navigate('/login');
    return null;
  }

  if (!CAN_POST_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Access Restricted</h3>
          <p className="text-gray-400 mb-4">Only mechanics and electricians can post in the forum.</p>
          <Link to="/forum" className="text-yellow-400 hover:text-yellow-300">Back to Forum</Link>
        </div>
      </div>
    );
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required.');
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        author_id: user.id,
        title: title.trim(),
        body: body.trim(),
        category,
        tags,
      })
      .select()
      .single();

    if (!error && data) {
      toast.success('Post published!');
      navigate(`/forum/${data.id}`);
    } else {
      toast.error('Failed to publish post. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/forum" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Forum
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl font-black text-white">New Discussion</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="What's your question or topic?"
                className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 outline-none transition-colors"
              />
              <p className="text-gray-600 text-xs mt-1 text-right">{title.length}/200</p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Describe your challenge, question, or topic in detail. The more context you provide, the better help you'll receive..."
                className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 outline-none transition-colors resize-none text-sm leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                <Tag className="w-3.5 h-3.5 inline mr-1" />
                Tags <span className="text-gray-500 font-normal">(optional, up to 5)</span>
              </label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-gray-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {tags.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="e.g. caterpillar, hydraulic-pump (Enter to add)"
                    className="flex-1 bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 outline-none transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                to="/forum"
                className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !body.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/40 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

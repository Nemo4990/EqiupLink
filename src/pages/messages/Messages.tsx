import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Message, Profile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';

interface Conversation {
  user: Profile;
  lastMessage: Message;
  unread: number;
}

export default function Messages() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    const convMap = new Map<string, Conversation>();
    (data || []).forEach((msg: Message) => {
      const other = msg.sender_id === profile.id ? msg.receiver! : msg.sender!;
      if (!convMap.has(other.id)) {
        convMap.set(other.id, {
          user: other,
          lastMessage: msg,
          unread: 0,
        });
      }
      if (msg.receiver_id === profile.id && !msg.is_read) {
        const c = convMap.get(other.id)!;
        c.unread += 1;
        convMap.set(other.id, c);
      }
    });

    setConversations(Array.from(convMap.values()));
    setLoading(false);

    if (targetUserId) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      if (targetProfile) openConversation(targetProfile as Profile);
    }
  };

  const openConversation = async (user: Profile) => {
    setSelectedUser(user);
    if (!profile) return;

    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
      .or(
        `and(sender_id.eq.${profile.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${profile.id})`
      )
      .order('created_at', { ascending: true });

    setMessages((data || []) as Message[]);

    await supabase.from('messages')
      .update({ is_read: true })
      .eq('sender_id', user.id)
      .eq('receiver_id', profile.id)
      .eq('is_read', false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !profile || sending) return;
    setSending(true);

    const { data, error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    }).select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)').single();

    if (!error && data) {
      setMessages(prev => [...prev, data as Message]);
      setNewMessage('');
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        title: `New message from ${profile.name}`,
        message: newMessage.trim().substring(0, 80),
        type: 'message',
        related_id: profile.id,
      });
    }
    setSending(false);
    loadConversations();
  };

  useEffect(() => { loadConversations(); }, [profile]);

  const filteredConvs = conversations.filter(c =>
    !searchQuery || c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 pt-16">
      <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex">
        <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-800 bg-gray-950`}>
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-white font-bold text-xl mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.user.id}
                  onClick={() => openConversation(conv.user)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-900/60 transition-colors border-b border-gray-800/50 text-left ${
                    selectedUser?.id === conv.user.id ? 'bg-gray-900' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold">
                      {conv.user.name.charAt(0)}
                    </div>
                    {conv.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">{conv.unread}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{conv.user.name}</p>
                    <p className="text-gray-500 text-xs truncate mt-0.5">{conv.lastMessage.content}</p>
                  </div>
                  <span className="text-gray-600 text-xs flex-shrink-0">{format(new Date(conv.lastMessage.created_at), 'h:mm a')}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {selectedUser ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-gray-950">
                <button onClick={() => setSelectedUser(null)} className="md:hidden text-gray-400 hover:text-white mr-1">←</button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-sm">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">{selectedUser.name}</p>
                  <p className="text-gray-500 text-xs capitalize">{selectedUser.role?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500">Start a conversation with {selectedUser.name}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === profile?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                          isMe ? 'bg-yellow-400 text-gray-900 rounded-br-sm' : 'bg-gray-800 text-white rounded-bl-sm'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-gray-700' : 'text-gray-500'}`}>
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedUser.name}...`}
                  className="flex-1 bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 outline-none transition-colors text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 p-3 rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Your Messages</h3>
                <p className="text-gray-400">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

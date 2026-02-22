import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { User, AppNotification } from '../context/AppContext';

interface Props {
  currentUser: User;
  notifications: AppNotification[];
  markAsRead: () => void;
}

export default function NotificationBell({ currentUser, notifications, markAsRead }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  // Get setNotifications from context to ensure the UI updates everywhere
  const { setNotifications } = useAppContext();

  const myNotifications = notifications.filter(n => n.recipientId === currentUser.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  // 1. Toggle Read/Unread Status
  const toggleReadStatus = async (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation(); // Prevents the parent div's onClick (navigation) from firing
    const newStatus = !n.read;

    // Update Local UI
    setNotifications(
      notifications.map((notif: AppNotification) => notif.id === n.id ? { ...notif, read: newStatus } : notif)
    );

    // Update Database
    if (navigator.onLine) {
      await supabase.from('notifications').update({ read: newStatus }).eq('id', n.id);
    }
  };

  // 2. Handle Navigation and Auto-Mark as Read
  const handleNotificationClick = async (n: AppNotification) => {
    // Mark as read first
    if (!n.read) {
      setNotifications(notifications.map((notif: AppNotification) => notif.id === n.id ? { ...notif, read: true } : notif));
      if (navigator.onLine) {
        await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      }
    }

    // Close dropdown
    setIsOpen(false);

    // Navigate
    if (!n.relatedId) {
      console.warn("No ID found, staying on page.");
      return;
    }

    const pathMap: Record<string, string> = {
      'case': `/lawyer/cases/${n.relatedId}`,
      'transaction': `/lawyer/transactions/${n.relatedId}`,
      'letter': `/lawyer/letters/${n.relatedId}`,
      'task': `/lawyer/tasks`
    };

    const targetPath = pathMap[n.relatedType || ''];
    if (targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <div className="relative" style={{ zIndex: 9999 }}>
      {/* Bell Icon Button */}
      <button 
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
        className="relative p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-[#0B1F3A] text-[9px] font-black text-white items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Transparent backdrop to close when clicking outside */}
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setIsOpen(false)}
          ></div>

          <div className="absolute right-0 mt-4 w-96 bg-white rounded-[24px] shadow-2xl z-[101] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <span className="text-slate-900 font-bold text-xs uppercase tracking-widest">Notifications</span>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                {unreadCount} New
              </span>
            </div>
            
            <div className="max-h-[380px] overflow-y-auto">
              {myNotifications.length > 0 ? (
                myNotifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 border-b border-slate-50 cursor-pointer transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/30' : 'bg-white'}`}
                  >
                    {/* Unread Indicator / Toggle */}
                    <div className="flex flex-col items-center pt-1">
                        <button 
                            onClick={(e) => toggleReadStatus(e, n)}
                            className={`h-3 w-3 rounded-full border-2 transition-all ${
                                !n.read ? 'bg-blue-600 border-blue-200' : 'bg-transparent border-slate-300'
                            }`}
                        />
                    </div>

                    <div className="flex-1">
                      <p className={`text-xs leading-tight mb-2 ${!n.read ? 'text-slate-900 font-bold' : 'text-slate-500 font-normal'}`}>
                        {n.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-medium">{n.date}</span>
                        <button 
                            onClick={(e) => toggleReadStatus(e, n)}
                            className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-tighter"
                        >
                            {n.read ? "Mark Unread" : "Mark Read"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 text-xs italic">No notifications yet</div>
              )}
            </div>

            {unreadCount > 0 && (
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    markAsRead();
                    setIsOpen(false);
                }}
                className="w-full p-4 bg-slate-900 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
import { useState } from "react";

export const NotificationBell = ({ currentUser, notifications, markAsRead }: any) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!currentUser) return null;

    const myNotifications = (notifications || [])
        .filter((n: any) => String(n.recipientId) === String(currentUser.id))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const unreadCount = myNotifications.filter((n: any) => !n.read).length;

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
                style={{
                    cursor: 'pointer', position: 'relative', marginRight: '15px',
                    padding: '8px', borderRadius: '50%',
                    backgroundColor: isOpen ? '#E2E8F0' : 'transparent', transition: '0.2s', border: 'none'
                }}
                aria-label="Toggle notifications"
            >
                <span style={{ fontSize: '20px' }}>🔔</span>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '0', right: '0',
                        backgroundColor: '#E53E3E', color: 'white', borderRadius: '50%',
                        width: '18px', height: '18px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', border: '2px solid white'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '50px', right: '-10px', width: '360px',
                    backgroundColor: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    borderRadius: '16px', zIndex: 1000, border: '1px solid #E2E8F0', overflow: 'hidden'
                }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #F7FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', color: '#2D3748', fontWeight: 'bold' }}>
                                Notifications
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: unreadCount > 0 ? '#E53E3E' : '#718096', fontWeight: '700' }}>
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); markAsRead(); }}
                                style={{ fontSize: '11px', color: '#3182CE', fontWeight: 'bold', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        {myNotifications.length > 0 ? (
                            myNotifications.map((n: any) => (
                                <div key={n.id} style={{
                                    padding: '12px 15px', borderBottom: '1px solid #F7FAFC',
                                    backgroundColor: n.read ? 'white' : '#EBF8FF', transition: '0.2s'
                                }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '18px', marginTop: 2 }}>
                                            {n.type === 'task' ? '📋' : n.type === 'file' ? '📁' : '🔴'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#2D3748', fontWeight: n.read ? 'normal' : 'bold', lineHeight: 1.4 }}>
                                                {n.message}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '10px', color: '#A0AEC0' }}>{n.date}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#A0AEC0', fontSize: '13px' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                                No notifications yet
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 900 }} onClick={() => setIsOpen(false)} />}
        </div>
    );
};

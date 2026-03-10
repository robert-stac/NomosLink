import { useState } from "react";

export const NotificationBell = ({ currentUser, notifications, markAsRead }: any) => {
    const [isOpen, setIsOpen] = useState(false);

    const myNotifications = (notifications || [])
        .filter((n: any) => String(n.recipientId) === String(currentUser.id))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const unreadCount = myNotifications.filter((n: any) => !n.read).length;

    return (
        <div style={{ position: 'relative' }}>
            <div
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAsRead(); }}
                style={{
                    cursor: 'pointer', position: 'relative', marginRight: '15px',
                    padding: '8px', borderRadius: '50%',
                    backgroundColor: isOpen ? '#E2E8F0' : 'transparent', transition: '0.2s'
                }}
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
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '50px', right: '-10px', width: '360px',
                    backgroundColor: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    borderRadius: '16px', zIndex: 1000, border: '1px solid #E2E8F0', overflow: 'hidden'
                }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #F7FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#2D3748', fontWeight: 'bold' }}>
                            Notifications {unreadCount > 0 && <span style={{ backgroundColor: '#E53E3E', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', marginLeft: 6 }}>{unreadCount}</span>}
                        </h4>
                        <span style={{ fontSize: '11px', color: '#718096', cursor: 'pointer', fontWeight: 'bold' }} onClick={markAsRead}>
                            Mark all read
                        </span>
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
                                        {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3182CE', marginTop: 4, flexShrink: 0 }} />}
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

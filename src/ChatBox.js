import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { db } from './Util';

const ChatBox = ({ roomId, playerName, playerUid, text }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!roomId) return;
        const chatRef = ref(db, `games/${roomId}/chat`);
        const unsubscribe = onValue(chatRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array and sort by timestamp
                const msgList = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(msgList);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !playerUid) return;

        try {
            const chatRef = ref(db, `games/${roomId}/chat`);
            await push(chatRef, {
                senderName: playerName || 'Player',
                senderUid: playerUid,
                text: newMessage.trim(),
                timestamp: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h3 className="arabic-text">{text?.chat || 'Chat'}</h3>
            </div>
            <div className="chat-messages">
                {messages.map((msg, idx) => {
                    const isMe = msg.senderUid === playerUid;
                    return (
                        <div key={idx} className={`chat-message ${isMe ? 'my-message' : 'other-message'}`}>
                            <div className="chat-message-sender">{isMe ? (text?.you || 'You') : msg.senderName}</div>
                            <div className="chat-message-text">{msg.text}</div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={text?.typeMessage || "Type a message..."}
                    className="chat-input"
                />
                <button type="submit" className="chat-send-btn">{text?.send || 'Send'}</button>
            </form>
        </div>
    );
};

export default ChatBox;

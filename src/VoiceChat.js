import React, { useEffect, useState, useRef } from 'react';
import { ref, set, onValue, push, onChildAdded, remove, off, onDisconnect } from 'firebase/database';
import { db } from './Util';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
        // To add a TURN server (required for some restricted networks), use:
        // { 
        //   urls: 'turn:your-turn-server.com:3478', 
        //   username: 'your-username', 
        //   credential: 'your-password' 
        // }
    ]
};

const VoiceChat = ({ roomId, playerUid }) => {
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({}); // { uid: { stream, isLive } }

    const peerConnections = useRef({}); // { uid: RTCPeerConnection }
    const pendingCandidates = useRef({}); // { uid: [candidates] }
    const localStreamRef = useRef(null);

    // Sync localStreamRef for WebRTC track addition
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            leaveVoice();
        };
    }, []);

    const joinVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);
            setIsJoined(true);

            // Register ourselves as present in voice chat
            const presenceRef = ref(db, `games/${roomId}/webrtc/presence/${playerUid}`);
            await set(presenceRef, true);
            // Cleanup on disconnect (Firebase-side)
            onDisconnect(presenceRef).remove();

            // Listen for other players in voice chat
            const allPresenceRef = ref(db, `games/${roomId}/webrtc/presence`);
            onValue(allPresenceRef, (snapshot) => {
                const presenceData = snapshot.val() || {};
                Object.keys(presenceData).forEach(otherUid => {
                    if (otherUid !== playerUid && !peerConnections.current[otherUid]) {
                        initPeerConnection(otherUid, stream);
                    }
                });
            });

            // Cleanup presence on disconnect (handled by leaveVoice or Firebase disconnect if we implemented it)
        } catch (error) {
            console.error("Error accessing mic:", error);
        }
    };

    const leaveVoice = () => {
        const presenceRef = ref(db, `games/${roomId}/webrtc/presence/${playerUid}`);
        remove(presenceRef);

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        Object.keys(peerConnections.current).forEach(uid => {
            peerConnections.current[uid].close();
            delete peerConnections.current[uid];
        });

        setPeers({});
        setIsJoined(false);

        // Unsubscribe from presence
        const allPresenceRef = ref(db, `games/${roomId}/webrtc/presence`);
        off(allPresenceRef);
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const initPeerConnection = async (otherUid, stream) => {
        if (peerConnections.current[otherUid]) return;

        const pc = new RTCPeerConnection(configuration);
        peerConnections.current[otherUid] = pc;

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        // Listen for remote tracks
        pc.ontrack = (event) => {
            setPeers(prev => ({
                ...prev,
                [otherUid]: { stream: event.streams[0], isLive: true }
            }));
        };

        // Determine Role: smaller UID is Caller
        const isCaller = playerUid < otherUid;
        const pairKey = [playerUid, otherUid].sort().join('_');
        const signalPath = `games/${roomId}/webrtc/signals/${pairKey}`;

        const offerRef = ref(db, `${signalPath}/offer`);
        const answerRef = ref(db, `${signalPath}/answer`);
        const myCandidatesRef = ref(db, `${signalPath}/${playerUid}_candidates`);
        const theirCandidatesRef = ref(db, `${signalPath}/${otherUid}_candidates`);

        // ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                push(myCandidatesRef, event.candidate.toJSON());
            }
        };

        if (isCaller) {
            // Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await set(offerRef, { sdp: offer.sdp, type: offer.type, from: playerUid });

            // Listen for Answer
            onValue(answerRef, async (snapshot) => {
                const answer = snapshot.val();
                if (answer && answer.from === otherUid && pc.signalingState === "have-local-offer") {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    processPendingCandidates(otherUid);
                }
            });
        } else {
            // Wait for Offer
            onValue(offerRef, async (snapshot) => {
                const offer = snapshot.val();
                if (offer && offer.from === otherUid && pc.signalingState === "stable") {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await set(answerRef, { sdp: answer.sdp, type: answer.type, from: playerUid });
                    processPendingCandidates(otherUid);
                }
            });
        }

        // Handle incoming candidates
        onChildAdded(theirCandidatesRef, (data) => {
            const candidate = new RTCIceCandidate(data.val());
            if (pc.remoteDescription) {
                pc.addIceCandidate(candidate).catch(e => console.error("Error adding ice candidate:", e));
            } else {
                if (!pendingCandidates.current[otherUid]) pendingCandidates.current[otherUid] = [];
                pendingCandidates.current[otherUid].push(candidate);
            }
        });
    };

    const processPendingCandidates = (uid) => {
        const pc = peerConnections.current[uid];
        if (pc && pc.remoteDescription && pendingCandidates.current[uid]) {
            pendingCandidates.current[uid].forEach(candidate => {
                pc.addIceCandidate(candidate).catch(e => console.error("Error adding pending ice candidate:", e));
            });
            delete pendingCandidates.current[uid];
        }
    };

    return (
        <div className="voice-chat-container">
            {!isJoined ? (
                <button onClick={joinVoice} className="voice-btn join-voice-btn">
                    🎙️ Join Voice
                </button>
            ) : (
                <div className="voice-controls">
                    <button onClick={toggleMute} className={`voice-btn ${isMuted ? 'muted' : ''}`}>
                        {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                    </button>
                    <button onClick={leaveVoice} className="voice-btn leave-voice-btn">
                        📞 Leave
                    </button>
                    <div className="remote-streams">
                        {Object.keys(peers).map(uid => (
                            <div key={uid} className="remote-peer">
                                <span className="voice-status">🗣️</span>
                                <RemoteAudio stream={peers[uid].stream} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component to handle audio tag per stream
const RemoteAudio = ({ stream }) => {
    const audioRef = useRef(null);
    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};

export default VoiceChat;

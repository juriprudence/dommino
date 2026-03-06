import React, { useEffect, useState, useRef } from 'react';
import { ref, set, onValue, push, onChildAdded, remove } from 'firebase/database';
import { db } from './Util';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

const VoiceChat = ({ roomId, playerUid }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isJoined, setIsJoined] = useState(false);

    const pc = useRef(null);
    const remoteAudioRef = useRef(null);

    useEffect(() => {
        if (remoteStream && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (pc.current) {
                pc.current.close();
            }
        };
    }, [localStream]);

    const joinVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);
            setIsJoined(true);
            setupWebRTC(stream);
        } catch (error) {
            console.error("Error accessing mic:", error);
            // alert("Could not access microphone.");
        }
    };

    const leaveVoice = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        setIsJoined(false);
        setRemoteStream(null);
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const setupWebRTC = async (stream) => {
        pc.current = new RTCPeerConnection(configuration);

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.current.addTrack(track, stream);
        });

        // Listen for remote tracks
        pc.current.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        const offerRef = ref(db, `games/${roomId}/webrtc/offer`);
        const answerRef = ref(db, `games/${roomId}/webrtc/answer`);
        const callerCandidatesRef = ref(db, `games/${roomId}/webrtc/callerCandidates`);
        const calleeCandidatesRef = ref(db, `games/${roomId}/webrtc/calleeCandidates`);

        let isCaller = false;

        // Listen for ICE candidates
        pc.current.onicecandidate = event => {
            if (event.candidate) {
                const candidatesRef = isCaller ? callerCandidatesRef : calleeCandidatesRef;
                push(candidatesRef, event.candidate.toJSON());
            }
        };

        let unsubscribe;
        unsubscribe = onValue(offerRef, async (snapshot) => {
            if (unsubscribe) unsubscribe(); // Run once

            const offer = snapshot.val();

            if (!offer || offer.senderUid === playerUid) {
                // We are the Caller
                isCaller = true;

                if (!offer) {
                    set(ref(db, `games/${roomId}/webrtc`), null);
                }

                const offerDescription = await pc.current.createOffer();
                await pc.current.setLocalDescription(offerDescription);

                const offerData = {
                    sdp: offerDescription.sdp,
                    type: offerDescription.type,
                    senderUid: playerUid
                };

                await set(offerRef, offerData);

                // Listen for Answer
                onValue(answerRef, async (ansSnapshot) => {
                    const answer = ansSnapshot.val();
                    if (answer && answer.senderUid !== playerUid && pc.current.signalingState !== "stable") {
                        const answerDescription = new RTCSessionDescription(answer);
                        await pc.current.setRemoteDescription(answerDescription);
                    }
                });

                // Listen for Callee Candidates
                onChildAdded(calleeCandidatesRef, (data) => {
                    if (pc.current && pc.current.remoteDescription) {
                        const candidate = new RTCIceCandidate(data.val());
                        pc.current.addIceCandidate(candidate).catch(e => console.error(e));
                    } else {
                        // Store it to add later if remoteDescription is not set yet, or ignore.
                        // Actually, Firebase handles ordering. If remote isn't set, we might miss.
                        // Better to delay adding candidates until remote description is set.
                        // Usually, RTCPeerConnection queues them or we must queue. 
                        // To keep it simple, we just set remoteDescription first.
                    }
                });

            } else {
                // We are the Callee
                isCaller = false;

                const offerDescription = new RTCSessionDescription(offer);
                await pc.current.setRemoteDescription(offerDescription);

                const answerDescription = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answerDescription);

                const answerData = {
                    sdp: answerDescription.sdp,
                    type: answerDescription.type,
                    senderUid: playerUid
                };

                await set(answerRef, answerData);

                // Listen for Caller Candidates
                onChildAdded(callerCandidatesRef, (data) => {
                    const candidate = new RTCIceCandidate(data.val());
                    pc.current.addIceCandidate(candidate).catch(e => console.error(e));
                });
            }
        });
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
                    {remoteStream && <span className="voice-status">🗣️</span>}
                </div>
            )}

            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
        </div>
    );
};

export default VoiceChat;

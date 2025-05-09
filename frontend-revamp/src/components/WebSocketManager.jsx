// src/components/WebSocketManager.jsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeWebSocket, closeWebSocket } from '../redux/services/webSocketService';

const WebSocketManager = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    initializeWebSocket(dispatch);
    
    return () => {
      closeWebSocket();
    };
  }, [dispatch]);

  return null; // This is a utility component that doesn't render anything
};

export default WebSocketManager;
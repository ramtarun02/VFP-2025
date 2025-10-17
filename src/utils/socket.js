import io from 'socket.io-client';

const getSocketURL = () => {
    if (process.env.NODE_ENV === 'development') {
        return 'http://127.0.0.1:5000';
    }
    return process.env.REACT_APP_WS_URL || 'vfp-solver-gngfaahkh2fkbbhh.uksouth-01.azurewebsites.net';
};

// Create socket connection function
export const createSocket = (options = {}) => {
    const defaultOptions = {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
    };

    const socketURL = getSocketURL();
    console.log('Connecting to WebSocket:', socketURL);

    return io(socketURL, { ...defaultOptions, ...options });
};

// Create a default socket instance
export const socket = createSocket();

export default socket;
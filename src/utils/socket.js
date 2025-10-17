import io from 'socket.io-client';

const getSocketURL = () => {
    if (process.env.NODE_ENV === 'development') {
        return 'http://127.0.0.1:5000';
    }

    // Fix: Add https:// protocol for Azure deployment
    const wsURL = process.env.REACT_APP_WS_URL || 'https://vfp-solver-gngfaahkh2fkbbhh.uksouth-01.azurewebsites.net';
    return fullWSURL;
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
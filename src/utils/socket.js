import io from 'socket.io-client';

// Vite uses import.meta.env for environment variables
const getSocketURL = () => {
    // Check Vite and browser environment for local development
    const isDevelopment =
        import.meta.env.DEV ||
        import.meta.env.MODE === 'development' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
        return 'http://127.0.0.1:5000';
    }

    // Use Vite env variable or fallback to Azure production URL
    const wsURL = import.meta.env.VITE_WS_URL || 'https://vfp-solver-gngfaahkh2fkbbhh.uksouth-01.azurewebsites.net';
    return wsURL;
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
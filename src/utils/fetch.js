// Direct export approach (more reliable than global variables)
const getBaseURL = () => {
    console.log('Current NODE_ENV:', process.env.NODE_ENV);

    if (process.env.NODE_ENV === 'development') {
        console.log('Using development URL: http://127.0.0.1:5000');
        return 'http://127.0.0.1:5000';
    }

    // Fix: Add https:// protocol for Azure deployment
    const prodURL = process.env.REACT_APP_API_URL || 'https://vfp-solver-gngfaahkh2fkbbhh.uksouth-01.azurewebsites.net';
    console.log('Using production URL:', prodURL);
    return prodURL;
};


const BASE_URL = getBaseURL();

// Create a custom fetch that automatically adds the base URL
export const fetchAPI = (url, options = {}) => {
    // If URL already includes http, use it as is (for external APIs)
    if (url.startsWith('http')) {
        console.log('External URL detected, using as is:', url);
        return fetch(url, options);
    }

    // Otherwise, prepend our base URL
    const fullURL = `${BASE_URL}${url}`;
    console.log('API call to:', fullURL);
    return fetch(fullURL, options);
};

// Export the base URL too
export const API_BASE_URL = BASE_URL;

// Default export
export default fetchAPI;
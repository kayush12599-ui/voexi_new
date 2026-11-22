import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const ReactDOM = require('react-dom');
    const ReactDOMClient = require('react-dom/client');

    if (ReactDOM && typeof ReactDOM.render !== 'function' && ReactDOMClient && ReactDOMClient.createRoot) {
      ReactDOM.render = function (element, container, callback) {
        if (!container) return null;
        let root = container._reactRootContainer;
        if (!root) {
          root = ReactDOMClient.createRoot(container);
          container._reactRootContainer = root;
        }
        root.render(element);
        if (typeof callback === 'function') {
          setTimeout(callback, 0);
        }
        return root;
      };
      console.log('✅ [REACT 19 WEB SHIELD] Polyfilled ReactDOM.render -> ReactDOM.createRoot successfully!');
    }
  } catch (e) {
    console.warn('[REACT 19 WEB SHIELD] Polyfill warning:', e);
  }
}

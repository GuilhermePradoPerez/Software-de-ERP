import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    typeof event.reason.message === 'string' &&
    event.reason.message.includes('WebSocket closed without opened')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);

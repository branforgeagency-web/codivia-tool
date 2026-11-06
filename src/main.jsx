/* CODIVIA platform — entry point */
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/app.css';
import './services/firebase.js';
import { App } from './App.jsx';
import { applyTheme } from './theme/applyTheme.js';
import { initCheckerboard } from './utils/checkerboard.js';

applyTheme();
initCheckerboard();

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

/* CODIVIA platform — entry point */
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/app.css';
import './styles/refinements.css';
import { App } from './App.jsx';
import { applyTheme } from './theme/applyTheme.js';

applyTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

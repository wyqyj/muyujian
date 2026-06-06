import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QuickNote } from './components/QuickNote';
import { TodayPlanWindow } from './components/TodayPlanWindow';
import './styles/index.css';

const hash = window.location.hash;
const isQuickNote = hash === '#/quick-note';
const isTodayPlan = hash === '#/today-plan';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isQuickNote) {
  root.render(<React.StrictMode><QuickNote /></React.StrictMode>);
} else if (isTodayPlan) {
  root.render(<React.StrictMode><TodayPlanWindow /></React.StrictMode>);
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}

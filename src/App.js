import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Auth from './components/Auth/Auth';
import Client from './components/Client/Client';
import Freelancer from './components/Freelancer/Freelancer';
import ClientProjectsPage from './components/Client/ProjectsPage/ProjectsPage';
import FreelancerProjectsPage from './components/Freelancer/ProjectsPage/ProjectsPage';
import YourProjects from './components/Freelancer/YourProjects/YourProjects';
import QuotationsPage from './components/Client/QuotationsPage/QuotationsPage';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <div className="topnav">
        <div className="brand">
          <span>DeLance</span> Web3 Job Board
        </div>
        <div className="status-pill">Dark dashboard theme</div>
      </div>

      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/client" element={<Client />} />
        <Route path="/freelancer" element={<Freelancer />} />
        <Route path="/client/projects" element={<ClientProjectsPage />} />
        <Route path="/client/quotations" element={<QuotationsPage />} />
        <Route path="/freelancer/projects" element={<FreelancerProjectsPage />} />
        <Route path="/freelancer/your-projects" element={<YourProjects />} />
      </Routes>
    </div>
  );
}

export default App;

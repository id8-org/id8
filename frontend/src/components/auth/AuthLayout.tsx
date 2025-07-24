import React from 'react';
import './Auth.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  heroImageSrc: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, heroImageSrc }) => {
  return (
    <div className="auth-container">
      <div className="auth-image">
        <img src={heroImageSrc} alt="Hero" />
      </div>
      <div className="auth-form">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
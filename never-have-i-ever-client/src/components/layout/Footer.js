// src/components/layout/Footer.js
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p>© {new Date().getFullYear()} Never Have I Ever Game. All rights reserved.</p>
        <div className="mt-2 text-sm text-gray-400">
          <a href="#" className="hover:text-blue-300 mx-2">Privacy Policy</a>
          <a href="#" className="hover:text-blue-300 mx-2">Terms of Service</a>
          <a href="#" className="hover:text-blue-300 mx-2">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumb.css';

const Breadcrumb = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="Navegação de trilha">
      <div className="breadcrumb-container">
        {/* Link para Home sempre presente */}
        <Link to="/" className="breadcrumb-home" title="Início">
          <Home size={16} />
        </Link>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <React.Fragment key={index}>
              <ChevronRight size={16} className="breadcrumb-separator" />
              {isLast ? (
                <span className="breadcrumb-item current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="breadcrumb-item breadcrumb-link">
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default Breadcrumb;
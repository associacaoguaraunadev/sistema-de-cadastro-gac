import React from 'react';
import { ChevronRight } from 'lucide-react';
import './Breadcrumb.css';

const Breadcrumb = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="breadcrumb">
      <div className="breadcrumb-container">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight size={16} className="breadcrumb-separator" />
            )}
            <span 
              className={`breadcrumb-item ${
                index === items.length - 1 ? 'current' : ''
              }`}
            >
              {item.label}
            </span>
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default Breadcrumb;
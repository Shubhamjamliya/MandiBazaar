import React from 'react';

interface IconLoaderProps {
  forceShow?: boolean;
}

const IconLoader: React.FC<IconLoaderProps> = ({ forceShow = false }) => {
  // Disabled: Loading animation removed for snappier UX
  return null;
};

export default IconLoader;

import React from 'react';

const EmergencyHeader = () => {
  return (
    <div style={{
      height: '70px',
      backgroundColor: '#ff5722',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      HEADER D'URGENCE - BIM RECOVERY
    </div>
  );
};

export default EmergencyHeader;

import { Outlet } from '@umijs/max';
import React from 'react';

const Container: React.FC = () => {

  return (
    <div className="cs-overflow-y-auto cs-box-border cs-rounded-lg" style={{ height: 'calc(100vh - 120px)' }}>
      <Outlet />
    </div>
  );
};

export default Container;

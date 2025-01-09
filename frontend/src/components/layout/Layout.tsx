import React from 'react';
import { MobileNavigation, DesktopNavigation } from './Navigation';
import { AppBar, Toolbar, IconButton } from '@mui/material';
import { Menu as MenuIcon, Notifications as NotificationsIcon } from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
}

const MobileHeader: React.FC = () => (
  <AppBar 
    position="fixed" 
    color="default" 
    elevation={0}
    className="border-b border-gray-200 md:hidden"
  >
    <Toolbar className="flex justify-between items-center">
      <div className="flex items-center">
        <IconButton edge="start" color="inherit" aria-label="menu">
          <MenuIcon />
        </IconButton>
        <h1 className="text-xl font-bold text-primary ml-2">Stockit</h1>
      </div>
      <IconButton color="inherit" aria-label="notifications">
        <NotificationsIcon />
      </IconButton>
    </Toolbar>
  </AppBar>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Desktop Navigation */}
      <DesktopNavigation />

      {/* Main Content */}
      <main className={`
        flex-1 
        transition-all 
        duration-200
        pt-16 pb-20 
        md:pt-8 md:pb-8 md:pl-64
      `}>
        <div className="container-responsive">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Layout;
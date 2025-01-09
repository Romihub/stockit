import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home as HomeIcon,
  ShowChart as ChartIcon,
  Favorite as FavoriteIcon,
  AccountCircle as ProfileIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { NavigationItem } from '../../types';

const navigationItems: NavigationItem[] = [
  { label: 'Home', path: '/', icon: 'HomeIcon' },
  { label: 'Markets', path: '/markets', icon: 'ChartIcon' },
  { label: 'Search', path: '/search', icon: 'SearchIcon' },
  { label: 'Watchlist', path: '/watchlist', icon: 'FavoriteIcon' },
  { label: 'Profile', path: '/profile', icon: 'ProfileIcon' }
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'HomeIcon':
      return <HomeIcon />;
    case 'ChartIcon':
      return <ChartIcon />;
    case 'SearchIcon':
      return <SearchIcon />;
    case 'FavoriteIcon':
      return <FavoriteIcon />;
    case 'ProfileIcon':
      return <ProfileIcon />;
    default:
      return null;
  }
};

export const MobileNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="mobile-nav">
      <div className="flex justify-around items-center h-16">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full
              ${location.pathname === item.path 
                ? 'text-primary' 
                : 'text-gray-500'}`}
          >
            {getIcon(item.icon)}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export const DesktopNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="desktop-nav">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">Stockit</h1>
      </div>
      <div className="flex flex-col space-y-2 p-4">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 rounded-lg transition-colors
              ${location.pathname === item.path
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="mr-3">{getIcon(item.icon)}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
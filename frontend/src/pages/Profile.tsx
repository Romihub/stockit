import React from 'react';
import {
  Typography,
  Card,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Button,
} from '@mui/material';
import {
  Person,
  Notifications,
  Security,
  Palette,
  Language,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Typography variant="h4" component="h1" className="mb-4">
        Profile
      </Typography>

      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Person className="text-gray-500" sx={{ fontSize: 32 }} />
          </div>
          <div>
            <Typography variant="h6">{user?.name || 'User'}</Typography>
            <Typography variant="body2" color="textSecondary">
              {user?.email || 'email@example.com'}
            </Typography>
          </div>
        </div>
      </Card>

      {/* Settings Card */}
      <Card>
        <List>
          {/* Notifications */}
          <ListItem>
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="Push Notifications"
              secondary="Get alerts for price changes and predictions"
            />
            <ListItemSecondaryAction>
              <Switch edge="end" />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          {/* Security */}
          <ListItem component="button" sx={{ width: '100%', textAlign: 'left' }}>
            <ListItemIcon>
              <Security />
            </ListItemIcon>
            <ListItemText
              primary="Security Settings"
              secondary="Manage your account security"
            />
          </ListItem>

          <Divider />

          {/* Theme */}
          <ListItem component="button" sx={{ width: '100%', textAlign: 'left' }}>
            <ListItemIcon>
              <Palette />
            </ListItemIcon>
            <ListItemText
              primary="Theme"
              secondary="Change app appearance"
            />
          </ListItem>

          <Divider />

          {/* Language */}
          <ListItem component="button" sx={{ width: '100%', textAlign: 'left' }}>
            <ListItemIcon>
              <Language />
            </ListItemIcon>
            <ListItemText
              primary="Language"
              secondary="English (US)"
            />
          </ListItem>
        </List>
      </Card>

      {/* Logout Button */}
      <Button
        variant="outlined"
        color="error"
        fullWidth
        onClick={handleLogout}
        startIcon={<ExitToApp />}
        className="mt-4"
      >
        Logout
      </Button>

      {/* App Info */}
      <Typography
        variant="body2"
        color="textSecondary"
        align="center"
        className="mt-8"
      >
        Stockit v1.0.0
      </Typography>
    </div>
  );
};

export default Profile;
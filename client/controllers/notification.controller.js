// notifications.js
import { Linking } from 'react-native';
import { navigationRef } from './App';

export const setupNotificationHandler = () => {
  const handleDeepLink = (event) => {
    const url = event.url;
    if (url === 'trackplayer://notification.click') {
      navigationRef.current?.navigate('PlayerScreen');
    }
  };

  Linking.addEventListener('url', handleDeepLink);

  Linking.getInitialURL().then((url) => {
    if (url === 'trackplayer://notification.click') {
      navigationRef.current?.navigate('PlayerScreen');
    }
  });

  return () => Linking.removeEventListener('url', handleDeepLink);
};
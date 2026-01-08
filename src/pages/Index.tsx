import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';

export default function Index() {
  const navigate = useNavigate();

  return <SplashScreen onComplete={() => navigate('/auth')} />;
}

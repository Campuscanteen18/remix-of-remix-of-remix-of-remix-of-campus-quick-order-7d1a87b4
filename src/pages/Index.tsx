import { useNavigate } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';
import { useCampus } from '@/context/CampusContext';

export default function Index() {
  const navigate = useNavigate();
  const { hasCampus } = useCampus();

  // Navigate to auth if campus is set, otherwise to campus selector
  const handleComplete = () => {
    navigate(hasCampus ? '/auth' : '/select-campus');
  };

  return <SplashScreen onComplete={handleComplete} />;
}

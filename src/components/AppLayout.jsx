import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import PwaInstallBanner from './PwaInstallBanner';
import './AppLayout.css';

export default function AppLayout() {
    const location = useLocation();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const isFullScreenApp = location.pathname === '/match' || location.pathname === '/explore' || location.pathname === '/snap';
    const isMiniprofileSetup = location.pathname === '/mini-profile-setup';

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className={`app-layout ${isOffline ? 'is-offline' : ''}`}>
            {isOffline && (
                <div className="offline-status-bar">
                    📡 You are currently offline. Using cached data.
                </div>
            )}
            <PwaInstallBanner />
            {!isMiniprofileSetup && !isFullScreenApp && (
                <Navbar />
            )}
            <main className={`app-main ${isFullScreenApp ? 'full-screen' : ''}`}>
                <Outlet />
            </main>
            {!isMiniprofileSetup && <BottomNav />}
        </div>
    );
}

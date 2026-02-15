import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import './AppLayout.css';

export default function AppLayout() {
    return (
        <div className="app-layout">
            <Navbar />
            <main className="app-main">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}

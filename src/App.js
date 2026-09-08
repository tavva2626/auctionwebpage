import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HostCreateAuctionPage from './pages/HostCreateAuctionPage';
import HostAuctionPage from './pages/HostAuctionPage';
import BidderJoinPage from './pages/BidderJoinPage';
import AuctionRoomPage from './pages/AuctionRoomPage';
import MultiItemAuctionCreatePage from './pages/MultiItemAuctionCreatePage';
import MultiItemAddItemsPage from './pages/MultiItemAddItemsPage';
import MultiItemAuctionHostPage from './pages/MultiItemAuctionHostPage';
import MultiItemBidderJoinPage from './pages/MultiItemBidderJoinPage';
import MultiItemAuctionBidderPage from './pages/MultiItemAuctionBidderPage';
import './App.css';

function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      padding: '1rem',
      zIndex: 1000,
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    }}>
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text)' }}>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppHeader />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            
            {/* Single Item Auction Routes */}
            <Route path="/host/create" element={<ProtectedRoute><HostCreateAuctionPage /></ProtectedRoute>} />
            <Route path="/host/auction/:auctionId" element={<ProtectedRoute><HostAuctionPage /></ProtectedRoute>} />
            <Route path="/bid/join" element={<ProtectedRoute><BidderJoinPage /></ProtectedRoute>} />
            <Route path="/auction/:auctionId" element={<ProtectedRoute><AuctionRoomPage /></ProtectedRoute>} />
            
            {/* Multi Item Auction Routes */}
            <Route path="/host/multi-create" element={<ProtectedRoute><MultiItemAuctionCreatePage /></ProtectedRoute>} />
            <Route path="/host/multi-add-items" element={<ProtectedRoute><MultiItemAddItemsPage /></ProtectedRoute>} />
            <Route path="/host/multi-auction/:auctionId" element={<ProtectedRoute><MultiItemAuctionHostPage /></ProtectedRoute>} />
            <Route path="/bid/multi-join" element={<ProtectedRoute><MultiItemBidderJoinPage /></ProtectedRoute>} />
            <Route path="/multi-auction/:auctionId" element={<ProtectedRoute><MultiItemAuctionBidderPage /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

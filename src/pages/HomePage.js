import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function HomePage() {
  usePageTitle('Home - Dashboard');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="page home-page">
      <header className="page-header">
        <div>
          <h1>Welcome, {user?.username || 'Guest'} 👋</h1>
          <p>Choose your auction experience below</p>
        </div>
        <button className="secondary" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="card role-selection">
        <h2 style={{ margin: '0 0 1rem', textAlign: 'center' }}>Single Item Auction</h2>
        <Link to="/host/create" className="big-button">
          Host an Auction
        </Link>
        <Link to="/bid/join" className="big-button">
          Join as Bidder
        </Link>
      </section>

      <section className="card role-selection">
        <h2 style={{ margin: '0 0 1rem', textAlign: 'center' }}>Multiple Items Auction</h2>
        <Link to="/host/multi-create" className="big-button">
          Create Multi-Item Auction
        </Link>
        <Link to="/bid/multi-join" className="big-button">
          Join Multi-Item Auction
        </Link>
      </section>

      <section className="info-card">
        <h2>How it works</h2>
        <ul>
          <li>
            <strong>Single Item:</strong> As a host, create an auction for one item. Bidders join using the auction link and password, then place bids when the host starts the timer.
          </li>
          <li>
            <strong>Multiple Items:</strong> Host multiple items in one auction session. Bidders join once and bid on each item sequentially. Winner is announced for each item with the highest bid.
          </li>
          <li>
            When the auction(s) end, winners are declared and displayed with their winning bid amounts.
          </li>
        </ul>
      </section>
    </main>
  );
}


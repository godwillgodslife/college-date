import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import './StaticPageViewer.css';

export default function StaticPageViewer({ explicitSlug }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compute the clean slug to fetch
  const getSlug = useCallback(() => {
    if (explicitSlug) return explicitSlug;
    if (params.slug) return params.slug;
    
    let path = location.pathname.replace(/^\/+/, '');
    if (path.endsWith('.html')) path = path.replace(/\.html$/, '');
    return path || 'about';
  }, [explicitSlug, params.slug, location.pathname]);

  const slug = getSlug();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const targetUrl = `/${slug}.html`;

    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load page: HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((htmlText) => {
        if (!isMounted) return;

        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');

          // 1. Extract and set document title
          const titleTag = doc.querySelector('title');
          const title = titleTag?.innerText || 'The College Date';
          setPageTitle(title);
          document.title = title;

          // 2. Extract main element content
          const mainEl = doc.querySelector('main');
          if (mainEl) {
            // Remove the legacy inline nav and footer since we render PublicHeader & PublicFooter
            const legacyNav = mainEl.querySelector('nav');
            if (legacyNav) legacyNav.remove();

            const legacyFooter = mainEl.querySelector('footer');
            if (legacyFooter) legacyFooter.remove();

            setContent(mainEl.innerHTML);
          } else {
            // Fallback: entire body minus scripts
            const scripts = doc.querySelectorAll('script');
            scripts.forEach((s) => s.remove());
            setContent(doc.body.innerHTML);
          }

          setLoading(false);

          // 3. Handle hash navigation or scroll to top
          if (location.hash) {
            setTimeout(() => {
              const target = document.getElementById(location.hash.slice(1));
              if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
              }
            }, 80);
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        } catch (parseErr) {
          console.error('[StaticPageViewer] Parse error:', parseErr);
          setError('Unable to parse page content.');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[StaticPageViewer] Load error:', err);
        setError(err.message || 'Page could not be loaded.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, location.hash]);

  // Intercept internal link clicks to keep navigation inside the SPA
  const handleContentClick = useCallback(
    (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Handle on-page anchor links smoothly
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.getElementById(href.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      // Handle external links or protocol links (wa.me, mailto, etc.)
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.getAttribute('target') === '_blank'
      ) {
        return; // allow browser default
      }

      // Internal route: navigate via React Router
      e.preventDefault();
      navigate(href);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [navigate]
  );

  return (
    <div className="static-page-layout">
      <PublicHeader themeVariant="light" />

      <main className="static-page-main" onClick={handleContentClick}>
        {loading ? (
          <div className="static-page-skeleton" aria-busy="true" aria-label="Loading page content">
            <div className="skeleton-kicker" />
            <div className="skeleton-title" />
            <div className="skeleton-lede" />
            <div className="skeleton-panel" />
          </div>
        ) : error ? (
          <div className="static-page-error" role="alert">
            <h2>Page Not Found</h2>
            <p>The page you requested could not be found or is temporarily unavailable.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="static-page-retry-btn"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
              <Link to="/" className="static-page-retry-btn" style={{ textDecoration: 'none' }}>
                Return Home
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="static-page-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

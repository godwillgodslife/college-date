import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import { CONSOLIDATED_301_REDIRECTS } from '../../constants/publicSeoRoutes';
import './StaticPageViewer.css';

/**
 * Determine page category, parent backlink, and badge styling based on slug
 */
function getPageMetadata(slug) {
  if (['safety', 'campus-dating-safety', 'child-safety', 'child-safety-standards', 'romance-scams-nigerian-students', 'what-not-to-share-on-dating-apps'].includes(slug)) {
    return {
      category: 'Campus Safety',
      badge: '🛡️ CAMPUS SAFETY',
      parentName: 'Safety Center',
      parentHref: '/safety'
    };
  }
  if (['privacy', 'terms', 'delete-account'].includes(slug)) {
    return {
      category: 'Trust & Standards',
      badge: '🔒 LEGAL & TRUST',
      parentName: 'Safety Center',
      parentHref: '/safety'
    };
  }
  if (['about', 'support', 'download', 'press', 'faq'].includes(slug)) {
    return {
      category: 'The Platform',
      badge: '🏛️ CAMPUS SOCIAL',
      parentName: 'Home',
      parentHref: '/'
    };
  }
  if (slug === 'how-it-works') {
    return {
      category: 'Getting Started',
      badge: '✨ HOW IT WORKS',
      parentName: 'Home',
      parentHref: '/'
    };
  }
  if (slug.startsWith('blog/') || slug === 'blog') {
    return {
      category: 'Campus Blog',
      badge: '📝 DATING GUIDES',
      parentName: 'All Guides',
      parentHref: '/blog'
    };
  }
  return {
    category: 'Student Advice',
    badge: '🎓 CAMPUS DATING',
    parentName: 'Guides & Advice',
    parentHref: '/blog'
  };
}

export default function StaticPageViewer({ explicitSlug }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Compute the clean slug to fetch
  const getSlug = useCallback(() => {
    if (explicitSlug) return explicitSlug;
    if (params.slug) return params.slug;
    
    let path = location.pathname.replace(/^\/+/, '');
    if (path.endsWith('.html')) path = path.replace(/\.html$/, '');
    return path || 'about';
  }, [explicitSlug, params.slug, location.pathname]);

  const slug = getSlug();
  const meta = useMemo(() => getPageMetadata(slug), [slug]);

  // Estimate read time based on text length
  const readTime = useMemo(() => {
    if (!content) return 3;
    const plainText = content.replace(/<[^>]+>/g, ' ');
    const wordCount = plainText.trim().split(/\s+/).length;
    return Math.max(2, Math.ceil(wordCount / 200));
  }, [content]);

  useEffect(() => {
    if (CONSOLIDATED_301_REDIRECTS[slug]) {
      navigate(CONSOLIDATED_301_REDIRECTS[slug], { replace: true });
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fileSlug = slug === 'child-safety' ? 'child-safety-standards' : slug;
    const targetUrl = `/${fileSlug}.html`;

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
            // Remove the legacy inline primary nav and footer since we render modern PublicHeader & PublicFooter
            const legacyNav = mainEl.querySelector('nav:not(.toc)');
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
                const yOffset = -90;
                const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }, 120);
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

  // Copy current URL to clipboard with feedback
  const handleShare = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }, []);

  // Universal click interceptor: handles relative links, absolute domain links, hash jumps, and buttons
  const handleContentClick = useCallback(
    (e) => {
      // 1. Handle interactive buttons inside content
      const button = e.target.closest('button');
      if (button) {
        const dataHref = button.getAttribute('data-href');
        if (dataHref) {
          e.preventDefault();
          navigate(dataHref);
          return;
        }
        if (button.getAttribute('data-action') === 'back') {
          e.preventDefault();
          navigate(-1);
          return;
        }
        return;
      }

      // 2. Handle interactive anchor links
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;

      // Handle on-page anchor jump smoothly with header offset
      if (rawHref.startsWith('#')) {
        e.preventDefault();
        const targetId = rawHref.slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          const yOffset = -90;
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          window.history.replaceState(null, '', `#${targetId}`);
        }
        return;
      }

      // External protocol links (WhatsApp, email, tel)
      if (
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('sms:') ||
        rawHref.includes('wa.me')
      ) {
        return; // Allow standard browser handling
      }

      // Parse absolute vs relative URLs
      let targetPath = rawHref;
      try {
        if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
          const urlObj = new URL(targetPath);
          const isOurHost = 
            urlObj.hostname === window.location.hostname ||
            urlObj.hostname === 'www.thecollegedate.com' ||
            urlObj.hostname === 'thecollegedate.com' ||
            urlObj.hostname === 'localhost' ||
            urlObj.hostname === '127.0.0.1';

          if (isOurHost) {
            targetPath = urlObj.pathname + urlObj.search + urlObj.hash;
          } else {
            // Truly external third-party link
            return;
          }
        }
      } catch {
        // Continue with targetPath
      }

      // Strip .html extension if present
      targetPath = targetPath.replace(/\.html(\?|#|$)/, '$1');

      // Ensure leading slash for client routing
      if (!targetPath.startsWith('/') && !targetPath.startsWith('#')) {
        targetPath = '/' + targetPath;
      }

      // Smooth internal navigation
      e.preventDefault();
      navigate(targetPath);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [navigate]
  );

  return (
    <div className="static-page-layout">
      <PublicHeader themeVariant="light" />

      {/* ── EDITORIAL BREADCRUMB & BACKLINK BAR ── */}
      <div className="editorial-backlink-bar">
        <div className="editorial-backlink-container">
          <div className="editorial-backlink-left">
            <Link to={meta.parentHref} className="editorial-back-button" aria-label={`Back to ${meta.parentName}`}>
              <span className="back-arrow">←</span>
              <span>Back to {meta.parentName}</span>
            </Link>
            <span className="editorial-crumb-divider">/</span>
            <span className="editorial-category-badge">{meta.badge}</span>
          </div>

          <div className="editorial-backlink-right">
            <span className="editorial-meta-pill">⏱️ {readTime} min read</span>
            <span className="editorial-meta-pill verified-pill">🎓 Student Verified</span>
            <button
              type="button"
              className="editorial-share-button"
              onClick={handleShare}
              title="Copy page link"
              aria-label="Copy page link"
            >
              {copied ? '✓ Copied link' : '🔗 Share'}
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
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
            <div className="error-icon">🧭</div>
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

      {/* ── EDITORIAL BOTTOM ACTION BAR ── */}
      {!loading && !error && (
        <div className="editorial-bottom-bar">
          <div className="editorial-bottom-container">
            <Link to="/blog" className="editorial-bottom-link">
              ← Browse All Dating Guides & Advice
            </Link>
            <button
              type="button"
              className="editorial-back-to-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              ↑ Back to top
            </button>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}

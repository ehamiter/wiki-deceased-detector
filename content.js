// Wikipedia Deceased Detector
(() => {
  // Prevent double loading
  if (window.wikiDeceasedLoaded) return;
  window.wikiDeceasedLoaded = true;

  console.log('[WikiDeceased] Starting extension...');

  // Config
  const DEBUG = true;
  const log = (...args) => DEBUG && console.log('[WikiDeceased]', ...args);
  const API_BASE = location.origin + '/api/rest_v1/page/summary/';
  const REQUEST_DELAY = 200; // 200ms between requests (faster)
  const MAX_CONCURRENT = 4;  // Max 4 requests at once (increased)
  
  // Cache for results
  const cache = new Map();
  
  // Rate limiting
  let lastRequestTime = 0;
  let activeRequests = 0;
  const requestQueue = [];

  // Style settings (will be loaded from storage)
  let styleSettings = {
    textColor: '#b31b00',
    fontWeight: 600,
    textDecoration: 'dashed underline',
    opacity: 0.7,
    backgroundColor: '#ffffff',
    useBackground: false,
    customCSS: ''
  };

  // Load style settings and inject CSS
  function loadStyleSettings() {
    chrome.storage.sync.get(styleSettings, function(settings) {
      styleSettings = settings;
      injectCustomCSS();
      log('Style settings loaded:', settings);
    });
  }

  // Inject dynamic CSS based on user settings
  function injectCustomCSS() {
    // Remove existing style if present
    const existingStyle = document.getElementById('wikideceased-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create CSS rule
    let cssRule = `
      a.wikideceased,
      a.wikideceased:visited,
      a.wikideceased:hover,
      a.wikideceased:active {
        color: ${styleSettings.textColor} !important;
        font-weight: ${styleSettings.fontWeight} !important;
        text-decoration: ${styleSettings.textDecoration} !important;
        opacity: ${styleSettings.opacity} !important;
    `;

    if (styleSettings.useBackground) {
      cssRule += `
        background-color: ${styleSettings.backgroundColor} !important;
        padding: 2px 4px !important;
        border-radius: 2px !important;
      `;
    }

    if (styleSettings.customCSS) {
      cssRule += styleSettings.customCSS;
    }

    cssRule += `
      }
    `;

    // Inject the CSS
    const styleElement = document.createElement('style');
    styleElement.id = 'wikideceased-styles';
    styleElement.textContent = cssRule;
    document.head.appendChild(styleElement);
  }
  
  // Load cache from sessionStorage
  try {
    const stored = sessionStorage.getItem('wiki-deceased-cache');
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([title, status]) => cache.set(title, status));
    }
  } catch (e) {
    log('Cache load error:', e);
  }

  // Save cache to sessionStorage
  function saveCache() {
    try {
      const data = Object.fromEntries(cache.entries());
      sessionStorage.setItem('wiki-deceased-cache', JSON.stringify(data));
    } catch (e) {
      log('Cache save error:', e);
    }
  }

  // Extract Wikipedia title from link href
  function getTitleFromHref(href) {
    if (!href) return null;
    
    try {
      const url = new URL(href, location.origin);
      
      // Must be a Wikipedia article link
      if (!url.pathname.startsWith('/wiki/')) return null;
      
      // Skip special pages, talk pages, etc.
      const title = url.pathname.replace('/wiki/', '');
      if (title.includes(':')) return null; // Skip Talk:, User:, etc.
      if (url.searchParams.get('redlink') === '1') return null; // Skip non-existent pages
      if (url.hash) return null; // Skip section links
      
      return decodeURIComponent(title);
    } catch (e) {
      return null;
    }
  }

  // Check if person is deceased based on API response
  function isDeceased(summary) {
    if (!summary) return false;
    
    const description = summary.description || '';
    const extract = summary.extract_html || '';
    
    // Look for birth-death dates like (1920–1995)
    if (/\(\s*\d{4}\s*[–-]\s*\d{4}\s*\)/.test(description)) {
      log('Found death date pattern in description:', description);
      return true;
    }
    
    // Look for "was a/an" pattern in extract (indicates past tense)
    if (/>\s*was\s+(a|an)\b/i.test(extract.substring(0, 200))) {
      log('Found "was a/an" pattern in extract');
      return true;
    }
    
    return false;
  }

  // Fetch person info from Wikipedia API with rate limiting
  async function fetchPersonInfo(title, callback) {
    if (cache.has(title)) {
      log('Using cached result for:', title);
      const result = cache.get(title);
      if (callback) callback(result);
      return result;
    }

    // Add to queue with callback for immediate processing
    return new Promise((resolve) => {
      requestQueue.push({ title, resolve, callback });
      processQueue();
    });
  }

  // Process the request queue with rate limiting
  async function processQueue() {
    if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) {
      return;
    }

    const { title, resolve, callback } = requestQueue.shift();
    activeRequests++;

    // Ensure minimum delay between requests
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise(r => setTimeout(r, REQUEST_DELAY - timeSinceLastRequest));
    }

    try {
      log('Fetching info for:', title);
      const url = API_BASE + encodeURIComponent(title);
      lastRequestTime = Date.now();
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WikipediaDeceasedDetector/1.0',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        log('API error for', title, ':', response.status);
        resolve(null);
        if (callback) callback(null);
        return;
      }

      const data = await response.json();
      const deceased = isDeceased(data);
      
      log('Result for', title, ':', deceased ? 'DECEASED' : 'LIVING');
      
      // Cache the result
      cache.set(title, deceased);
      saveCache();
      
      // Call callback immediately for instant decoration
      if (callback) callback(deceased);
      resolve(deceased);
    } catch (error) {
      log('Fetch error for', title, ':', error);
      resolve(null);
      if (callback) callback(null);
    } finally {
      activeRequests--;
      // Process next item in queue immediately
      processQueue();
    }
  }

  // Style a link as deceased
  function markAsDeceased(link) {
    link.classList.add('wikideceased');
    if (!link.title.includes('deceased')) {
      link.title = link.title ? link.title + ' • deceased' : 'deceased';
    }
  }

  // Process a single link with immediate callback
  function processLink(link) {
    const href = link.getAttribute('href');
    const title = getTitleFromHref(href);
    
    if (!title) return;
    
    // Use callback to immediately decorate when result comes back
    fetchPersonInfo(title, (deceased) => {
      if (deceased) {
        markAsDeceased(link);
        log('Marked as deceased:', link.textContent, '(' + title + ')');
      }
    });
  }

  // Process links in batches for better performance
  function processLinksBatch(links, batchSize = 10) {
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      
      // Process batch immediately, no artificial delays
      setTimeout(() => {
        batch.forEach(link => {
          link.setAttribute('data-processed', 'true');
          processLink(link);
        });
        log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(links.length/batchSize)} (${batch.length} links)`);
      }, 0); // Use setTimeout(0) to prevent blocking the UI
    }
  }

  // Check if a link is inside a preview container
  function isInPreviewContainer(element) {
    // Check for common preview container selectors
    const previewSelectors = [
      '.mwe-popups',           // Wikipedia page previews
      '.popover',              // General popover containers
      '.preview',              // Generic preview containers
      '.tooltip',              // Tooltip containers
      '.hovercard',            // Hovercard containers
      '.navbox',               // Navigation boxes
      '[role="tooltip"]',      // ARIA tooltip role
      '[class*="preview"]',    // Any class containing "preview"
      '[class*="popup"]',      // Any class containing "popup"
      '[class*="popover"]'     // Any class containing "popover"
    ];
    
    // Check if the element or any parent matches preview selectors
    let current = element;
    while (current && current !== document.body) {
      for (const selector of previewSelectors) {
        try {
          if (current.matches && current.matches(selector)) {
            log('Link excluded - found in preview container:', selector);
            return true;
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
      current = current.parentElement;
    }
    
    return false;
  }

  // Find and process all Wikipedia links
  function processAllLinks() {
    const links = document.querySelectorAll('a[href*="/wiki/"]:not([data-processed])');
    log('Found', links.length, 'Wikipedia links to process');
    
    const validLinks = Array.from(links).filter(link => {
      // Skip links in preview containers
      if (isInPreviewContainer(link)) {
        link.setAttribute('data-processed', 'true'); // Mark as processed to avoid reprocessing
        return false;
      }
      return true;
    });
    
    log('After filtering preview containers:', validLinks.length, 'valid links to process');
    
    if (validLinks.length > 0) {
      // Process in batches for immediate visual feedback
      processLinksBatch(validLinks);
    }
  }

  // Wait for page to be ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    log('Page ready, loading styles and processing links...');
    loadStyleSettings();
    processAllLinks();
    
    // Watch for dynamically added links
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      // Check if any mutations contain new Wikipedia links outside of preview containers
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Skip if the added node is or is within a preview container
              if (isInPreviewContainer(node)) {
                continue;
              }
              
              // Check if this node or its descendants contain Wikipedia links
              const hasWikiLinks = node.matches && node.matches('a[href*="/wiki/"]') || 
                                 node.querySelectorAll && node.querySelectorAll('a[href*="/wiki/"]').length > 0;
              
              if (hasWikiLinks) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        if (shouldProcess) break;
      }
      
      if (shouldProcess) {
        log('DOM changed with new Wikipedia links outside preview containers, processing...');
        processAllLinks();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Listen for storage changes to update styles in real-time
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync') {
      log('Settings changed, updating styles...');
      loadStyleSettings();
    }
  });

  // Start the extension
  init();
  
  // Debug function for console
  window.wikiDeceasedDebug = () => ({
    cache: Object.fromEntries(cache.entries()),
    processedLinks: document.querySelectorAll('[data-processed]').length,
    deceasedLinks: document.querySelectorAll('.wikideceased').length,
    queueLength: requestQueue.length,
    activeRequests: activeRequests,
    requestDelay: REQUEST_DELAY,
    maxConcurrent: MAX_CONCURRENT,
    styleSettings: styleSettings
  });
  
  log('Extension loaded successfully');
})();

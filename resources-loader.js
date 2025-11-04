function loadCommonResources() {
  const head = document.head;
  
  // Set canonical URL to current page
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = window.location.href;
  head.appendChild(canonical);
  
  // Favicon sizes
  const iconSizes = [16, 32, 48, 64, 192, 512];
  iconSizes.forEach(size => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = `${size}x${size}`;
    link.href = `/Tklesson1-${size}x${size}.png`;
    head.appendChild(link);
  });
  
  // Apple touch icon
  const appleIcon = document.createElement('link');
  appleIcon.rel = 'apple-touch-icon';
  appleIcon.href = '/Tklesson1-192x192.png';
  head.appendChild(appleIcon);
  
  // Theme color
  const themeMeta = document.createElement('meta');
  themeMeta.name = 'theme-color';
  themeMeta.content = '#ffffff';
  head.appendChild(themeMeta);
  
  // Google Analytics - load immediately, not on window.load
  const gaScript = document.createElement('script');
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-99H54WVS80';
  gaScript.async = true;
  head.appendChild(gaScript);
  
  const inlineGA = document.createElement('script');
  inlineGA.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-99H54WVS80');
  `;
  head.appendChild(inlineGA);
}

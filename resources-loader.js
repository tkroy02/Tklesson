function loadCommonResources() {
  const head = document.head;

  // Meta tags & icons
  const links = `
    <link rel="canonical" href="https://tklesson.com/" />
    <link rel="icon" type="image/png" sizes="16x16" href="/Tklesson1-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/Tklesson1-32x32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/Tklesson1-48x48.png">
    <link rel="icon" type="image/png" sizes="64x64" href="/Tklesson1-64x64.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/Tklesson1-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/Tklesson1-512x512.png">
    <link rel="apple-touch-icon" href="/Tklesson1-192x192.png">
    <meta name="theme-color" content="#ffffff">
  `;
  head.insertAdjacentHTML("beforeend", links);

  // Google Analytics script
  const gaScript = document.createElement("script");
  gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-99H54WVS80";
  gaScript.async = true;
  document.head.appendChild(gaScript);

  const inlineGA = document.createElement("script");
  inlineGA.text = `
    window.addEventListener('load', function() {
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-99H54WVS80');
    });
  `;
  document.head.appendChild(inlineGA);
}

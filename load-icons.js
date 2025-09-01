// load-icons.js
fetch('icons.html')
  .then(response => response.text())
  .then(html => {
    const head = document.head;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    while (tempDiv.firstChild) {
      head.appendChild(tempDiv.firstChild);
    }
  });
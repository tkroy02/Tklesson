// ═══════════════════════════════════════
// INSTALL MODAL
// ═══════════════════════════════════════
const installBtn = document.getElementById('install-btn');
const modalOverlay = document.getElementById('install-modal-overlay');

if (installBtn && modalOverlay) {
    installBtn.addEventListener('click', () => {
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    function closeInstallModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeInstallModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeInstallModal();
        }
    });
}

// ═══════════════════════════════════════
// NAVIGATION LOGIC
// ═══════════════════════════════════════
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector("#navMenu");
const dropdowns = document.querySelectorAll(".dropdown");

if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("open");
        hamburger.setAttribute("aria-expanded", isOpen);
    });
}

dropdowns.forEach(dropdown => {
    const dropbtn = dropdown.querySelector('.dropbtn');
    if (dropbtn) {
        dropbtn.addEventListener('click', (e) => {
            if (window.innerWidth <= 1200) {
                e.preventDefault();
                const isOpen = dropdown.classList.toggle('active');
                dropbtn.setAttribute('aria-expanded', isOpen);
            }
        });
    }
});

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1200) {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
                const dropbtn = dropdown.querySelector('.dropbtn');
                if (dropbtn) dropbtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
});

dropdowns.forEach(dropdown => {
    const dropbtn = dropdown.querySelector('.dropbtn');
    dropdown.addEventListener('mouseenter', () => {
        if (window.innerWidth > 1200 && dropbtn) dropbtn.setAttribute('aria-expanded', 'true');
    });
    dropdown.addEventListener('mouseleave', () => {
        if (window.innerWidth > 1200 && dropbtn) dropbtn.setAttribute('aria-expanded', 'false');
    });
});

document.querySelectorAll('#navMenu > a:not(.dropbtn)').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 1200 && navMenu && navMenu.classList.contains('open')) {
            navMenu.classList.remove('open');
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }
    });
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 1200 && navMenu && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }
});

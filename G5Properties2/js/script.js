// Future JavaScript functionality can be added here.
// For example, form validation or dynamic content loading.

document.addEventListener('DOMContentLoaded', function () {
    // Example: Smooth scroll for internal links
    const navLinks = document.querySelectorAll('.nav-link');

    for (const link of navLinks) {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    // Example: Add a subtle animation to cards on scroll
    const cards = document.querySelectorAll('.card');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = `fadeInUp 1s ${entry.target.dataset.delay || ''}`;
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach((card, index) => {
        card.dataset.delay = `${index * 100}ms`;
        observer.observe(card);
    });
});

// Add a keyframe animation for the fade-in effect
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;
document.head.appendChild(style);

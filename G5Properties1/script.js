// G5 Properties - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Header scroll effect
    const header = document.querySelector('.header');

    function handleScroll() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    const formSuccess = document.getElementById('form-success');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Basic validation
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                alert('Please fill in all required fields.');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            // Collect form data
            const formData = {
                name: name,
                email: email,
                phone: document.getElementById('phone').value.trim(),
                propertyAddress: document.getElementById('property-address').value.trim(),
                message: message
            };

            // Log form data (in production, this would be sent to a server)
            console.log('Form submitted:', formData);

            // Show success message
            contactForm.style.display = 'none';
            formSuccess.style.display = 'block';

            // Optional: Reset form after delay
            setTimeout(function() {
                contactForm.reset();
            }, 1000);
        });
    }

    // Intersection Observer for animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.service-card, .process-step, .stat').forEach(el => {
        observer.observe(el);
    });

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .service-card,
        .process-step,
        .stat {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .service-card.animate-in,
        .process-step.animate-in,
        .stat.animate-in {
            opacity: 1;
            transform: translateY(0);
        }

        .service-card:nth-child(2),
        .process-step:nth-child(2) {
            transition-delay: 0.1s;
        }

        .service-card:nth-child(3),
        .process-step:nth-child(3) {
            transition-delay: 0.2s;
        }

        .service-card:nth-child(4),
        .process-step:nth-child(4) {
            transition-delay: 0.3s;
        }

        .stat:nth-child(2) {
            transition-delay: 0.15s;
        }

        .stat:nth-child(3) {
            transition-delay: 0.3s;
        }
    `;
    document.head.appendChild(style);

    // Image Gallery
    const galleryImage = document.getElementById('gallery-image');
    const galleryPrev = document.querySelector('.gallery-prev');
    const galleryNext = document.querySelector('.gallery-next');
    const galleryCurrent = document.getElementById('gallery-current');
    const galleryTotal = document.getElementById('gallery-total');

    if (galleryImage && galleryPrev && galleryNext) {
        const totalImages = 90;
        let currentImage = 1;
        let autoSlideInterval;

        function updateGallery() {
            galleryImage.style.opacity = '0';
            setTimeout(() => {
                galleryImage.src = `images/G5Prop (${currentImage}).jpg`;
                galleryImage.style.opacity = '1';
            }, 150);
            if (galleryCurrent) {
                galleryCurrent.textContent = currentImage;
            }
        }

        function nextImage() {
            currentImage = currentImage >= totalImages ? 1 : currentImage + 1;
            updateGallery();
        }

        function prevImage() {
            currentImage = currentImage <= 1 ? totalImages : currentImage - 1;
            updateGallery();
        }

        function startAutoSlide() {
            autoSlideInterval = setInterval(nextImage, 4000);
        }

        function stopAutoSlide() {
            clearInterval(autoSlideInterval);
        }

        galleryNext.addEventListener('click', () => {
            stopAutoSlide();
            nextImage();
            startAutoSlide();
        });

        galleryPrev.addEventListener('click', () => {
            stopAutoSlide();
            prevImage();
            startAutoSlide();
        });

        // Pause on hover
        const galleryMain = document.querySelector('.gallery-main');
        if (galleryMain) {
            galleryMain.addEventListener('mouseenter', stopAutoSlide);
            galleryMain.addEventListener('mouseleave', startAutoSlide);
        }

        // Start auto-slide
        startAutoSlide();

        // Update total count
        if (galleryTotal) {
            galleryTotal.textContent = totalImages;
        }
    }
});

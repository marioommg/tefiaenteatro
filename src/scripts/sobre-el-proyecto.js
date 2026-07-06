// Intersection Observer for fade-in animations
const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.15,
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, observerOptions);

// Specific observer for timeline items to animate them as they appear
const timelineObserverOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.2,
};

const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            timelineObserver.unobserve(entry.target); // Only animate once
        }
    });
}, timelineObserverOptions);





// Timeline Scroll Animation
function initTimelineScroll() {
    const timeline = document.querySelector(".timeline");
    const lineFilled = document.querySelector(".timeline-line-filled");
    const items = document.querySelectorAll(".timeline-item");

    if (!timeline || !lineFilled) return;

    // Cast to HTMLElement for TS safety if needed, though in vanilla JS inside Astro it's loose.
    // However, to satisfy the linter seen previously:
    const lineFilledEl = lineFilled;

    function updateTimeline() {
        if (!timeline) return;
        const rect = timeline.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const center = windowHeight / 2;

        // Calculate progress: how far the timeline top is from the center of viewport
        let progress = center - rect.top;

        // Clamp progress
        if (progress < 0) progress = 0;
        if (progress > rect.height) progress = rect.height;

        lineFilledEl.style.height = `${progress}px`;

        // Activate items based on their position relative to center
        items.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            // Check if the item's dot (approx 2.5rem down) is passed the center
            // 2.5rem is approx 40px.
            const dotOffset = 40;
            const itemDotY = itemRect.top + dotOffset;

            if (itemDotY < center) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }

    window.addEventListener("scroll", updateTimeline, { passive: true });
    updateTimeline(); // Initial check
}

// Run on initial load and Astro page transitions
const initAnimations = () => {
    const sections = document.querySelectorAll(".fade-section");
    sections.forEach((section) => observer.observe(section));

    const timelineItems = document.querySelectorAll(".timeline-anim-item");
    timelineItems.forEach((item) => timelineObserver.observe(item));

    document.querySelectorAll("[data-initial-visible]").forEach((el) => {
        el.classList.add("visible");
    });

    initTimelineScroll();
    initAutoScroll();
};

// Auto-scroll past hero section
function initAutoScroll() {
    let hasAutoScrolled = false;
    let isScrollingProgrammatically = false;

    function smoothScrollTo(targetY, duration) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let startTimestamp = null;

        function step(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // easeInOutQuad
            const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            window.scrollTo(0, startY + diff * ease);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setTimeout(() => {
                    isScrollingProgrammatically = false;
                }, 50);
            }
        }
        window.requestAnimationFrame(step);
    }

    function scrollToRecorrido() {
        const recorridoSection = document.getElementById('recorrido');
        if (recorridoSection) {
            isScrollingProgrammatically = true;

            // Adjust offset to accommodate sticky header if needed.
            const headerOffset = 100;
            const elementPosition = recorridoSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            smoothScrollTo(offsetPosition, 800); // 800ms duration
            hasAutoScrolled = true;
        }
    }

    window.addEventListener('scroll', () => {
        if (isScrollingProgrammatically) return;

        const scrollY = window.scrollY;

        if (!hasAutoScrolled && scrollY > 50 && scrollY < window.innerHeight * 0.5) {
            scrollToRecorrido();
        }

        if (scrollY === 0) {
            hasAutoScrolled = false;
        }
    }, { passive: true });

    // Make the arrow indicator clickable
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.style.cursor = 'pointer';
        scrollIndicator.addEventListener('click', () => {
            // For the click interaction, skip the threshold trigger check and force variables so it works properly
            if (!isScrollingProgrammatically) {
                hasAutoScrolled = true;
                scrollToRecorrido();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", initAnimations);
document.addEventListener("astro:page-load", initAnimations);

/**
 * Slider Logic
 * Handles touch events, navigation, and autoplay for the gallery slider.
 */

export function initSlider(sliderEl) {
    const slider = sliderEl;
    const slides = Array.from(slider.querySelectorAll('.slide'));
    const dots = Array.from(slider.querySelectorAll('.dot'));
    const btnPrev = slider.querySelector('.nav.prev');
    const btnNext = slider.querySelector('.nav.next');
    let index = 0;
    let timer = 0;
    const interval = parseInt(slider.getAttribute('data-interval') || '4000', 10);
    const vipSlideInterval = interval * 2.5; // La última slide dura 2.5x más
    const autoplay = slider.getAttribute('data-autoplay') !== 'false';

    function show(i) {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, si) => s.classList.toggle('active', si === index));
        dots.forEach((d, di) => d.classList.toggle('active', di === index));
    }
    function next() { show(index + 1); }
    function prev() { show(index - 1); }
    function start() {
        if (!autoplay) return;
        stop();
        // Si estamos en la última slide (VIP), usar intervalo más largo
        const isVipSlide = index === slides.length - 1;
        const currentInterval = isVipSlide ? vipSlideInterval : interval;
        timer = window.setInterval(next, currentInterval);
    }
    function stop() { if (timer) { clearInterval(timer); timer = 0; } }

    const onPrev = () => { prev(); start(); };
    const onNext = () => { next(); start(); };
    btnPrev?.addEventListener('click', onPrev);
    btnNext?.addEventListener('click', onNext);
    const dotHandlers = [];
    dots.forEach((d, di) => {
        const h = () => { show(di); start(); };
        dotHandlers.push(h);
        d.addEventListener('click', h);
    });

    const onMouseEnter = () => stop();
    const onMouseLeave = () => start();
    slider.addEventListener('mouseenter', onMouseEnter);
    slider.addEventListener('mouseleave', onMouseLeave);
    const onKey = (e) => {
        if (e.key === 'ArrowRight') { next(); start(); }
        if (e.key === 'ArrowLeft') { prev(); start(); }
    };
    slider.addEventListener('keydown', onKey);
    slider.setAttribute('tabindex', '0');

    // Swipe gestures (pointer events)
    let isPointerDown = false;
    let startX = 0;
    let deltaX = 0;
    let startT = 0;
    const SWIPE_THRESHOLD = 50; // px
    const SWIPE_TIME_MAX = 1000; // ms

    function onPointerDown(e) {
        isPointerDown = true;
        startX = e.clientX;
        deltaX = 0;
        startT = Date.now();
        stop();
        slider.classList.add('dragging');
    }
    function onPointerMove(e) {
        if (!isPointerDown) return;
        deltaX = e.clientX - startX;
    }
    function onPointerUp() {
        if (!isPointerDown) return;
        isPointerDown = false;
        slider.classList.remove('dragging');
        const elapsed = Date.now() - startT;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD && elapsed < SWIPE_TIME_MAX) {
            if (deltaX < 0) next(); else prev();
        }
        start();
        deltaX = 0;
    }

    slider.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Initialize
    show(0);
    start();

    // Cleanup for this slider
    return () => {
        stop();
        btnPrev?.removeEventListener('click', onPrev);
        btnNext?.removeEventListener('click', onNext);
        dots.forEach((d, i) => d.removeEventListener('click', dotHandlers[i]));
        slider.removeEventListener('mouseenter', onMouseEnter);
        slider.removeEventListener('mouseleave', onMouseLeave);
        slider.removeEventListener('keydown', onKey);
        slider.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };
}

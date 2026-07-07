window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const popup = document.getElementById('artist-popup');
    const body = document.body;

    setTimeout(() => {
        if (hasSeenPopupThisSession()) {
            body.classList.remove('loading');
        } else {
            popup?.classList.remove('hidden');
        }
        setTimeout(() => {
            loader.classList.add('hide');
        }, 150);
    }, 1200);
});

const popupSeenKey = 'disenYouPopupSeen';

function hasSeenPopupThisSession() {
    return window.sessionStorage.getItem(popupSeenKey) === '1';
}

document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('artist-popup');
    const closeButton = document.getElementById('closePopup');
    const enterButton = document.getElementById('enterGallery');
    const body = document.body;

    const closePopup = () => {
        popup.classList.add('hidden');
        body.classList.remove('no-scroll');
        body.classList.remove('loading');
        window.sessionStorage.setItem(popupSeenKey, '1');
    };

    closeButton?.addEventListener('click', closePopup);
    enterButton?.addEventListener('click', closePopup);
    popup?.addEventListener('click', (event) => {
        if (event.target === popup) {
            closePopup();
        }
    });
});

/* ==========================================================================
   MY TRAIL v2 · 懸浮空靈 3D 展廊與選單互動邏輯
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       1. Navigation & Page Tab Switching
       ========================================================================== */
    const navItems = document.querySelectorAll('.nav-item');
    const pageTabs = document.querySelectorAll('.page-tab');

    function switchTab(targetTabId) {
        navItems.forEach(item => {
            if (item.dataset.tab === targetTabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        pageTabs.forEach(tab => {
            if (tab.id === targetTabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (targetTabId === 'gallery') {
            setTimeout(update3DPositions, 100);
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    /* ==========================================================================
       2. 3D Cylindrical Ring Carousel Engine (間距緊湊、兩側可見、懸浮空靈)
       ========================================================================== */
    const ring3D = document.getElementById('ring3D');
    const stageWrapper = document.getElementById('stageWrapper');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const exhibitCards = document.querySelectorAll('.exhibit-card');

    const totalExhibits = exhibitCards.length;
    const angleStep = 360 / totalExhibits;

    // 縮小 3D 半徑帶亮兩側作品 (間距更緊湊，能看見兩側作品)
    function getRadius() {
        const width = window.innerWidth <= 768 ? 210 : 240;
        return Math.round((width / 2) / Math.tan(Math.PI / totalExhibits)) + 30;
    }

    let radius = getRadius();
    let currentRotation = 0;
    let targetRotation = 0;
    let isDragging = false;
    let startX = 0;
    let dragRotationStart = 0;
    let activeIndex = 0;

    function layoutExhibits() {
        radius = getRadius();
        exhibitCards.forEach((card, index) => {
            const angle = index * angleStep;
            card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        });
    }

    // 平滑轉動 (lerp = 0.035)
    function animateRing() {
        currentRotation += (targetRotation - currentRotation) * 0.035;
        ring3D.style.transform = `rotateY(${currentRotation}deg)`;

        const normalizedRotation = (-currentRotation % 360 + 360) % 360;
        let calculatedIndex = Math.round(normalizedRotation / angleStep) % totalExhibits;
        if (calculatedIndex < 0) calculatedIndex += totalExhibits;

        if (calculatedIndex !== activeIndex) {
            activeIndex = calculatedIndex;
            updateActiveState();
        }

        requestAnimationFrame(animateRing);
    }

    // 中間聚焦放大，兩側作品呈現，說明卡淡入淡出（無收合）
    function updateActiveState() {
        exhibitCards.forEach((card, index) => {
            if (index === activeIndex) {
                card.classList.add('is-center');
                card.classList.remove('is-side');
            } else {
                card.classList.remove('is-center');
                card.classList.add('is-side');
            }
        });
    }

    function update3DPositions() {
        layoutExhibits();
        updateActiveState();
    }

    // 箭頭控制
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            targetRotation += angleStep;
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            targetRotation -= angleStep;
        });
    }

    // 鍵盤操控
    document.addEventListener('keydown', (e) => {
        const galleryTab = document.getElementById('gallery');
        if (galleryTab && galleryTab.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                targetRotation += angleStep;
            } else if (e.key === 'ArrowRight') {
                targetRotation -= angleStep;
            }
        }
    });

    // 點擊作品卡片跳出 PDF Modal
    exhibitCards.forEach(card => {
        card.addEventListener('click', () => {
            const pdfUrl = card.dataset.pdf;
            if (pdfUrl) {
                openPDFModal(pdfUrl);
            }
        });
    });

    // 拖曳手勢
    if (stageWrapper) {
        stageWrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            dragRotationStart = targetRotation;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            targetRotation = dragRotationStart + (deltaX * 0.3);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                targetRotation = Math.round(targetRotation / angleStep) * angleStep;
            }
        });

        stageWrapper.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            dragRotationStart = targetRotation;
        }, { passive: true });

        stageWrapper.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - startX;
            targetRotation = dragRotationStart + (deltaX * 0.3);
        }, { passive: true });

        stageWrapper.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                targetRotation = Math.round(targetRotation / angleStep) * angleStep;
            }
        });
    }

    layoutExhibits();
    updateActiveState();
    animateRing();

    window.addEventListener('resize', layoutExhibits);

    /* ==========================================================================
       3. PDF Exhibition Modal (純淨 Canvas 展覽模式：徹底去除下載/列印/側邊欄)
       ========================================================================== */
    const pdfModal = document.getElementById('pdfModal');
    const pdfFrame = document.getElementById('pdfModalFrame');
    const pdfModalClose = document.getElementById('pdfModalClose');
    const canvasContainer = document.getElementById('pdfCanvasContainer');

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async function openPDFModal(pdfUrl) {
        if (!pdfUrl) return;
        pdfModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        if (typeof pdfjsLib !== 'undefined' && canvasContainer) {
            canvasContainer.style.display = 'flex';
            if (pdfFrame) pdfFrame.style.display = 'none';
            canvasContainer.innerHTML = '<div class="pdf-loading">載入作品展覽 PDF 中...</div>';

            try {
                const cleanPdfUrl = pdfUrl.split('#')[0];
                const loadingTask = pdfjsLib.getDocument(cleanPdfUrl);
                const pdf = await loadingTask.promise;
                canvasContainer.innerHTML = '';

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const canvas = document.createElement('canvas');
                    canvas.className = 'pdf-page-canvas';
                    const context = canvas.getContext('2d');

                    const viewport = page.getViewport({ scale: 1.35 });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    canvasContainer.appendChild(canvas);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    await page.render(renderContext).promise;
                }
            } catch (err) {
                console.warn('PDF.js render fallback:', err);
                if (pdfFrame) {
                    if (canvasContainer) canvasContainer.style.display = 'none';
                    pdfFrame.style.display = 'block';
                    pdfFrame.src = `${pdfUrl}#navpanes=0&toolbar=0&statusbar=0&messages=0&view=FitH`;
                }
            }
        } else if (pdfFrame) {
            pdfFrame.style.display = 'block';
            pdfFrame.src = `${pdfUrl}#navpanes=0&toolbar=0&statusbar=0&messages=0&view=FitH`;
        }
    }

    function closePDFModal() {
        pdfModal.classList.remove('is-open');
        document.body.style.overflow = '';
        if (canvasContainer) canvasContainer.innerHTML = '';
        if (pdfFrame) pdfFrame.src = '';
    }

    document.querySelectorAll('.view-pdf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pdfUrl = btn.dataset.pdf;
            openPDFModal(pdfUrl);
        });
    });

    if (pdfModalClose) {
        pdfModalClose.addEventListener('click', closePDFModal);
    }

    if (pdfModal) {
        pdfModal.addEventListener('click', (e) => {
            if (e.target === pdfModal) closePDFModal();
        });
    }

    /* ==========================================================================
       4. Book Reading Modal (書籍導讀彈窗：保留海報圖示位置)
       ========================================================================== */
    const bookModal = document.getElementById('bookModal');
    const bookModalClose = document.getElementById('bookModalClose');
    const bookModalImg = document.getElementById('bookModalImg');
    const bookModalTitle = document.getElementById('bookModalTitle');
    const bookModalAuthor = document.getElementById('bookModalAuthor');
    const bookModalPublisher = document.getElementById('bookModalPublisher');
    const bookModalSubtitle = document.getElementById('bookModalSubtitle');
    const bookModalDetail = document.getElementById('bookModalDetail');

    function openBookModal(imgSrc, title, author, publisher, quote, detail) {
        if (bookModalImg) bookModalImg.src = imgSrc;
        if (bookModalTitle) bookModalTitle.textContent = title;
        
        if (bookModalAuthor) {
            bookModalAuthor.textContent = author ? `作者：${author}` : '';
            bookModalAuthor.style.display = author ? 'inline-block' : 'none';
        }
        if (bookModalPublisher) {
            bookModalPublisher.textContent = publisher ? `出版社：${publisher}` : '';
            bookModalPublisher.style.display = publisher ? 'inline-block' : 'none';
        }
        
        if (bookModalSubtitle) bookModalSubtitle.textContent = quote ? `「${quote}」` : '';
        
        if (bookModalDetail) {
            if (detail.includes('|')) {
                const points = detail.split('|').filter(p => p.trim());
                bookModalDetail.innerHTML = `<ul class="note-points-list">${points.map(pt => `<li>${pt.trim()}</li>`).join('')}</ul>`;
            } else {
                bookModalDetail.textContent = detail;
            }
        }

        bookModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeBookModal() {
        bookModal.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => {
            const imgSrc = card.dataset.img || '';
            const title = card.dataset.title || '';
            const author = card.dataset.author || '';
            const publisher = card.dataset.publisher || '';
            const quote = card.dataset.quote || '';
            const detail = card.dataset.detail || '';
            openBookModal(imgSrc, title, author, publisher, quote, detail);
        });
    });

    if (bookModalClose) {
        bookModalClose.addEventListener('click', closeBookModal);
    }

    if (bookModal) {
        bookModal.addEventListener('click', (e) => {
            if (e.target === bookModal) closeBookModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePDFModal();
            closeBookModal();
        }
    });

    /* ==========================================================================
       5. Contact Form Handler (Web3Forms Toast Feedback)
       ========================================================================== */
    const contactForm = document.getElementById('contact-form');
    const toast = document.getElementById('toast');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (toast) toast.textContent = 'Sending your footprint...';

            const formData = new FormData(contactForm);

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    if (toast) toast.textContent = '✦ Thank you. Your footprint has been saved in the gallery. ✦';
                    contactForm.reset();
                } else {
                    if (toast) toast.textContent = 'Failed to submit. Please try again later.';
                }
            } catch (err) {
                if (toast) toast.textContent = 'Submission error. Please try again.';
            }
        });
    }

});

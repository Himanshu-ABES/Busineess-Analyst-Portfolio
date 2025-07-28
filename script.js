class BookPresentation {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.hidden-slides .slide');
        this.totalSlides = this.slides.length;
        this.book = document.querySelector('.book');
        this.leftContent = document.getElementById('left-content');
        this.rightContent = document.getElementById('right-content');
        this.pageLeft = document.querySelector('.page-left');
        this.pageRight = document.querySelector('.page-right');
        this.pageOverlay = document.getElementById('page-turn-overlay');
        this.isAnimating = false;
        this.splitSlides = []; // Store split content for long slides
        
        this.init();
    }

    init() {
        this.processSlidesForPagination();
        document.getElementById('total-slides').textContent = this.totalSlides;
        this.showSlide(0);
        this.setupEventListeners();
        
        // Start with book closed
        this.book.classList.add('closed');
    }

    processSlidesForPagination() {
        const pageHeight = 530; // Available height (600px - padding)
        this.splitSlides = [];
        
        this.slides.forEach((slide, index) => {
            // Create a temporary container to measure content height
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.visibility = 'hidden';
            tempContainer.style.width = '390px'; // Page width minus padding
            tempContainer.className = 'page-content';
            tempContainer.innerHTML = slide.outerHTML;
            document.body.appendChild(tempContainer);
            
            const contentHeight = tempContainer.scrollHeight;
            document.body.removeChild(tempContainer);
            
            if (contentHeight > pageHeight && this.isContentSplittable(slide)) {
                // Split the content
                const splitContent = this.splitSlideContent(slide, pageHeight);
                this.splitSlides.push(...splitContent);
            } else {
                this.splitSlides.push(slide);
            }
        });
        
        this.totalSlides = this.splitSlides.length;
    }

    isContentSplittable(slide) {
        // Check if slide contains user stories (which can be split)
        return slide.innerHTML.includes('user-story') || 
               slide.innerHTML.includes('competency-card') ||
               slide.querySelectorAll('li').length > 5;
    }

    splitSlideContent(slide, maxHeight) {
        const userStories = slide.querySelectorAll('.user-story');
        const competencyCards = slide.querySelectorAll('.competency-card');
        
        if (userStories.length > 1) {
            return this.splitUserStories(slide, userStories);
        } else if (competencyCards.length > 0) {
            return this.splitCompetencyCards(slide, competencyCards);
        } else {
            // For other long content, try to split by paragraphs or list items
            return this.splitByElements(slide, maxHeight);
        }
    }

    splitUserStories(originalSlide, userStories) {
        const slides = [];
        const header = originalSlide.querySelector('h2').outerHTML;
        
        userStories.forEach((story, index) => {
            const newSlide = document.createElement('div');
            newSlide.className = 'slide';
            newSlide.setAttribute('data-slide', originalSlide.getAttribute('data-slide') + `_${index + 1}`);
            
            if (index === 0) {
                newSlide.innerHTML = header + story.outerHTML;
            } else {
                newSlide.innerHTML = `<h2>${originalSlide.querySelector('h2').textContent} (continued)</h2>` + story.outerHTML;
            }
            
            slides.push(newSlide);
        });
        
        return slides;
    }

    splitCompetencyCards(originalSlide, competencyCards) {
        const slides = [];
        const header = originalSlide.querySelector('h2').outerHTML;
        const cardsPerPage = 6;
        
        for (let i = 0; i < competencyCards.length; i += cardsPerPage) {
            const newSlide = document.createElement('div');
            newSlide.className = 'slide';
            newSlide.setAttribute('data-slide', originalSlide.getAttribute('data-slide') + `_${Math.floor(i / cardsPerPage) + 1}`);
            
            const pageCards = Array.from(competencyCards).slice(i, i + cardsPerPage);
            const competenciesContainer = '<div class="competencies">' + 
                pageCards.map(card => card.outerHTML).join('') + 
                '</div>';
            
            if (i === 0) {
                newSlide.innerHTML = header + competenciesContainer;
            } else {
                newSlide.innerHTML = `<h2>${originalSlide.querySelector('h2').textContent} (continued)</h2>` + competenciesContainer;
            }
            
            slides.push(newSlide);
        }
        
        return slides;
    }

    splitByElements(originalSlide, maxHeight) {
        // For other content, just return the original slide
        // This can be enhanced later for more complex splitting
        return [originalSlide];
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('prev-btn').addEventListener('click', () => this.changeSlide(-1));
        document.getElementById('next-btn').addEventListener('click', () => this.changeSlide(1));

        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (this.isAnimating) return;
            
            if (event.key === 'ArrowRight' || event.key === ' ') {
                event.preventDefault();
                this.changeSlide(1);
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.changeSlide(-1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                this.goToSlide(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                this.goToSlide(this.totalSlides - 1);
            } else if (event.key === 'f' || event.key === 'F') {
                this.toggleFullscreen();
            }
        });

        // Touch/swipe support for mobile
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            if (this.isAnimating) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.changeSlide(1);
                } else {
                    this.changeSlide(-1);
                }
            }
        });
    }

    showSlide(n) {
        this.currentSlide = n;
        
        // Update slide counter
        document.getElementById('current-slide').textContent = this.currentSlide + 1;
        
        // Update navigation buttons
        document.getElementById('prev-btn').disabled = this.currentSlide === 0;
        document.getElementById('next-btn').disabled = this.currentSlide === this.totalSlides - 1;

        // Update content based on slide position
        this.updateContent();
        
        // Update book state
        this.updateBookState();
    }

    updateContent() {
        const currentSlideElement = this.splitSlides[this.currentSlide];
        
        // Always keep left page blank, show content only on right side
        this.leftContent.innerHTML = '';
        this.rightContent.innerHTML = currentSlideElement.outerHTML + this.getPageNumber(this.currentSlide + 1);
    }

    getPageNumber(pageNum) {
        return `<div class="page-number">${pageNum}</div>`;
    }

    updateBookState() {
        // Remove all book state classes
        this.book.classList.remove('closed', 'opening', 'open');
        
        if (this.currentSlide === 0 || this.currentSlide === this.totalSlides - 1) {
            // First or last page - book closed
            this.book.classList.add('closed');
        } else if (this.currentSlide === 1 || this.currentSlide === this.totalSlides - 2) {
            // Second or second-to-last page - book opening
            this.book.classList.add('opening');
        } else {
            // Middle pages - book fully open
            this.book.classList.add('open');
        }
    }

    changeSlide(direction) {
        if (this.isAnimating) return;

        let newSlide = this.currentSlide;
        
        if (direction === 1 && this.currentSlide < this.totalSlides - 1) {
            newSlide = this.currentSlide + 1;
        } else if (direction === -1 && this.currentSlide > 0) {
            newSlide = this.currentSlide - 1;
        } else {
            return;
        }

        this.animatePageTurn(direction, newSlide);
    }

    goToSlide(slideIndex) {
        if (this.isAnimating || slideIndex === this.currentSlide) return;
        
        const direction = slideIndex > this.currentSlide ? 1 : -1;
        this.animatePageTurn(direction, slideIndex);
    }

    animatePageTurn(direction, targetSlide) {
        this.isAnimating = true;

        // Show page turn overlay
        if (this.pageOverlay) {
            this.pageOverlay.classList.add('active');
        }

        // Determine which page to animate
        const pageToAnimate = direction === 1 ? this.pageRight : this.pageLeft;
        
        // Add appropriate animation class
        if (direction === 1) {
            pageToAnimate.classList.add('turning-forward');
        } else {
            pageToAnimate.classList.add('turning-backward');
        }

        // Play page turn sound effect
        this.playPageTurnSound();
        
        // Update content earlier for smooth transition (40% through the 1.5s animation)
        setTimeout(() => {
            this.showSlide(targetSlide);
        }, 600); // 40% of 1.5s animation

        // Clean up animation
        setTimeout(() => {
            pageToAnimate.classList.remove('turning-forward', 'turning-backward');
            if (this.pageOverlay) {
                this.pageOverlay.classList.remove('active');
            }
            this.isAnimating = false;
        }, 1500); // Full 1.5s animation duration

        // Add subtle book movement
        this.animateBook();
    }

    animateBook() {
        const originalTransform = this.book.style.transform;
        this.book.style.transform = 'scale(1.01) rotateX(1deg)';
        
        setTimeout(() => {
            this.book.style.transform = originalTransform;
        }, 750); // Mid-point of 1.5s animation
    }

    playPageTurnSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                console.log('Fullscreen not supported');
            });
        } else {
            document.exitFullscreen().catch(() => {
                console.log('Exit fullscreen failed');
            });
        }
    }
}

// Initialize the presentation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bookPresentation = new BookPresentation();
    
    // Prevent context menu for better presentation experience
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Prevent text selection for cleaner look
    document.addEventListener('selectstart', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    // Add smooth page transitions
    document.body.style.transition = 'all 0.3s ease';
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookPresentation;
}

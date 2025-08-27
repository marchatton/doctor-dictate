/**
 * Card component inspired by shadcn/ui
 * Adapted for vanilla JavaScript and Electron
 */

class Card {
    constructor(element) {
        this.element = element;
        this.init();
    }

    init() {
        // Apply base card classes
        this.element.classList.add(
            'rounded-lg', 'border', 'bg-white', 'text-card-foreground', 'shadow-sm'
        );
        
        // Apply variant classes based on data attributes
        this.applyVariant();
    }

    applyVariant() {
        const variant = this.element.dataset.variant || 'default';
        
        switch (variant) {
            case 'medical':
                this.element.classList.remove('border', 'shadow-sm');
                this.element.classList.add('medical-card', 'medical-gradient');
                break;
            case 'elevated':
                this.element.classList.remove('shadow-sm');
                this.element.classList.add('shadow-xl');
                break;
        }
    }

    static init() {
        // Initialize all cards with data-component="card"
        document.querySelectorAll('[data-component="card"]').forEach(element => {
            new Card(element);
        });
    }
}

class CardHeader {
    constructor(element) {
        this.element = element;
        this.init();
    }

    init() {
        this.element.classList.add('flex', 'flex-col', 'space-y-1.5', 'p-6');
    }

    static init() {
        document.querySelectorAll('[data-component="card-header"]').forEach(element => {
            new CardHeader(element);
        });
    }
}

class CardTitle {
    constructor(element) {
        this.element = element;
        this.init();
    }

    init() {
        this.element.classList.add('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    }

    static init() {
        document.querySelectorAll('[data-component="card-title"]').forEach(element => {
            new CardTitle(element);
        });
    }
}

class CardContent {
    constructor(element) {
        this.element = element;
        this.init();
    }

    init() {
        this.element.classList.add('p-6', 'pt-0');
    }

    static init() {
        document.querySelectorAll('[data-component="card-content"]').forEach(element => {
            new CardContent(element);
        });
    }
}

// Auto-initialize when DOM is ready
function initCards() {
    Card.init();
    CardHeader.init();
    CardTitle.init();
    CardContent.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCards);
} else {
    initCards();
}

module.exports = { Card, CardHeader, CardTitle, CardContent };
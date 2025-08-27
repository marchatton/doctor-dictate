/**
 * Button component inspired by shadcn/ui
 * Adapted for vanilla JavaScript and Electron
 */

class Button {
    constructor(element) {
        this.element = element;
        this.init();
    }

    init() {
        // Apply base button classes
        this.element.classList.add(
            'inline-flex', 'items-center', 'justify-center',
            'rounded-md', 'text-sm', 'font-medium',
            'transition-colors', 'focus-visible:outline-none',
            'focus-visible:ring-2', 'focus-visible:ring-primary-500',
            'disabled:opacity-50', 'disabled:pointer-events-none'
        );
        
        // Apply variant classes based on data attributes
        this.applyVariant();
        this.applySize();
    }

    applyVariant() {
        const variant = this.element.dataset.variant || 'default';
        
        // Remove existing variant classes
        this.element.classList.remove(
            'bg-primary-700', 'text-white', 'hover:bg-primary-800',
            'bg-secondary-700', 'text-white', 'hover:bg-secondary-800',
            'border', 'border-input', 'bg-background', 'hover:bg-accent',
            'hover:text-accent-foreground', 'text-primary-700', 'underline-offset-4',
            'hover:underline', 'bg-destructive', 'text-destructive-foreground',
            'hover:bg-destructive/90'
        );

        switch (variant) {
            case 'default':
                this.element.classList.add('bg-primary-700', 'text-white', 'hover:bg-primary-800');
                break;
            case 'secondary':
                this.element.classList.add('bg-secondary-700', 'text-white', 'hover:bg-secondary-800');
                break;
            case 'outline':
                this.element.classList.add(
                    'border', 'border-primary-300', 'bg-transparent', 
                    'text-primary-700', 'hover:bg-primary-50'
                );
                break;
            case 'ghost':
                this.element.classList.add('hover:bg-accent', 'hover:text-accent-foreground');
                break;
            case 'link':
                this.element.classList.add('text-primary-700', 'underline-offset-4', 'hover:underline');
                break;
        }
    }

    applySize() {
        const size = this.element.dataset.size || 'default';
        
        // Remove existing size classes
        this.element.classList.remove('h-10', 'px-4', 'py-2', 'h-9', 'px-3', 'h-11', 'px-8', 'h-8', 'w-8');

        switch (size) {
            case 'sm':
                this.element.classList.add('h-9', 'px-3');
                break;
            case 'lg':
                this.element.classList.add('h-11', 'px-8');
                break;
            case 'icon':
                this.element.classList.add('h-10', 'w-10');
                break;
            default:
                this.element.classList.add('h-10', 'px-4', 'py-2');
                break;
        }
    }

    static init() {
        // Initialize all buttons with data-component="button"
        document.querySelectorAll('[data-component="button"]').forEach(element => {
            new Button(element);
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Button.init);
} else {
    Button.init();
}

module.exports = { Button };
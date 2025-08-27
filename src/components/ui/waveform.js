/**
 * Waveform Visualization Component
 * Real-time audio visualization for recording feedback
 */

class WaveformVisualization {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.isRecording = false;
        this.audioData = [];
        this.animationId = null;
        
        // Resize canvas to match display size
        this.resizeCanvas();
        
        // Listen for window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    startRecording() {
        this.isRecording = true;
        this.audioData = [];
        this.animate();
    }

    stopRecording() {
        this.isRecording = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.drawFinalWaveform();
    }

    addAudioLevel(level) {
        if (this.audioData.length > 200) { // Keep last 200 samples
            this.audioData.shift();
        }
        this.audioData.push(Math.min(1, Math.max(0, level)));
    }

    animate() {
        if (!this.isRecording) return;
        
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    draw() {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        if (this.audioData.length === 0) return;
        
        const centerY = height / 2;
        const centerX = width / 2;
        
        // Simple centered waveform - just 7 bars in the center
        const numBars = 7;
        const barWidth = 4;
        const totalWidth = numBars * barWidth + (numBars - 1) * 4; // 4px spacing
        const startX = centerX - totalWidth / 2;
        
        // Get the latest audio level
        const latestLevel = this.audioData[this.audioData.length - 1] || 0;
        
        for (let i = 0; i < numBars; i++) {
            // Create some variation based on center position
            const distanceFromCenter = Math.abs(i - Math.floor(numBars / 2));
            const levelVariation = 1 - (distanceFromCenter * 0.15);
            const barLevel = latestLevel * levelVariation;
            
            const normalizedLevel = Math.max(0.1, Math.min(1, barLevel));
            const x = startX + i * (barWidth + 4);
            const barHeight = normalizedLevel * (height * 0.4);
            
            this.ctx.fillStyle = this.getBarColor(normalizedLevel);
            this.ctx.fillRect(x, centerY - barHeight/2, barWidth, barHeight);
        }
    }

    getBarColor(level) {
        // Color based on audio level: green -> yellow -> red
        if (level < 0.5) {
            return `rgba(34, 197, 94, ${0.3 + level * 0.7})`; // green
        } else if (level < 0.8) {
            return `rgba(245, 158, 11, ${0.3 + level * 0.7})`; // amber
        } else {
            return `rgba(239, 68, 68, ${0.3 + level * 0.7})`; // red
        }
    }

    drawFinalWaveform() {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        this.ctx.clearRect(0, 0, width, height);
        
        if (this.audioData.length === 0) return;
        
        // Draw complete waveform
        this.ctx.strokeStyle = '#6B1F1F';
        this.ctx.lineWidth = 1.5;
        
        const stepX = width / this.audioData.length;
        const centerY = height / 2;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < this.audioData.length; i++) {
            const x = i * stepX;
            const y = centerY + (this.audioData[i] - 0.5) * height * 0.8;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }

    showPlaceholder() {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        this.ctx.clearRect(0, 0, width, height);
        
        // Draw placeholder waveform with multiple sine waves for richness
        this.ctx.strokeStyle = '#A8A29E'; // stone-400 for better visibility
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        
        const centerY = height / 2;
        this.ctx.beginPath();
        
        // Main waveform - simpler, cleaner wave
        for (let x = 0; x < width; x += 3) {
            const y = centerY + Math.sin(x * 0.012) * 20;
            
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Add subtle amplitude bars - fewer and cleaner
        this.ctx.strokeStyle = '#D6D3D1'; // stone-300  
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 8]);
        
        for (let x = 50; x < width; x += 80) {
            const amplitude = Math.abs(Math.sin(x * 0.015)) * 25 + 8;
            this.ctx.beginPath();
            this.ctx.moveTo(x, centerY - amplitude/2);
            this.ctx.lineTo(x, centerY + amplitude/2);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
    }

    static init() {
        const canvas = document.getElementById('waveform-canvas');
        if (canvas) {
            const waveform = new WaveformVisualization(canvas);
            
            // Make globally accessible
            window.waveformVisualization = waveform;
            
            // Show placeholder after a short delay to ensure canvas is ready
            setTimeout(() => {
                waveform.showPlaceholder();
            }, 100);
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WaveformVisualization.init);
} else {
    WaveformVisualization.init();
}

module.exports = { WaveformVisualization };
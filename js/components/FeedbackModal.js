export class FeedbackModal {
    constructor() {
        this.isOpen = false;
        this.onSubmit = null;
    }

    init() {
        this.createModal();
        this.attachEventListeners();
    }

    createModal() {
        const modalHTML = `
            <div id="feedback-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Report Generation Issue</h2>
                        <button class="modal-close" id="feedback-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Please describe why the task generation is incorrect:</p>
                        <textarea 
                            id="feedback-description" 
                            class="feedback-textarea" 
                            placeholder="Describe the issue with the current task generation..."
                            rows="6"
                        ></textarea>
                        <div class="feedback-info">
                            <small>Your feedback will be exported along with the current configuration and generated tasks.</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="feedback-cancel">Cancel</button>
                        <button class="btn-primary" id="feedback-submit">Download Report</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    attachEventListeners() {
        // Close button
        document.getElementById('feedback-close').addEventListener('click', () => {
            this.close();
        });

        // Cancel button
        document.getElementById('feedback-cancel').addEventListener('click', () => {
            this.close();
        });

        // Submit button
        document.getElementById('feedback-submit').addEventListener('click', () => {
            this.submit();
        });

        // Close on overlay click
        document.getElementById('feedback-modal').addEventListener('click', (e) => {
            if (e.target.id === 'feedback-modal') {
                this.close();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    open() {
        const modal = document.getElementById('feedback-modal');
        const textarea = document.getElementById('feedback-description');
        
        modal.style.display = 'flex';
        textarea.value = '';
        textarea.focus();
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    close() {
        const modal = document.getElementById('feedback-modal');
        modal.style.display = 'none';
        this.isOpen = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    submit() {
        const description = document.getElementById('feedback-description').value.trim();
        
        if (!description) {
            alert('Please describe the issue before submitting.');
            return;
        }

        if (this.onSubmit) {
            this.onSubmit(description);
        }

        this.close();
    }

    setOnSubmit(callback) {
        this.onSubmit = callback;
    }
}
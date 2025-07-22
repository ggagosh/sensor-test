export class TimelineRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.colors = {
            calendar: '#3b82f6',
            sensor: '#ef4444',
            completed: '#10b981',
            overdue: '#f59e0b',
            track: '#e5e7eb',
            currentDate: '#dc2626',
            text: '#374151',
            background: '#ffffff'
        };
        this.padding = { top: 60, right: 40, bottom: 60, left: 120 };
        this.trackHeight = 60;
        this.taskRadius = 8;
        this.tracks = [
            { label: 'Sensor Tasks', y: 0 },
            { label: 'Calendar Tasks', y: 0 },
            { label: 'Completed Task', y: 0 }
        ];
    }

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = 300;
        this.updateTrackPositions();
    }

    updateTrackPositions() {
        const trackSpacing = (this.canvas.height - this.padding.top - this.padding.bottom) / this.tracks.length;
        this.tracks.forEach((track, index) => {
            track.y = this.padding.top + (index * trackSpacing) + (trackSpacing / 2);
        });
    }

    render(tasks, currentDate = new Date(), lastCompletedDate = null, completedTaskPosition = 3) {
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate timeline bounds (13 months)
        const startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 6);
        const endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 7);

        const timelineWidth = this.canvas.width - this.padding.left - this.padding.right;
        const timeRange = endDate - startDate;

        // Draw track labels
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.textAlign = 'right';
        this.tracks.forEach((track, index) => {
            this.ctx.fillText(track.label, this.padding.left - 10, track.y + 5);
        });

        // Draw timeline tracks
        this.ctx.strokeStyle = this.colors.track;
        this.ctx.lineWidth = 2;
        this.tracks.forEach(track => {
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left, track.y);
            this.ctx.lineTo(this.canvas.width - this.padding.right, track.y);
            this.ctx.stroke();
        });

        // Draw month labels
        this.drawMonthLabels(startDate, endDate, timelineWidth);

        // Draw current date line
        const currentX = this.padding.left + ((currentDate - startDate) / timeRange) * timelineWidth;
        this.ctx.strokeStyle = this.colors.currentDate;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(currentX, this.padding.top - 20);
        this.ctx.lineTo(currentX, this.canvas.height - this.padding.bottom + 20);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw "Today" label
        this.ctx.fillStyle = this.colors.currentDate;
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Today', currentX, this.padding.top - 25);

        // Group tasks by type
        const sensorTasks = tasks.filter(t => t.triggerType === 'sensor');
        const calendarTasks = tasks.filter(t => t.triggerType === 'calendar');

        // Draw tasks
        this.drawTasks(sensorTasks, 0, startDate, timeRange, timelineWidth, currentDate);
        this.drawTasks(calendarTasks, 1, startDate, timeRange, timelineWidth, currentDate);

        // Draw completed task
        if (lastCompletedDate) {
            const trackIndex = completedTaskPosition - 1;
            if (trackIndex >= 0 && trackIndex < this.tracks.length) {
                const x = this.padding.left + ((lastCompletedDate - startDate) / timeRange) * timelineWidth;
                const y = this.tracks[trackIndex].y;
                
                this.ctx.fillStyle = this.colors.completed;
                this.ctx.strokeStyle = this.colors.completed;
                this.ctx.lineWidth = 2;
                
                // Draw square for completed task
                this.ctx.fillRect(x - this.taskRadius, y - this.taskRadius, this.taskRadius * 2, this.taskRadius * 2);
                
                // Draw label
                this.ctx.fillStyle = this.colors.text;
                this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Completed', x, y + this.taskRadius + 15);
            }
        }
    }

    drawTasks(tasks, trackIndex, startDate, timeRange, timelineWidth, currentDate) {
        const track = this.tracks[trackIndex];
        const y = track.y;

        tasks.forEach((task, index) => {
            const x = this.padding.left + ((task.dueDate - startDate) / timeRange) * timelineWidth;
            
            // Determine color based on track type
            let color = trackIndex === 0 ? this.colors.sensor : this.colors.calendar;

            // Draw task circle
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.taskRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw task number
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`#${task.taskNumber}`, x, y - this.taskRadius - 5);

            // Connect tasks with dotted line
            if (index > 0) {
                const prevTask = tasks[index - 1];
                const prevX = this.padding.left + ((prevTask.dueDate - startDate) / timeRange) * timelineWidth;
                
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                this.ctx.moveTo(prevX + this.taskRadius, y);
                this.ctx.lineTo(x - this.taskRadius, y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });
    }

    drawMonthLabels(startDate, endDate, timelineWidth) {
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.textAlign = 'center';

        const currentMonth = new Date(startDate);
        currentMonth.setDate(1); // Start at beginning of month

        while (currentMonth <= endDate) {
            const x = this.padding.left + ((currentMonth - startDate) / (endDate - startDate)) * timelineWidth;
            const monthName = currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            // Draw month marker
            this.ctx.strokeStyle = this.colors.track;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.canvas.height - this.padding.bottom + 5);
            this.ctx.lineTo(x, this.canvas.height - this.padding.bottom + 10);
            this.ctx.stroke();
            
            // Draw month label
            this.ctx.fillText(monthName, x, this.canvas.height - this.padding.bottom + 25);
            
            // Move to next month
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    }

    destroy() {
        // Remove event listeners if needed
        window.removeEventListener('resize', () => this.resize());
    }
}
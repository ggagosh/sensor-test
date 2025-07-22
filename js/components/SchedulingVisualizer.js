import { TimelineRenderer } from './TimelineRenderer.js';

export class SchedulingVisualizer {
    constructor() {
        this.timelineRenderer = new TimelineRenderer();
        this.completedTaskPosition = 3;
    }

    init() {
        this.timelineRenderer.init('timeline-canvas');
    }

    updateVisualization(tasks, currentDate = new Date(), lastCompletedDate = null) {
        this.timelineRenderer.render(tasks, currentDate, lastCompletedDate, this.completedTaskPosition);
    }

    setCompletedTaskPosition(position) {
        this.completedTaskPosition = position;
    }

    renderScheduleDetails(tasks, container) {
        const html = `
            <div class="schedule-details">
                <h3>Scheduled Tasks</h3>
                <div class="task-list">
                    ${tasks.map(task => `
                        <div class="task-item ${task.dueDate < new Date() ? 'overdue' : ''}">
                            <div class="task-header">
                                <span class="task-number">Task #${task.taskNumber}</span>
                                <span class="task-trigger ${task.triggerType}">${task.triggerType}</span>
                            </div>
                            <div class="task-dates">
                                <div class="due-date">
                                    <strong>Due:</strong> ${task.dueDate.toLocaleString()}
                                </div>
                                ${task.calendarDate ? `
                                    <div class="calendar-date">
                                        <strong>Calendar:</strong> ${new Date(task.calendarDate).toLocaleDateString()}
                                    </div>
                                ` : ''}
                                ${task.sensorDate ? `
                                    <div class="sensor-date">
                                        <strong>Sensor:</strong> ${new Date(task.sensorDate).toLocaleDateString()}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    destroy() {
        this.timelineRenderer.destroy();
    }
}
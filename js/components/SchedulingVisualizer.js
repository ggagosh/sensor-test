export class SchedulingVisualizer {
    constructor() {
        this.timeline = null;
        this.items = null;
        this.groups = null;
        this.completedTaskPosition = 3;
    }

    init() {
        const container = document.getElementById('timeline-container');
        
        // Create groups for different task types
        this.groups = new vis.DataSet([
            { id: 1, content: 'Sensor', style: 'background-color: rgba(254, 226, 226, 0.3);' },
            { id: 2, content: 'Calendar', style: 'background-color: rgba(219, 234, 254, 0.3);' },
            { id: 3, content: 'Completed', style: 'background-color: rgba(209, 250, 229, 0.3);' }
        ]);
        
        // Create empty items dataset
        this.items = new vis.DataSet();
        
        // Configuration options
        const options = {
            // height: '370px',
            stack: false,
            showCurrentTime: true,
            orientation: 'top',
            zoomMin: 1000 * 60 * 60 * 24,
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 2,
            editable: false,
            margin: {
                item: {
                    horizontal: 0,
                    vertical: 10
                }
            },
            template: function (item) {
                return `<div class="custom-item ${item.className}">${item.content}</div>`;
            }
        };
        
        // Create timeline
        this.timeline = new vis.Timeline(container, this.items, this.groups, options);
        
        // Add custom styling
        this.addCustomStyles();
        
        // Set initial view range immediately
        const today = new Date();
        const start = new Date(today);
        start.setMonth(start.getMonth() - 3); // 3 months before today
        const end = new Date(today);
        end.setMonth(end.getMonth() + 11); // 11 months from now
        this.timeline.setWindow(start, end);
    }

    updateVisualization(tasks, currentDate = new Date(), lastCompletedDate = null) {
        const items = [];
        
        // Add sensor tasks
        const sensorTasks = tasks.filter(t => t.triggerType === 'sensor');
        sensorTasks.forEach(task => {
            items.push({
                id: `sensor-${task.taskNumber}`,
                group: 1,
                content: '●',
                start: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
                type: 'box',
                className: 'sensor-item'
            });
        });
        
        // Add calendar tasks
        const calendarTasks = tasks.filter(t => t.triggerType === 'calendar');
        calendarTasks.forEach(task => {
            items.push({
                id: `calendar-${task.taskNumber}`,
                group: 2,
                content: '●',
                start: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
                type: 'box',
                className: 'calendar-item'
            });
        });
        
        // Add completed task
        if (lastCompletedDate) {
            const groupId = this.completedTaskPosition === 1 ? 1 : 
                           this.completedTaskPosition === 2 ? 2 : 3;
            
            items.push({
                id: 'completed-task',
                group: groupId,
                content: '✓',
                start: lastCompletedDate instanceof Date ? lastCompletedDate : new Date(lastCompletedDate),
                type: 'box',
                className: 'completed-item'
            });
        }
        
        // Update items
        this.items.clear();
        this.items.add(items);
        
        console.log('Timeline items added:', items.length, items);
        
        // Ensure the view stays at desired range after adding items
        setTimeout(() => {
            const today = new Date();
            const start = new Date(today);
            start.setMonth(start.getMonth() - 3); // 3 months before today
            const end = new Date(today);
            end.setMonth(end.getMonth() + 11); // 11 months from now
            this.timeline.setWindow(start, end);
        }, 100);
    }

    setCompletedTaskPosition(position) {
        this.completedTaskPosition = position;
    }

    renderScheduleDetails(tasks, container) {
        // Calculate days until due for each task
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tasksWithDays = tasks.map(task => {
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            return { ...task, daysUntil };
        });
        
        const html = `
            <div class="schedule-details">
                <div class="schedule-header">
                    <h3>Scheduled Tasks</h3>
                    <div class="schedule-actions">
                        <button onclick="window.schedulingApp.visualizer.resetZoom()" class="btn-secondary">Reset Timeline View</button>
                    </div>
                </div>
                
                <div class="schedule-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total Tasks:</span>
                        <span class="summary-value">${tasks.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Next 30 Days:</span>
                        <span class="summary-value">${tasksWithDays.filter(t => t.daysUntil >= 0 && t.daysUntil <= 30).length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Overdue:</span>
                        <span class="summary-value">${tasksWithDays.filter(t => t.daysUntil < 0).length}</span>
                    </div>
                </div>
                
                <div class="task-table-container">
                    <table class="task-table">
                        <thead>
                            <tr>
                                <th width="40">#</th>
                                <th width="40">📌</th>
                                <th width="100">Due Date</th>
                                <th width="120">Days Until</th>
                                <th>Trigger</th>
                                <th width="70">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasksWithDays.slice(0, 20).map(task => `
                                <tr class="${task.daysUntil < 0 ? 'overdue' : task.daysUntil <= 7 ? 'soon' : ''}">
                                    <td class="task-number">${task.taskNumber}</td>
                                    <td class="task-type-cell">
                                        <span class="task-icon ${task.triggerType}" title="${task.triggerType}">
                                            ${task.triggerType === 'sensor' ? '⚡' : '📅'}
                                        </span>
                                    </td>
                                    <td>${task.dueDate.toLocaleDateString()}</td>
                                    <td class="days-until">
                                        ${task.daysUntil < 0 
                                            ? `<span class="overdue">${Math.abs(task.daysUntil)} days overdue</span>`
                                            : task.daysUntil === 0 
                                            ? '<span class="today">Today</span>'
                                            : task.daysUntil === 1
                                            ? '<span class="tomorrow">Tomorrow</span>'
                                            : `${task.daysUntil} days`
                                        }
                                    </td>
                                    <td class="trigger-info">
                                        ${task.calendarInfo 
                                            ? `Every ${task.calendarInfo.repeatEvery} ${task.calendarInfo.interval}` 
                                            : task.sensorInfo 
                                            ? `${task.sensorInfo.triggerValue} units`
                                            : '-'
                                        }
                                    </td>
                                    <td>
                                        <span class="status-badge ${task.daysUntil < 0 ? 'status-overdue' : task.daysUntil <= 7 ? 'status-soon' : 'status-upcoming'}">
                                            ${task.daysUntil < 0 ? 'Overdue' : task.daysUntil <= 7 ? 'Soon' : 'Upcoming'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${tasks.length > 20 ? `
                        <div class="table-footer">
                            Showing 20 of ${tasks.length} tasks
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    resetZoom() {
        const today = new Date();
        const start = new Date(today);
        start.setMonth(start.getMonth() - 3); // 3 months before today
        const end = new Date(today);
        end.setMonth(end.getMonth() + 11); // 11 months from now
        this.timeline.setWindow(start, end, {
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuad'
            }
        });
    }

    addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Timeline container */
            #timeline-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            #timeline-container .vis-timeline {
                border: none;
                border-radius: 0;
                background: transparent;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            /* Panel backgrounds */
            .vis-panel.vis-center,
            .vis-panel.vis-left,
            .vis-panel.vis-right {
                background: white;
            }
            
            /* Labels styling */
            .vis-labelset {
                background: #f8fafc;
                border-right: 1px solid #e5e7eb;
                width: 150px !important;
            }
            
            .vis-labelset .vis-label {
                padding: 0 20px;
                font-weight: 600;
                font-size: 14px;
                color: #374151;
                display: flex;
                align-items: center;
                height: 123px !important;
                border-bottom: 1px solid #e5e7eb;
                position: relative;
            }
            
            .vis-labelset .vis-label:last-child {
                border-bottom: none;
            }
            
            .vis-labelset .vis-label::before {
                content: '●';
                position: absolute;
                left: 8px;
                font-size: 10px;
            }
            
            .vis-labelset .vis-label:nth-child(1)::before {
                color: #dc2626;
            }
            
            .vis-labelset .vis-label:nth-child(2)::before {
                color: #2563eb;
            }
            
            .vis-labelset .vis-label:nth-child(3)::before {
                color: #059669;
            }
            
            /* Background stripes for groups */
            .vis-foreground .vis-group {
                height: 123px !important;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .vis-foreground .vis-group:last-child {
                border-bottom: none;
            }
            
            .vis-foreground .vis-group:nth-child(1) {
                background: linear-gradient(to right, 
                    rgba(254, 242, 242, 0.5) 0%, 
                    rgba(254, 226, 226, 0.3) 100%);
            }
            
            .vis-foreground .vis-group:nth-child(2) {
                background: linear-gradient(to right, 
                    rgba(239, 246, 255, 0.5) 0%, 
                    rgba(219, 234, 254, 0.3) 100%);
            }
            
            .vis-foreground .vis-group:nth-child(3) {
                background: linear-gradient(to right, 
                    rgba(236, 253, 245, 0.5) 0%, 
                    rgba(209, 250, 229, 0.3) 100%);
            }
            
            /* Custom items */
            .vis-item.vis-box {
                background-color: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            
            .custom-item {
                width: 16px !important;
                height: 16px !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 12px !important;
                font-weight: bold !important;
                border: 2px solid white !important;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
                cursor: pointer !important;
                position: relative !important;
                transition: all 0.2s ease !important;
            }
            
            .custom-item.sensor-item {
                background-color: #dc2626 !important;
                color: #dc2626 !important;
            }
            
            .custom-item.calendar-item {
                background-color: #2563eb !important;
                color: #2563eb !important;
            }
            
            .custom-item.completed-item {
                background-color: #059669 !important;
                color: white !important;
                font-size: 10px !important;
                width: 20px !important;
                height: 20px !important;
            }
            
            .custom-item:hover {
                transform: scale(1.3);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
            }
            
            /* Current time line */
            .vis-current-time {
                background-color: #dc2626;
                width: 2px;
                box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
            }
            
            /* Time axis styling */
            .vis-time-axis {
                background: #f8fafc;
                border-top: 1px solid #e5e7eb;
                height: 50px;
            }
            
            .vis-time-axis .vis-text {
                color: #6b7280;
                font-size: 12px;
                font-weight: 500;
            }
            
            .vis-time-axis .vis-text.vis-major {
                color: #1f2937;
                font-size: 14px;
                font-weight: 600;
            }
            
            /* Grid lines */
            .vis-grid.vis-vertical {
                border-left: 1px solid #f3f4f6;
            }
            
            .vis-grid.vis-major {
                border-left: 1px solid #e5e7eb;
            }
            
            /* Remove focus outlines */
            .vis-timeline:focus {
                outline: none;
            }
        `;
        document.head.appendChild(style);
    }

    destroy() {
        if (this.timeline) {
            this.timeline.destroy();
            this.timeline = null;
        }
    }
}
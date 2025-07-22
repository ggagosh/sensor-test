export class SchedulingVisualizer {
    constructor() {
        this.chart = null;
        this.completedTaskPosition = 3;
        this.colors = {
            sensor: 'rgba(239, 68, 68, 0.8)',
            calendar: 'rgba(59, 130, 246, 0.8)',
            completed: 'rgba(16, 185, 129, 0.8)',
            grid: 'rgba(229, 231, 235, 0.5)',
            text: 'rgba(55, 65, 81, 1)'
        };
    }

    init() {
        const ctx = document.getElementById('timeline-canvas').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'point',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Maintenance Task Timeline (13 Months)',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const point = context.raw;
                                return [
                                    `Task #${point.taskNumber}`,
                                    `Type: ${point.taskType}`,
                                    `Date: ${new Date(point.x).toLocaleDateString()}`,
                                    point.interval ? `Interval: ${point.interval}` : ''
                                ].filter(Boolean);
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Timeline'
                        },
                        min: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                        max: new Date(new Date().setMonth(new Date().getMonth() + 7))
                    },
                    y: {
                        type: 'category',
                        labels: ['Sensor Tasks', 'Calendar Tasks', 'Completed Task'],
                        title: {
                            display: false
                        },
                        grid: {
                            display: true,
                            color: this.colors.grid
                        }
                    }
                }
            }
        });
    }

    updateVisualization(tasks, currentDate = new Date(), lastCompletedDate = null) {
        const datasets = [];
        
        // Sensor tasks dataset
        const sensorTasks = tasks.filter(t => t.triggerType === 'sensor');
        if (sensorTasks.length > 0) {
            datasets.push({
                label: 'Sensor Tasks',
                data: sensorTasks.map(task => ({
                    x: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
                    y: 'Sensor Tasks',
                    taskNumber: task.taskNumber,
                    taskType: 'Sensor',
                    interval: task.sensorInterval ? `${task.sensorInterval} hours` : null
                })),
                backgroundColor: this.colors.sensor,
                borderColor: this.colors.sensor,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            });
        }
        
        // Calendar tasks dataset
        const calendarTasks = tasks.filter(t => t.triggerType === 'calendar');
        if (calendarTasks.length > 0) {
            datasets.push({
                label: 'Calendar Tasks',
                data: calendarTasks.map(task => ({
                    x: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
                    y: 'Calendar Tasks',
                    taskNumber: task.taskNumber,
                    taskType: 'Calendar',
                    interval: task.calendarInterval ? `${task.calendarInterval.value} ${task.calendarInterval.unit}` : null
                })),
                backgroundColor: this.colors.calendar,
                borderColor: this.colors.calendar,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            });
        }
        
        // Completed task
        if (lastCompletedDate) {
            const yPosition = this.completedTaskPosition === 1 ? 'Sensor Tasks' : 
                           this.completedTaskPosition === 2 ? 'Calendar Tasks' : 
                           'Completed Task';
            
            datasets.push({
                label: 'Last Completed',
                data: [{
                    x: lastCompletedDate instanceof Date ? lastCompletedDate : new Date(lastCompletedDate),
                    y: yPosition,
                    taskNumber: 'Completed',
                    taskType: 'Completed',
                    interval: null
                }],
                backgroundColor: this.colors.completed,
                borderColor: this.colors.completed,
                pointRadius: 10,
                pointHoverRadius: 12,
                pointStyle: 'rectRot',
                showLine: false
            });
        }
        
        // Current date line
        const today = new Date();
        datasets.push({
            label: 'Today',
            data: [
                { x: today, y: 'Sensor Tasks' },
                { x: today, y: 'Calendar Tasks' },
                { x: today, y: 'Completed Task' }
            ],
            borderColor: 'rgba(220, 38, 38, 0.8)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            showLine: true,
            fill: false
        });
        
        // Update chart data
        this.chart.data.datasets = datasets;
        this.chart.update();
    }

    setCompletedTaskPosition(position) {
        this.completedTaskPosition = position;
    }

    renderScheduleDetails(tasks, container) {
        const html = `
            <div class="schedule-details">
                <h3>Scheduled Tasks</h3>
                <div class="chart-controls">
                    <button onclick="window.schedulingApp.visualizer.resetZoom()">Reset Zoom</button>
                    <span class="zoom-hint">Use mouse wheel to zoom, drag to pan</span>
                </div>
                <div class="task-list">
                    ${tasks.slice(0, 10).map(task => `
                        <div class="task-item">
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
                    ${tasks.length > 10 ? `<div class="task-item more">... and ${tasks.length - 10} more tasks</div>` : ''}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    resetZoom() {
        if (this.chart) {
            this.chart.resetZoom();
        }
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
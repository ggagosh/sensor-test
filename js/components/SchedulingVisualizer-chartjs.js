export class SchedulingVisualizer {
    constructor() {
        this.chart = null;
        this.colors = {
            calendar: 'rgba(54, 162, 235, 0.8)',
            sensor: 'rgba(255, 99, 132, 0.8)',
            both: 'rgba(153, 102, 255, 0.8)',
            completed: 'rgba(75, 192, 192, 0.8)',
            overdue: 'rgba(255, 159, 64, 0.8)',
            future: 'rgba(200, 200, 200, 0.5)'
        };
        this.completedTaskPosition = 3; // Default position for completed task
    }

    init() {
        const ctx = document.getElementById('timeline-chart').getContext('2d');
        
        // Calculate 13-month timeline
        const today = new Date();
        const startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6); // 6 months back
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 7); // 7 months forward
        
        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Maintenance Task Timeline (13 Months)'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const task = context.raw;
                                return [
                                    task.label || `Task #${task.taskNumber}`,
                                    `Date: ${new Date(task.x).toLocaleDateString()}`,
                                    task.status ? `Status: ${task.status}` : '',
                                    task.info || ''
                                ].filter(Boolean);
                            }
                        }
                    },
                    legend: {
                        display: false
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
                        min: startDate,
                        max: endDate,
                        title: {
                            display: true,
                            text: 'Timeline (13 Months)'
                        }
                    },
                    y: {
                        min: 0.5,
                        max: 3.5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                const labels = ['', 'Sensor Tasks', 'Calendar Tasks', 'Completed Task'];
                                return labels[value] || '';
                            }
                        },
                        title: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    updateVisualization(tasks, currentDate = new Date(), lastCompletedDate = null) {
        const datasets = [];
        
        // Sensor tasks (track 1)
        const sensorTasks = tasks.filter(t => t.triggerType === 'sensor');
        if (sensorTasks.length > 0) {
            datasets.push({
                label: 'Sensor Tasks',
                data: sensorTasks.map(task => ({
                    x: task.dueDate,
                    y: 1,
                    taskNumber: task.taskNumber,
                    label: `Sensor Task #${task.taskNumber}`,
                    status: task.dueDate < currentDate ? 'Overdue' : 'Scheduled',
                    info: `Every ${task.sensorInterval || 500} hours`
                })),
                backgroundColor: this.colors.sensor,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: true,
                borderColor: this.colors.sensor,
                borderWidth: 2,
                borderDash: [5, 5]
            });
        }

        // Calendar tasks (track 2)
        const calendarTasks = tasks.filter(t => t.triggerType === 'calendar');
        if (calendarTasks.length > 0) {
            datasets.push({
                label: 'Calendar Tasks',
                data: calendarTasks.map(task => ({
                    x: task.dueDate,
                    y: 2,
                    taskNumber: task.taskNumber,
                    label: `Calendar Task #${task.taskNumber}`,
                    status: task.dueDate < currentDate ? 'Overdue' : 'Scheduled',
                    info: task.calendarInfo || ''
                })),
                backgroundColor: this.colors.calendar,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: true,
                borderColor: this.colors.calendar,
                borderWidth: 2,
                borderDash: [5, 5]
            });
        }

        // Last completed task (track 3 or configurable)
        if (lastCompletedDate) {
            datasets.push({
                label: 'Last Completed Task',
                data: [{
                    x: lastCompletedDate,
                    y: this.completedTaskPosition,
                    label: 'Last Completed Task',
                    status: 'Completed',
                    info: `Completed on ${lastCompletedDate.toLocaleDateString()}`
                }],
                backgroundColor: this.colors.completed,
                pointRadius: 10,
                pointHoverRadius: 12,
                pointStyle: 'rectRot'
            });
        }

        // Add current date line
        datasets.push({
            label: 'Current Date',
            data: [
                { x: currentDate, y: 0.5 },
                { x: currentDate, y: 3.5 }
            ],
            borderColor: 'rgba(255, 0, 0, 0.7)',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            type: 'line',
            pointRadius: 0,
            borderWidth: 3,
            borderDash: [10, 5]
        });

        // Add timeline track lines
        const startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 6);
        const endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 7);
        
        for (let i = 1; i <= 3; i++) {
            datasets.push({
                label: `Track ${i}`,
                data: [
                    { x: startDate, y: i },
                    { x: endDate, y: i }
                ],
                borderColor: 'rgba(200, 200, 200, 0.3)',
                type: 'line',
                pointRadius: 0,
                borderWidth: 1,
                borderDash: [2, 2]
            });
        }

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
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
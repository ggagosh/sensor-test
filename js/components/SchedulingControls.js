export class SchedulingControls {
    constructor(schedulingLogic) {
        this.schedulingLogic = schedulingLogic;
        this.onChange = null;
        this.currentSettings = this.getDefaultSettings();
    }

    getDefaultSettings() {
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        
        return {
            trigger: this.schedulingLogic.TRIGGER_TYPES.BOTH,
            startPoint: this.schedulingLogic.START_POINTS.LAST_TASK_COMPLETED,
            intervalType: this.schedulingLogic.INTERVAL_TYPES.FIXED,
            recurrence: this.schedulingLogic.RECURRENCE.EVERY,
            preventiveOn: true,
            
            // Calendar settings
            calendarInterval: { value: 1, unit: 'months' },
            
            // Sensor settings
            sensorInterval: 500, // hours
            currentSensorValue: 2500,
            averageSensorRate: 24, // hours per day (ship running continuously)
            
            // Dates
            startDate: threeMonthsAgo,
            lastTaskCompletedDate: threeMonthsAgo,
            lastSensorUpdateDate: today,
            taskStartDate: threeMonthsAgo,
            periodChangeDate: threeMonthsAgo,
            
            // Display settings
            numberOfTasks: 30,
            completedTaskPosition: 3
        };
    }

    init(container) {
        this.container = container;
        this.render();
        this.attachEventListeners();
    }

    render() {
        const html = `
            <div class="control-group">
                <h3>Trigger Settings</h3>
                <div class="control-item">
                    <label for="trigger-type">Trigger Type:</label>
                    <select id="trigger-type">
                        <option value="${this.schedulingLogic.TRIGGER_TYPES.SENSOR}">Sensor Only</option>
                        <option value="${this.schedulingLogic.TRIGGER_TYPES.CALENDAR}">Calendar Only</option>
                        <option value="${this.schedulingLogic.TRIGGER_TYPES.BOTH}" selected>Sensor & Calendar (First Wins)</option>
                    </select>
                </div>
                
                <div class="control-item">
                    <label for="start-point">Start Point:</label>
                    <select id="start-point">
                        <option value="${this.schedulingLogic.START_POINTS.LAST_SENSOR_UPDATE}">Last Sensor Update</option>
                        <option value="${this.schedulingLogic.START_POINTS.LAST_TASK_COMPLETED}" selected>Last Task Completed</option>
                        <option value="${this.schedulingLogic.START_POINTS.TASK_START_DATE}">Task Start Date</option>
                        <option value="${this.schedulingLogic.START_POINTS.PERIOD_CHANGE_DATE}">Equipment Period Change</option>
                    </select>
                </div>
                
                <div class="control-item">
                    <label for="interval-type">Interval Type:</label>
                    <select id="interval-type">
                        <option value="${this.schedulingLogic.INTERVAL_TYPES.FIXED}" selected>Fixed</option>
                        <option value="${this.schedulingLogic.INTERVAL_TYPES.FLOATING}">Floating</option>
                    </select>
                </div>
                
                <div class="control-item">
                    <label for="recurrence">Recurrence:</label>
                    <select id="recurrence">
                        <option value="${this.schedulingLogic.RECURRENCE.ONCE}">Once</option>
                        <option value="${this.schedulingLogic.RECURRENCE.EVERY}" selected>Every</option>
                    </select>
                </div>
            </div>

            <div class="control-group" id="calendar-settings">
                <h3>Calendar Settings</h3>
                <div class="control-item">
                    <label for="calendar-interval-value">Calendar Interval:</label>
                    <input type="number" id="calendar-interval-value" value="1" min="1">
                    <select id="calendar-interval-unit">
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months" selected>Months</option>
                        <option value="years">Years</option>
                    </select>
                </div>
            </div>

            <div class="control-group" id="sensor-settings">
                <h3>Sensor Settings</h3>
                <div class="control-item">
                    <label for="sensor-interval">Sensor Interval (hours):</label>
                    <input type="number" id="sensor-interval" value="500" min="1">
                </div>
                
                <div class="control-item">
                    <label for="current-sensor-value">Current Sensor Value:</label>
                    <input type="number" id="current-sensor-value" value="2500" min="0">
                </div>
                
                <div class="control-item">
                    <label for="average-sensor-rate">Average Rate (hours/day):</label>
                    <input type="number" id="average-sensor-rate" value="24" min="0.1" step="0.1">
                </div>
                
                <div class="control-item">
                    <label for="preventive-mode">
                        <input type="checkbox" id="preventive-mode" checked>
                        Preventive Mode (Always schedule future dates)
                    </label>
                </div>
            </div>

            <div class="control-group">
                <h3>Date Settings</h3>
                <div class="control-item">
                    <label for="last-task-date">Last Task Completed:</label>
                    <input type="date" id="last-task-date" value="${this.formatDateForInput(this.currentSettings.lastTaskCompletedDate)}">
                </div>
                
                <div class="control-item">
                    <label for="last-sensor-date">Last Sensor Update:</label>
                    <input type="date" id="last-sensor-date" value="${this.formatDateForInput(this.currentSettings.lastSensorUpdateDate)}">
                </div>
                
                <div class="control-item">
                    <label for="task-start-date">Task Start Date:</label>
                    <input type="date" id="task-start-date" value="${this.formatDateForInput(this.currentSettings.taskStartDate)}">
                </div>
                
                <div class="control-item">
                    <label for="period-change-date">Period Change Date:</label>
                    <input type="date" id="period-change-date" value="${this.formatDateForInput(this.currentSettings.periodChangeDate)}">
                </div>
            </div>

            <div class="control-group">
                <h3>Display Settings</h3>
                <div class="control-item">
                    <label for="number-of-tasks">Number of Tasks to Show:</label>
                    <input type="number" id="number-of-tasks" value="30" min="1" max="50">
                </div>
                
                <div class="control-item">
                    <label for="completed-task-position">Completed Task Position:</label>
                    <select id="completed-task-position">
                        <option value="3" selected>Track 3 (Bottom)</option>
                        <option value="2">Track 2 (Middle - Calendar)</option>
                        <option value="1">Track 1 (Top - Sensor)</option>
                    </select>
                </div>
            </div>

            <button id="update-schedule" class="primary-button">Update Schedule</button>
        `;
        
        this.container.innerHTML = html;
    }

    attachEventListeners() {
        // Trigger type change
        document.getElementById('trigger-type').addEventListener('change', (e) => {
            this.updateVisibility(e.target.value);
        });

        // Update button
        document.getElementById('update-schedule').addEventListener('click', () => {
            this.updateSettings();
            if (this.onChange) {
                this.onChange(this.currentSettings);
            }
        });

        // Auto-update on Enter key
        this.container.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.updateSettings();
                if (this.onChange) {
                    this.onChange(this.currentSettings);
                }
            }
        });
    }

    updateVisibility(triggerType) {
        const calendarSettings = document.getElementById('calendar-settings');
        const sensorSettings = document.getElementById('sensor-settings');
        
        if (triggerType === this.schedulingLogic.TRIGGER_TYPES.SENSOR) {
            calendarSettings.style.display = 'none';
            sensorSettings.style.display = 'block';
        } else if (triggerType === this.schedulingLogic.TRIGGER_TYPES.CALENDAR) {
            calendarSettings.style.display = 'block';
            sensorSettings.style.display = 'none';
        } else {
            calendarSettings.style.display = 'block';
            sensorSettings.style.display = 'block';
        }
    }

    updateSettings() {
        this.currentSettings = {
            trigger: document.getElementById('trigger-type').value,
            startPoint: document.getElementById('start-point').value,
            intervalType: document.getElementById('interval-type').value,
            recurrence: document.getElementById('recurrence').value,
            preventiveOn: document.getElementById('preventive-mode').checked,
            
            calendarInterval: {
                value: parseInt(document.getElementById('calendar-interval-value').value),
                unit: document.getElementById('calendar-interval-unit').value
            },
            
            sensorInterval: parseFloat(document.getElementById('sensor-interval').value),
            currentSensorValue: parseFloat(document.getElementById('current-sensor-value').value),
            averageSensorRate: parseFloat(document.getElementById('average-sensor-rate').value),
            
            lastTaskCompletedDate: new Date(document.getElementById('last-task-date').value),
            lastSensorUpdateDate: new Date(document.getElementById('last-sensor-date').value),
            taskStartDate: new Date(document.getElementById('task-start-date').value),
            periodChangeDate: new Date(document.getElementById('period-change-date').value),
            
            numberOfTasks: parseInt(document.getElementById('number-of-tasks').value),
            completedTaskPosition: parseInt(document.getElementById('completed-task-position').value),
            
            startDate: this.currentSettings.startDate
        };
    }

    formatDateForInput(date) {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
    }

    setOnChange(callback) {
        this.onChange = callback;
    }
}
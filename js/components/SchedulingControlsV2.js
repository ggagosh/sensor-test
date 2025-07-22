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
            isFloating: false,
            triggers: {
                calendar: true,
                sensor: true,
                isCoexisting: true
            },
            definitionStartDate: threeMonthsAgo,
            calendarConfig: {
                isRepeating: true,
                repeatEvery: 1,
                interval: 'month',
                scheduleFirstFromInterval: false
            },
            sensorConfig: {
                isOnce: false,
                triggerValue: 500,
                preventive: true
            },
            context: {
                lastCompletedTaskDate: threeMonthsAgo,
                lastSensorValue: 2500,
                lastSensorDate: today,
                averageSensorRate: 24 // hours per day
            },
            displaySettings: {
                numberOfTasks: 30,
                completedTaskPosition: 3
            }
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
                <h3>Interval Type</h3>
                <div class="control-item">
                    <label>
                        <input type="radio" name="interval-type" value="fixed" ${!this.currentSettings.isFloating ? 'checked' : ''}>
                        Fixed - Intervals never change
                    </label>
                </div>
                <div class="control-item">
                    <label>
                        <input type="radio" name="interval-type" value="floating" ${this.currentSettings.isFloating ? 'checked' : ''}>
                        Floating - Intervals adjust when overdue
                    </label>
                </div>
            </div>

            <div class="control-group">
                <h3>Trigger Configuration</h3>
                <div class="control-item">
                    <label>
                        <input type="checkbox" id="trigger-calendar" ${this.currentSettings.triggers.calendar ? 'checked' : ''}>
                        Calendar Trigger
                    </label>
                </div>
                <div class="control-item">
                    <label>
                        <input type="checkbox" id="trigger-sensor" ${this.currentSettings.triggers.sensor ? 'checked' : ''}>
                        Sensor Trigger
                    </label>
                </div>
                <div class="control-item" id="coexisting-container" style="${this.currentSettings.triggers.calendar && this.currentSettings.triggers.sensor ? '' : 'display: none'}">
                    <label>
                        <input type="checkbox" id="is-coexisting" ${this.currentSettings.triggers.isCoexisting ? 'checked' : ''}>
                        Coexisting (Both triggers run independently)
                    </label>
                    <small>When unchecked: First trigger wins</small>
                </div>
            </div>

            <div class="control-group">
                <h3>Definition Start Date</h3>
                <div class="control-item">
                    <input type="date" id="definition-start-date" value="${this.formatDateForInput(this.currentSettings.definitionStartDate)}">
                </div>
            </div>

            <div class="control-group" id="calendar-settings" style="${this.currentSettings.triggers.calendar ? '' : 'display: none'}">
                <h3>Calendar Settings</h3>
                <div class="control-item">
                    <label>
                        <input type="checkbox" id="calendar-repeating" ${this.currentSettings.calendarConfig.isRepeating ? 'checked' : ''}>
                        Repeating Task
                    </label>
                </div>
                <div id="calendar-repeat-config" style="${this.currentSettings.calendarConfig.isRepeating ? '' : 'display: none'}">
                    <div class="control-item">
                        <label>Repeat every:</label>
                        <input type="number" id="calendar-repeat-value" value="${this.currentSettings.calendarConfig.repeatEvery}" min="1" style="width: 60px">
                        <select id="calendar-interval">
                            <option value="day" ${this.currentSettings.calendarConfig.interval === 'day' ? 'selected' : ''}>Day(s)</option>
                            <option value="month" ${this.currentSettings.calendarConfig.interval === 'month' ? 'selected' : ''}>Month(s)</option>
                            <option value="year" ${this.currentSettings.calendarConfig.interval === 'year' ? 'selected' : ''}>Year(s)</option>
                        </select>
                    </div>
                    <div class="control-item">
                        <label>
                            <input type="checkbox" id="schedule-first-from-interval" ${this.currentSettings.calendarConfig.scheduleFirstFromInterval ? 'checked' : ''}>
                            Schedule first task after interval
                        </label>
                        <small>When disabled: First task on start date</small>
                    </div>
                </div>
            </div>

            <div class="control-group" id="sensor-settings" style="${this.currentSettings.triggers.sensor ? '' : 'display: none'}">
                <h3>Sensor Settings</h3>
                <div class="control-item">
                    <label>
                        <input type="radio" name="sensor-generation" value="every" ${!this.currentSettings.sensorConfig.isOnce ? 'checked' : ''}>
                        Generate Every
                    </label>
                    <label>
                        <input type="radio" name="sensor-generation" value="once" ${this.currentSettings.sensorConfig.isOnce ? 'checked' : ''}>
                        Generate Once
                    </label>
                </div>
                <div class="control-item">
                    <label>Trigger Value:</label>
                    <input type="number" id="sensor-trigger-value" value="${this.currentSettings.sensorConfig.triggerValue}" min="1"> units
                </div>
                <div class="control-item">
                    <label>
                        <input type="checkbox" id="sensor-preventive" ${this.currentSettings.sensorConfig.preventive ? 'checked' : ''}>
                        Preventive Mode
                    </label>
                    <small>Always schedule future dates based on average</small>
                </div>
            </div>

            <div class="control-group">
                <h3>Context Data</h3>
                <div class="control-item">
                    <label>Last Completed Task:</label>
                    <input type="date" id="last-completed-date" value="${this.formatDateForInput(this.currentSettings.context.lastCompletedTaskDate)}">
                </div>
                <div class="control-item">
                    <label>Last Sensor Value:</label>
                    <input type="number" id="last-sensor-value" value="${this.currentSettings.context.lastSensorValue}" min="0">
                </div>
                <div class="control-item">
                    <label>Last Sensor Update:</label>
                    <input type="date" id="last-sensor-date" value="${this.formatDateForInput(this.currentSettings.context.lastSensorDate)}">
                </div>
                <div class="control-item">
                    <label>Average Sensor Rate:</label>
                    <input type="number" id="average-sensor-rate" value="${this.currentSettings.context.averageSensorRate}" min="0.1" step="0.1"> units/day
                </div>
            </div>

            <div class="control-group">
                <h3>Display Settings</h3>
                <div class="control-item">
                    <label>Number of Tasks:</label>
                    <input type="number" id="number-of-tasks" value="${this.currentSettings.displaySettings.numberOfTasks}" min="1" max="50">
                </div>
                <div class="control-item">
                    <label>Completed Task Position:</label>
                    <select id="completed-task-position">
                        <option value="1" ${this.currentSettings.displaySettings.completedTaskPosition === 1 ? 'selected' : ''}>Sensor Track</option>
                        <option value="2" ${this.currentSettings.displaySettings.completedTaskPosition === 2 ? 'selected' : ''}>Calendar Track</option>
                        <option value="3" ${this.currentSettings.displaySettings.completedTaskPosition === 3 ? 'selected' : ''}>Separate Track</option>
                    </select>
                </div>
            </div>

            <button id="update-schedule" class="primary-button">Update Schedule</button>
        `;
        
        this.container.innerHTML = html;
    }

    attachEventListeners() {
        // Trigger checkboxes
        document.getElementById('trigger-calendar').addEventListener('change', (e) => {
            this.updateTriggerVisibility();
        });
        
        document.getElementById('trigger-sensor').addEventListener('change', (e) => {
            this.updateTriggerVisibility();
        });
        
        // Calendar repeating
        document.getElementById('calendar-repeating').addEventListener('change', (e) => {
            document.getElementById('calendar-repeat-config').style.display = 
                e.target.checked ? '' : 'none';
        });

        // Update button
        document.getElementById('update-schedule').addEventListener('click', () => {
            this.updateSettings();
            if (this.onChange) {
                this.onChange(this.currentSettings);
            }
        });
    }

    updateTriggerVisibility() {
        const calendarChecked = document.getElementById('trigger-calendar').checked;
        const sensorChecked = document.getElementById('trigger-sensor').checked;
        
        document.getElementById('calendar-settings').style.display = calendarChecked ? '' : 'none';
        document.getElementById('sensor-settings').style.display = sensorChecked ? '' : 'none';
        document.getElementById('coexisting-container').style.display = 
            (calendarChecked && sensorChecked) ? '' : 'none';
    }

    updateSettings() {
        // Get interval type
        const intervalType = document.querySelector('input[name="interval-type"]:checked').value;
        
        // Get last completed date
        const lastCompletedInput = document.getElementById('last-completed-date').value;
        const lastCompletedDate = lastCompletedInput ? new Date(lastCompletedInput) : null;
        
        this.currentSettings = {
            isFloating: intervalType === 'floating',
            triggers: {
                calendar: document.getElementById('trigger-calendar').checked,
                sensor: document.getElementById('trigger-sensor').checked,
                isCoexisting: document.getElementById('is-coexisting').checked
            },
            definitionStartDate: new Date(document.getElementById('definition-start-date').value),
            calendarConfig: {
                isRepeating: document.getElementById('calendar-repeating').checked,
                repeatEvery: parseInt(document.getElementById('calendar-repeat-value').value),
                interval: document.getElementById('calendar-interval').value,
                scheduleFirstFromInterval: document.getElementById('schedule-first-from-interval').checked
            },
            sensorConfig: {
                isOnce: document.querySelector('input[name="sensor-generation"]:checked').value === 'once',
                triggerValue: parseFloat(document.getElementById('sensor-trigger-value').value),
                preventive: document.getElementById('sensor-preventive').checked
            },
            context: {
                lastCompletedTaskDate: lastCompletedDate,
                lastSensorValue: parseFloat(document.getElementById('last-sensor-value').value),
                lastSensorDate: new Date(document.getElementById('last-sensor-date').value),
                averageSensorRate: parseFloat(document.getElementById('average-sensor-rate').value)
            },
            displaySettings: {
                numberOfTasks: parseInt(document.getElementById('number-of-tasks').value),
                completedTaskPosition: parseInt(document.getElementById('completed-task-position').value)
            }
        };
    }

    formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
    }

    setOnChange(callback) {
        this.onChange = callback;
    }
}
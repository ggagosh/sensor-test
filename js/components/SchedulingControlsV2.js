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
                averageSensorRate: 24, // hours per day
                lastMaintenanceValue: 0 // Value at last maintenance
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
        this.renderSimulation();
        this.attachEventListeners();
    }

    render() {
        const html = `
            <div class="control-group">
                <h3>Interval Type</h3>
                <div class="radio-group">
                    <label class="radio-inline">
                        <input type="radio" name="interval-type" value="fixed" ${!this.currentSettings.isFloating ? 'checked' : ''}>
                        Fixed
                    </label>
                    <label class="radio-inline">
                        <input type="radio" name="interval-type" value="floating" ${this.currentSettings.isFloating ? 'checked' : ''}>
                        Floating
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
                    <div class="control-item inline-controls">
                        <label style="display: inline-block; margin-right: 10px;">Repeat every:</label>
                        <input type="number" id="calendar-repeat-value" value="${this.currentSettings.calendarConfig.repeatEvery}" min="1">
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
                <div class="radio-group">
                    <label class="radio-inline">
                        <input type="radio" name="sensor-generation" value="every" ${!this.currentSettings.sensorConfig.isOnce ? 'checked' : ''}>
                        Generate Every
                    </label>
                    <label class="radio-inline">
                        <input type="radio" name="sensor-generation" value="once" ${this.currentSettings.sensorConfig.isOnce ? 'checked' : ''}>
                        Generate Once
                    </label>
                </div>
                <div class="control-item inline-controls">
                    <label style="display: inline-block; margin-right: 10px;">Trigger Value:</label>
                    <input type="number" id="sensor-trigger-value" value="${this.currentSettings.sensorConfig.triggerValue}" min="1">
                    <span style="margin-left: 5px;">units</span>
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
                <div class="control-item">
                    <label>Last Maintenance Value:</label>
                    <input type="number" id="last-maintenance-value" value="${this.currentSettings.context.lastMaintenanceValue}" min="0" placeholder="Sensor value at last maintenance">
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

    renderSimulation() {
        const simulationContainer = document.getElementById('sensor-simulation-container');
        if (!simulationContainer) return;

        const html = `
            <div class="control-item">
                <label>New Sensor Value:</label>
                <input type="number" id="new-sensor-value" placeholder="Enter value" min="0" class="full-width">
            </div>
            <div class="control-item">
                <label>Sensor Date:</label>
                <input type="date" id="new-sensor-date" value="${this.formatDateForInput(new Date())}" class="full-width">
            </div>
            <div class="control-item">
                <label>Average Rate Override:</label>
                <div class="inline-controls">
                    <input type="number" id="new-avg-rate" placeholder="Optional" min="0.1" step="0.1">
                    <small style="margin-left: 5px;">units/day</small>
                </div>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button id="simulate-sensor" class="secondary-button" style="width: 100%;">Apply Simulation</button>
            </div>
            <div id="simulation-info" style="display: none;">
                <div class="simulation-result">
                    <strong>Result:</strong>
                    <div id="simulation-details"></div>
                </div>
            </div>
        `;
        
        simulationContainer.innerHTML = html;
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

        // Simulate sensor button
        document.getElementById('simulate-sensor').addEventListener('click', () => {
            this.simulateSensorInput();
        });

        // Enter key in sensor input
        document.getElementById('new-sensor-value').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.simulateSensorInput();
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
                averageSensorRate: parseFloat(document.getElementById('average-sensor-rate').value),
                lastMaintenanceValue: parseFloat(document.getElementById('last-maintenance-value').value) || 0
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

    simulateSensorInput() {
        const newValueInput = document.getElementById('new-sensor-value');
        const newDateInput = document.getElementById('new-sensor-date');
        const newAvgRateInput = document.getElementById('new-avg-rate');
        
        const newValue = parseFloat(newValueInput.value);
        const newDate = new Date(newDateInput.value);
        const overrideAvgRate = newAvgRateInput.value ? parseFloat(newAvgRateInput.value) : null;
        
        if (isNaN(newValue) || newValue < 0) {
            alert('Please enter a valid sensor value');
            return;
        }

        const oldValue = this.currentSettings.context.lastSensorValue;
        const oldDate = this.currentSettings.context.lastSensorDate;
        const difference = newValue - oldValue;
        const daysSinceLastUpdate = (newDate - oldDate) / (1000 * 60 * 60 * 24);
        const actualRate = daysSinceLastUpdate > 0 ? difference / daysSinceLastUpdate : 0;

        // Calculate new average rate
        let newAverageRate;
        if (overrideAvgRate !== null) {
            // Use override if provided
            newAverageRate = overrideAvgRate;
        } else if (daysSinceLastUpdate > 0) {
            // Calculate weighted average (30% new, 70% old)
            newAverageRate = (actualRate * 0.3 + this.currentSettings.context.averageSensorRate * 0.7);
        } else {
            // Keep current average if no time has passed
            newAverageRate = this.currentSettings.context.averageSensorRate;
        }

        // Update the context with new sensor data
        const simulatedSettings = {
            ...this.currentSettings,
            context: {
                ...this.currentSettings.context,
                lastSensorValue: newValue,
                lastSensorDate: newDate,
                averageSensorRate: newAverageRate,
                // Keep the existing maintenance value unless it's a maintenance simulation
                lastMaintenanceValue: this.currentSettings.context.lastMaintenanceValue
            }
        };

        // Show simulation info
        const infoDiv = document.getElementById('simulation-info');
        const detailsDiv = document.getElementById('simulation-details');
        
        detailsDiv.innerHTML = `
            <div style="margin-top: 8px; font-size: 11px; line-height: 1.4;">
                <div><strong>Value:</strong> ${oldValue.toFixed(1)} → ${newValue.toFixed(1)} (${difference > 0 ? '+' : ''}${difference.toFixed(1)})</div>
                <div><strong>Date:</strong> ${this.formatDateForInput(oldDate)} → ${this.formatDateForInput(newDate)}</div>
                <div><strong>Days:</strong> ${daysSinceLastUpdate.toFixed(1)} days</div>
                <div><strong>Actual Rate:</strong> ${actualRate.toFixed(2)} units/day</div>
                <div><strong>New Avg Rate:</strong> ${simulatedSettings.context.averageSensorRate.toFixed(2)} units/day${overrideAvgRate !== null ? ' (override)' : ''}</div>
            </div>
        `;
        
        infoDiv.style.display = 'block';

        // Update the inputs to reflect the simulation
        document.getElementById('last-sensor-value').value = newValue;
        document.getElementById('last-sensor-date').value = this.formatDateForInput(newDate);
        document.getElementById('average-sensor-rate').value = simulatedSettings.context.averageSensorRate.toFixed(2);

        // Clear the simulation inputs
        newValueInput.value = '';
        newAvgRateInput.value = '';

        // Trigger update with simulated settings
        this.currentSettings = simulatedSettings;
        if (this.onChange) {
            this.onChange(this.currentSettings, true); // true indicates this is a simulation
        }
    }
}
export class SchedulingLogic {
    constructor() {
        this.TRIGGER_TYPES = {
            SENSOR: 'sensor',
            CALENDAR: 'calendar',
            BOTH: 'both'
        };

        this.START_POINTS = {
            LAST_SENSOR_UPDATE: 'lastSensorUpdate',
            LAST_TASK_COMPLETED: 'lastTaskCompleted',
            TASK_START_DATE: 'taskStartDate',
            PERIOD_CHANGE_DATE: 'periodChangeDate'
        };

        this.INTERVAL_TYPES = {
            FIXED: 'fixed',
            FLOATING: 'floating'
        };

        this.RECURRENCE = {
            ONCE: 'once',
            EVERY: 'every'
        };
    }

    calculateNextTaskDate(params) {
        const {
            trigger,
            startPoint,
            startDate,
            intervalType,
            recurrence,
            calendarInterval,
            sensorInterval,
            currentSensorValue,
            averageSensorRate,
            preventiveOn,
            lastTaskCompletedDate,
            lastSensorUpdateDate,
            taskStartDate,
            periodChangeDate,
            currentDate = new Date()
        } = params;

        // Determine the base date based on start point
        let baseDate = this.getBaseDate({
            startPoint,
            lastTaskCompletedDate,
            lastSensorUpdateDate,
            taskStartDate,
            periodChangeDate,
            startDate
        });

        const results = {
            nextCalendarDate: null,
            nextSensorDate: null,
            nextTaskDate: null,
            triggerType: null,
            explanation: ''
        };

        // Calculate calendar-based next date
        if (trigger === this.TRIGGER_TYPES.CALENDAR || trigger === this.TRIGGER_TYPES.BOTH) {
            results.nextCalendarDate = this.calculateCalendarDate(
                baseDate,
                calendarInterval,
                intervalType,
                currentDate
            );
        }

        // Calculate sensor-based next date
        if (trigger === this.TRIGGER_TYPES.SENSOR || trigger === this.TRIGGER_TYPES.BOTH) {
            results.nextSensorDate = this.calculateSensorDate(
                baseDate,
                sensorInterval,
                currentSensorValue,
                averageSensorRate,
                preventiveOn,
                intervalType,
                currentDate
            );
        }

        // Determine the actual next task date
        if (trigger === this.TRIGGER_TYPES.BOTH) {
            // Use whichever comes first
            if (results.nextCalendarDate && results.nextSensorDate) {
                if (results.nextCalendarDate < results.nextSensorDate) {
                    results.nextTaskDate = results.nextCalendarDate;
                    results.triggerType = 'calendar';
                } else {
                    results.nextTaskDate = results.nextSensorDate;
                    results.triggerType = 'sensor';
                }
            } else {
                results.nextTaskDate = results.nextCalendarDate || results.nextSensorDate;
                results.triggerType = results.nextCalendarDate ? 'calendar' : 'sensor';
            }
        } else if (trigger === this.TRIGGER_TYPES.CALENDAR) {
            results.nextTaskDate = results.nextCalendarDate;
            results.triggerType = 'calendar';
        } else {
            results.nextTaskDate = results.nextSensorDate;
            results.triggerType = 'sensor';
        }

        // Generate explanation
        results.explanation = this.generateExplanation(params, results);

        return results;
    }

    getBaseDate(params) {
        const {
            startPoint,
            lastTaskCompletedDate,
            lastSensorUpdateDate,
            taskStartDate,
            periodChangeDate,
            startDate
        } = params;

        switch (startPoint) {
            case this.START_POINTS.LAST_TASK_COMPLETED:
                return lastTaskCompletedDate || startDate;
            case this.START_POINTS.LAST_SENSOR_UPDATE:
                return lastSensorUpdateDate || startDate;
            case this.START_POINTS.TASK_START_DATE:
                return taskStartDate || startDate;
            case this.START_POINTS.PERIOD_CHANGE_DATE:
                return periodChangeDate || startDate;
            default:
                return startDate;
        }
    }

    calculateCalendarDate(baseDate, interval, intervalType, currentDate) {
        if (!interval || !baseDate) return null;

        const { value, unit } = interval;
        let nextDate = new Date(baseDate);

        // Add one interval first
        switch (unit) {
            case 'days':
                nextDate.setDate(nextDate.getDate() + value);
                break;
            case 'weeks':
                nextDate.setDate(nextDate.getDate() + (value * 7));
                break;
            case 'months':
                nextDate.setMonth(nextDate.getMonth() + value);
                break;
            case 'years':
                nextDate.setFullYear(nextDate.getFullYear() + value);
                break;
        }

        // If still in the past, keep adding intervals
        while (nextDate < currentDate) {
            switch (unit) {
                case 'days':
                    nextDate.setDate(nextDate.getDate() + value);
                    break;
                case 'weeks':
                    nextDate.setDate(nextDate.getDate() + (value * 7));
                    break;
                case 'months':
                    nextDate.setMonth(nextDate.getMonth() + value);
                    break;
                case 'years':
                    nextDate.setFullYear(nextDate.getFullYear() + value);
                    break;
            }
        }

        return nextDate;
    }

    calculateSensorDate(baseDate, sensorInterval, currentValue, averageRate, preventiveOn, intervalType, currentDate) {
        if (!sensorInterval || !averageRate) return null;

        // Calculate days to reach next interval (sensor interval in hours / average rate in hours per day)
        const daysPerInterval = sensorInterval / averageRate;
        
        let nextDate = new Date(baseDate);
        let intervalsToAdd = 1;
        
        // Calculate next sensor date based on intervals
        nextDate.setTime(nextDate.getTime() + (daysPerInterval * 24 * 60 * 60 * 1000));
        
        // If the calculated date is in the past, skip to future
        while (nextDate < currentDate) {
            intervalsToAdd++;
            nextDate = new Date(baseDate);
            nextDate.setTime(nextDate.getTime() + (daysPerInterval * intervalsToAdd * 24 * 60 * 60 * 1000));
        }

        // If preventive is off, check if sensor value would have reached threshold
        if (!preventiveOn) {
            const daysSinceBase = (nextDate - baseDate) / (24 * 60 * 60 * 1000);
            const hoursElapsed = daysSinceBase * averageRate;
            
            // If hours elapsed is less than the interval, don't schedule
            if (hoursElapsed < sensorInterval * intervalsToAdd) {
                return null;
            }
        }

        return nextDate;
    }

    generateTaskSeries(params, numberOfTasks = 10) {
        if (params.trigger === this.TRIGGER_TYPES.BOTH) {
            // Generate sensor and calendar tasks independently when BOTH is selected
            const tasks = [];
            
            // Generate sensor tasks
            const sensorParams = { ...params, trigger: this.TRIGGER_TYPES.SENSOR };
            const sensorTasks = this._generateSingleTypeSeries(sensorParams, numberOfTasks);
            
            // Generate calendar tasks
            const calendarParams = { ...params, trigger: this.TRIGGER_TYPES.CALENDAR };
            const calendarTasks = this._generateSingleTypeSeries(calendarParams, numberOfTasks);
            
            // Merge and sort by date
            tasks.push(...sensorTasks, ...calendarTasks);
            tasks.sort((a, b) => a.dueDate - b.dueDate);
            
            // Renumber tasks
            tasks.forEach((task, index) => {
                task.taskNumber = index + 1;
            });
            
            // Return limited to requested number
            return tasks.slice(0, numberOfTasks);
        } else {
            // Single trigger type
            return this._generateSingleTypeSeries(params, numberOfTasks);
        }
    }

    _generateSingleTypeSeries(params, numberOfTasks) {
        const tasks = [];
        let currentParams = { ...params };
        
        for (let i = 0; i < numberOfTasks; i++) {
            const result = this.calculateNextTaskDate(currentParams);
            
            if (!result.nextTaskDate) break;
            
            tasks.push({
                taskNumber: i + 1,
                dueDate: result.nextTaskDate,
                triggerType: result.triggerType,
                calendarDate: result.nextCalendarDate,
                sensorDate: result.nextSensorDate,
                sensorInterval: params.sensorInterval,
                calendarInterval: params.calendarInterval
            });

            // Update params for next iteration
            if (params.recurrence === this.RECURRENCE.ONCE) {
                break; // Only generate one task
            }

            // Update the base date for next calculation
            switch (currentParams.startPoint) {
                case this.START_POINTS.LAST_TASK_COMPLETED:
                    currentParams.lastTaskCompletedDate = result.nextTaskDate;
                    break;
                case this.START_POINTS.LAST_SENSOR_UPDATE:
                    if (params.intervalType === this.INTERVAL_TYPES.FLOATING) {
                        currentParams.lastSensorUpdateDate = result.nextTaskDate;
                    }
                    break;
                case this.START_POINTS.TASK_START_DATE:
                    if (params.intervalType === this.INTERVAL_TYPES.FLOATING) {
                        currentParams.taskStartDate = result.nextTaskDate;
                    }
                    break;
                case this.START_POINTS.PERIOD_CHANGE_DATE:
                    if (params.intervalType === this.INTERVAL_TYPES.FLOATING) {
                        currentParams.periodChangeDate = result.nextTaskDate;
                    }
                    break;
            }
        }

        return tasks;
    }

    generateExplanation(params, results) {
        let explanation = [];
        
        explanation.push(`Trigger Type: ${params.trigger}`);
        explanation.push(`Start Point: ${this.formatStartPoint(params.startPoint)}`);
        explanation.push(`Interval Type: ${params.intervalType}`);
        explanation.push(`Recurrence: ${params.recurrence}`);
        
        if (params.trigger !== this.TRIGGER_TYPES.CALENDAR) {
            explanation.push(`Preventive Mode: ${params.preventiveOn ? 'ON' : 'OFF'}`);
        }

        if (results.nextTaskDate) {
            explanation.push(`\nNext task triggered by: ${results.triggerType}`);
            
            if (params.intervalType === this.INTERVAL_TYPES.FLOATING) {
                explanation.push('Using floating interval - adjusted to current date if overdue');
            } else {
                explanation.push('Using fixed interval - maintains original schedule');
            }
        }

        return explanation.join('\n');
    }

    formatStartPoint(startPoint) {
        const labels = {
            [this.START_POINTS.LAST_SENSOR_UPDATE]: 'Last Sensor Update',
            [this.START_POINTS.LAST_TASK_COMPLETED]: 'Last Task Completed',
            [this.START_POINTS.TASK_START_DATE]: 'Task Start Date',
            [this.START_POINTS.PERIOD_CHANGE_DATE]: 'Equipment Period Change'
        };
        return labels[startPoint] || startPoint;
    }
}
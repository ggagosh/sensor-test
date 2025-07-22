export class SchedulingLogic {
    constructor() {
        // Interval types for calendar
        this.CALENDAR_INTERVALS = {
            DAY: 'day',
            MONTH: 'month',
            YEAR: 'year'
        };
    }

    /**
     * Calculate next task dates based on actual system parameters
     * @param {Object} params - Scheduling parameters
     * @param {boolean} params.isFloating - Fixed or floating intervals
     * @param {Object} params.triggers - Trigger configuration
     * @param {boolean} params.triggers.calendar - Calendar trigger enabled
     * @param {boolean} params.triggers.sensor - Sensor trigger enabled
     * @param {boolean} params.triggers.isCoexisting - Both triggers at same time
     * @param {Date} params.definitionStartDate - Definition start date (can be null)
     * @param {Object} params.calendarConfig - Calendar trigger configuration
     * @param {boolean} params.calendarConfig.isRepeating - Is repeating task
     * @param {number} params.calendarConfig.repeatEvery - Repeat interval value
     * @param {string} params.calendarConfig.interval - Interval type (day/month/year)
     * @param {boolean} params.calendarConfig.scheduleFirstFromInterval - Schedule first task from interval
     * @param {Object} params.sensorConfig - Sensor trigger configuration
     * @param {boolean} params.sensorConfig.isOnce - Generate once or every
     * @param {number} params.sensorConfig.triggerValue - Sensor trigger value
     * @param {boolean} params.sensorConfig.preventive - Preventive mode on/off
     * @param {Object} params.context - External context
     * @param {Date} params.context.lastCompletedTaskDate - Last completed task date
     * @param {number} params.context.lastSensorValue - Last sensor value
     * @param {Date} params.context.lastSensorDate - Last sensor update date
     * @param {number} params.context.averageSensorRate - Average sensor rate per day
     */
    calculateNextTaskDate(params) {
        const {
            isFloating,
            triggers,
            definitionStartDate,
            calendarConfig,
            sensorConfig,
            context,
            currentDate = new Date()
        } = params;

        const results = {
            nextCalendarDate: null,
            nextSensorDate: null,
            nextTaskDate: null,
            triggerType: null,
            explanation: ''
        };

        // Determine base date
        const baseDate = this.determineBaseDate(params);

        // Calculate calendar-based next date
        if (triggers.calendar) {
            results.nextCalendarDate = this.calculateCalendarDate(
                baseDate,
                calendarConfig,
                isFloating,
                currentDate,
                context
            );
        }

        // Calculate sensor-based next date
        if (triggers.sensor) {
            results.nextSensorDate = this.calculateSensorDate(
                baseDate,
                sensorConfig,
                isFloating,
                currentDate,
                context
            );
        }

        // Determine the actual next task date
        if (triggers.isCoexisting && triggers.calendar && triggers.sensor) {
            // Both triggers active - generate both types independently
            results.triggerType = 'both';
            results.nextTaskDate = null; // Will be handled by generateTaskSeries
        } else if (triggers.calendar && triggers.sensor) {
            // Both enabled but not coexisting - use whichever comes first
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
        } else if (triggers.calendar) {
            results.nextTaskDate = results.nextCalendarDate;
            results.triggerType = 'calendar';
        } else if (triggers.sensor) {
            results.nextTaskDate = results.nextSensorDate;
            results.triggerType = 'sensor';
        }

        return results;
    }

    determineBaseDate(params) {
        const { definitionStartDate, context, calendarConfig } = params;
        
        // If we have a last completed task, use that as base
        if (context.lastCompletedTaskDate) {
            return context.lastCompletedTaskDate;
        }
        
        // Otherwise use definition start date
        if (definitionStartDate) {
            return definitionStartDate;
        }
        
        // Fallback to current date
        return new Date();
    }

    calculateCalendarDate(baseDate, config, isFloating, currentDate, context) {
        if (!config.isRepeating) {
            // One-time task - use the base date if it's in the future
            return baseDate >= currentDate ? baseDate : null;
        }

        let nextDate = new Date(baseDate);
        
        // If scheduleFirstFromInterval is true, add interval to base date
        // Otherwise, first task is on the base date itself
        if (config.scheduleFirstFromInterval || context.lastCompletedTaskDate) {
            // Add interval
            switch (config.interval) {
                case this.CALENDAR_INTERVALS.DAY:
                    nextDate.setDate(nextDate.getDate() + config.repeatEvery);
                    break;
                case this.CALENDAR_INTERVALS.MONTH:
                    nextDate.setMonth(nextDate.getMonth() + config.repeatEvery);
                    break;
                case this.CALENDAR_INTERVALS.YEAR:
                    nextDate.setFullYear(nextDate.getFullYear() + config.repeatEvery);
                    break;
            }
        }

        // Skip to future if needed (never generate overdue tasks)
        while (nextDate < currentDate) {
            switch (config.interval) {
                case this.CALENDAR_INTERVALS.DAY:
                    nextDate.setDate(nextDate.getDate() + config.repeatEvery);
                    break;
                case this.CALENDAR_INTERVALS.MONTH:
                    nextDate.setMonth(nextDate.getMonth() + config.repeatEvery);
                    break;
                case this.CALENDAR_INTERVALS.YEAR:
                    nextDate.setFullYear(nextDate.getFullYear() + config.repeatEvery);
                    break;
            }
        }

        return nextDate;
    }

    calculateSensorDate(baseDate, config, isFloating, currentDate, context) {
        if (!context.averageSensorRate || context.averageSensorRate === 0) {
            return null;
        }

        // Calculate days needed to reach trigger value
        const daysToTrigger = config.triggerValue / context.averageSensorRate;
        
        let nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + daysToTrigger);

        // Skip to future if needed (never generate overdue tasks)
        while (nextDate < currentDate) {
            nextDate.setDate(nextDate.getDate() + daysToTrigger);
        }

        // If preventive is off, check if sensor would have reached value
        if (!config.preventive) {
            const daysSinceLastUpdate = (currentDate - context.lastSensorDate) / (1000 * 60 * 60 * 24);
            const projectedValue = context.lastSensorValue + (daysSinceLastUpdate * context.averageSensorRate);
            
            // If we haven't reached the trigger value yet, don't schedule
            if (projectedValue < config.triggerValue) {
                return null;
            }
        }

        return nextDate;
    }

    /**
     * Generate a series of tasks based on parameters
     */
    generateTaskSeries(params, numberOfTasks = 30) {
        const { triggers } = params;
        
        if (triggers.isCoexisting && triggers.calendar && triggers.sensor) {
            // Generate both types independently
            const tasks = [];
            
            // Generate calendar tasks
            const calendarParams = {
                ...params,
                triggers: { ...triggers, sensor: false, isCoexisting: false }
            };
            const calendarTasks = this._generateSingleTypeSeries(calendarParams, numberOfTasks);
            
            // Generate sensor tasks
            const sensorParams = {
                ...params,
                triggers: { ...triggers, calendar: false, isCoexisting: false }
            };
            const sensorTasks = this._generateSingleTypeSeries(sensorParams, numberOfTasks);
            
            // Merge and sort
            tasks.push(...calendarTasks, ...sensorTasks);
            tasks.sort((a, b) => a.dueDate - b.dueDate);
            
            // Renumber
            tasks.forEach((task, index) => {
                task.taskNumber = index + 1;
            });
            
            return tasks.slice(0, numberOfTasks);
        } else {
            // Single type or first-wins logic
            return this._generateSingleTypeSeries(params, numberOfTasks);
        }
    }

    _generateSingleTypeSeries(params, numberOfTasks) {
        const tasks = [];
        let currentParams = { ...params };
        let taskCount = 0;
        
        for (let i = 0; i < numberOfTasks; i++) {
            const result = this.calculateNextTaskDate(currentParams);
            
            if (!result.nextTaskDate) break;
            
            taskCount++;
            tasks.push({
                taskNumber: taskCount,
                dueDate: result.nextTaskDate,
                triggerType: result.triggerType,
                calendarInfo: params.calendarConfig,
                sensorInfo: params.sensorConfig
            });

            // Check if we should generate more tasks
            if (params.triggers.calendar && !params.calendarConfig.isRepeating) {
                break; // One-time calendar task
            }
            
            if (params.triggers.sensor && params.sensorConfig.isOnce) {
                break; // One-time sensor task
            }

            // Update context for next iteration
            currentParams.context = {
                ...currentParams.context,
                lastCompletedTaskDate: result.nextTaskDate
            };
            
            // Update sensor value if sensor triggered
            if (result.triggerType === 'sensor') {
                currentParams.context.lastSensorValue += params.sensorConfig.triggerValue;
            }
        }

        return tasks;
    }

    generateExplanation(params) {
        const parts = [];
        
        parts.push(`Interval Type: ${params.isFloating ? 'Floating' : 'Fixed'}`);
        
        if (params.triggers.calendar && params.triggers.sensor) {
            if (params.triggers.isCoexisting) {
                parts.push('Triggers: Calendar AND Sensor (both run independently)');
            } else {
                parts.push('Triggers: Calendar OR Sensor (first wins)');
            }
        } else if (params.triggers.calendar) {
            parts.push('Trigger: Calendar only');
        } else if (params.triggers.sensor) {
            parts.push('Trigger: Sensor only');
        }
        
        if (params.triggers.calendar) {
            parts.push(`\nCalendar Settings:`);
            if (params.calendarConfig.isRepeating) {
                parts.push(`  - Repeats every ${params.calendarConfig.repeatEvery} ${params.calendarConfig.interval}(s)`);
                parts.push(`  - First task ${params.calendarConfig.scheduleFirstFromInterval ? 'after interval' : 'on start date'}`);
            } else {
                parts.push(`  - One-time task`);
            }
        }
        
        if (params.triggers.sensor) {
            parts.push(`\nSensor Settings:`);
            parts.push(`  - Triggers at ${params.sensorConfig.triggerValue} units`);
            parts.push(`  - ${params.sensorConfig.isOnce ? 'One-time' : 'Recurring'} task`);
            parts.push(`  - Preventive mode: ${params.sensorConfig.preventive ? 'ON' : 'OFF'}`);
        }
        
        return parts.join('\n');
    }
}
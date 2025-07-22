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

        // Get sensor trigger dates using the advanced logic
        const dates = this.getSensorTriggerDates(
            baseDate,
            this.addDays(baseDate, 13 * 30), // 13 months ahead
            {
                lastReadingValue: context.lastSensorValue,
                lastReadingDate: context.lastSensorDate,
                calculatedAverage: context.averageSensorRate,
                lastMaintenanceDate: context.lastCompletedTaskDate,
                lastMaintenanceValue: context.lastMaintenanceValue || 0
            },
            config.triggerValue,
            config.isOnce ? 'Single' : 'Periodic',
            !isFloating // isFixed is opposite of isFloating
        );

        // Return the first date if available
        return dates.length > 0 ? dates[0] : null;
    }

    // Get all sensor dates at once
    calculateAllSensorDates(baseDate, config, isFloating, currentDate, context, numberOfTasks) {
        if (!context.averageSensorRate || context.averageSensorRate === 0) {
            return [];
        }

        // Get sensor trigger dates using the advanced logic
        const dates = this.getSensorTriggerDates(
            baseDate,
            this.addDays(baseDate, 13 * 30), // 13 months ahead
            {
                lastReadingValue: context.lastSensorValue,
                lastReadingDate: context.lastSensorDate,
                calculatedAverage: context.averageSensorRate,
                lastMaintenanceDate: context.lastCompletedTaskDate,
                lastMaintenanceValue: context.lastMaintenanceValue || 0
            },
            config.triggerValue,
            config.isOnce ? 'Single' : 'Periodic',
            !isFloating // isFixed is opposite of isFloating
        );

        // Return up to numberOfTasks dates
        return dates.slice(0, numberOfTasks);
    }

    /**
     * Calculate sensor trigger dates with full logic matching TypeScript implementation
     */
    getSensorTriggerDates(
        startDate,
        endDate,
        sensor,
        triggerValue,
        type,
        isFixed = false,
        currentDate = null
    ) {
        const {
            lastReadingValue,
            lastReadingDate,
            calculatedAverage,
            lastMaintenanceDate,
            lastMaintenanceValue
        } = sensor;

        // Current date (today) - allow override for testing
        const today = currentDate ? new Date(currentDate) : new Date();
        today.setHours(0, 0, 0, 0);

        // Adjust startDate to be the maximum of startDate and today
        const adjustedStartDate = this.maxDate(startDate, today);

        let accumulatedSinceReference;
        let referenceDate;

        // Always use last reading as reference when available
        if (lastReadingDate) {
            accumulatedSinceReference = lastReadingValue ?? 0;
            referenceDate = lastReadingDate;
        } else {
            accumulatedSinceReference = 0;
            referenceDate = adjustedStartDate;
        }

        // Calculate the next trigger accumulated value
        let nextTriggerAccumulated;
        let needsImmediateTask = false;

        if (isFixed) {
            // Fixed mode: always use absolute multiples of triggerValue
            const triggersPassed = Math.floor(accumulatedSinceReference / triggerValue);
            nextTriggerAccumulated = (triggersPassed + 1) * triggerValue;

            // In fixed mode, check if we need immediate task
            if (lastMaintenanceDate && lastMaintenanceValue !== undefined) {
                // Check if we've passed a trigger point since last maintenance
                const lastMaintenanceTrigger = Math.floor(lastMaintenanceValue / triggerValue) * triggerValue;
                needsImmediateTask = accumulatedSinceReference > lastMaintenanceTrigger &&
                    (!lastMaintenanceDate || this.isAfter(adjustedStartDate, lastMaintenanceDate));
            } else {
                // No maintenance, check if we've exceeded any trigger point
                needsImmediateTask = triggersPassed > 0;
            }
        } else if (lastMaintenanceDate && lastMaintenanceValue !== undefined) {
            // Floating mode with maintenance: calculate relative to maintenance baseline
            const valuesSinceMaintenance = accumulatedSinceReference - lastMaintenanceValue;

            // Check if we need immediate task (exceeded maintenance + trigger)
            if (valuesSinceMaintenance >= triggerValue &&
                (!lastMaintenanceDate || this.isAfter(adjustedStartDate, lastMaintenanceDate))) {
                needsImmediateTask = true;
            }

            const maintenanceTriggersPassed = Math.floor(valuesSinceMaintenance / triggerValue);
            nextTriggerAccumulated = (maintenanceTriggersPassed + 1) * triggerValue + lastMaintenanceValue;
        } else {
            // Floating mode without maintenance: use regular calculation
            const triggersPassed = Math.floor(accumulatedSinceReference / triggerValue);
            nextTriggerAccumulated = (triggersPassed + 1) * triggerValue;

            // Check if we've exceeded a trigger without maintenance
            needsImmediateTask = triggersPassed > 0;
        }

        // Initialize array to hold trigger dates
        const triggerDates = [];

        if (needsImmediateTask) {
            // Immediate task needed - schedule for today
            triggerDates.push(adjustedStartDate);

            if (type === 'Single') {
                return triggerDates;
            }
        }

        // Start from reference date for future calculations
        let currentIterDate = referenceDate;
        let currentAccumulatedValue = accumulatedSinceReference;

        // Special handling for floating mode when reading is exactly one trigger past maintenance
        if (needsImmediateTask && !isFixed && lastMaintenanceDate && 
            lastMaintenanceValue !== undefined && lastReadingDate && 
            lastReadingValue !== undefined) {
            const valuesSinceMaintenance = lastReadingValue - lastMaintenanceValue;
            if (valuesSinceMaintenance === triggerValue) {
                // Calculate projected accumulated value at start date
                const daysSinceReading = this.differenceInDays(adjustedStartDate, lastReadingDate);
                const progressionSinceReading = daysSinceReading * calculatedAverage;
                const projectedAccumulated = lastReadingValue + progressionSinceReading;

                // Adjust next trigger to be one full interval from the projected value
                nextTriggerAccumulated = projectedAccumulated + triggerValue;
            }
        }

        while (this.isBefore(currentIterDate, endDate) || this.isSameDay(currentIterDate, endDate)) {
            const unitsToNextTrigger = nextTriggerAccumulated - currentAccumulatedValue;
            const daysToNextTrigger = unitsToNextTrigger / calculatedAverage;

            // If currentAccumulatedValue >= nextTriggerAccumulated, we've passed this trigger
            if (unitsToNextTrigger <= 0) {
                // We've already passed this trigger point
                currentAccumulatedValue = nextTriggerAccumulated;
                nextTriggerAccumulated += triggerValue;
            } else {
                // Calculate the date of the next trigger
                const calculatedTriggerDate = this.addDays(currentIterDate, Math.ceil(daysToNextTrigger));

                // If the calculated date is in the past, schedule for today
                const nextTriggerDate = this.isBefore(calculatedTriggerDate, adjustedStartDate)
                    ? adjustedStartDate
                    : calculatedTriggerDate;

                // If next trigger date is after endDate, break the loop
                if (this.isAfter(nextTriggerDate, endDate)) {
                    // Check if there is anything in triggerDates, if not add the next trigger date
                    if (triggerDates.length === 0) {
                        triggerDates.push(nextTriggerDate);
                    }
                    break;
                }

                // Add the next trigger date to the array if it's not a duplicate
                const lastDate = triggerDates[triggerDates.length - 1];
                if (!lastDate || !this.isSameDay(lastDate, nextTriggerDate)) {
                    triggerDates.push(nextTriggerDate);
                }

                if (type === 'Single') {
                    // Only one trigger date needed
                    break;
                }

                // Update for next iteration
                currentAccumulatedValue = nextTriggerAccumulated;
                currentIterDate = calculatedTriggerDate; // Use calculated date, not adjusted date
                nextTriggerAccumulated += triggerValue;
            }
        }

        if (triggerDates.length === 0) {
            return [];
        }

        // Limit to 13 months from first trigger
        const thirteenMonthsAfterFirstTrigger = this.addDays(triggerDates[0], 13 * 30);

        return triggerDates.filter(date => this.isBefore(date, thirteenMonthsAfterFirstTrigger));
    }

    // Helper date functions
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    maxDate(date1, date2) {
        return date1 > date2 ? date1 : date2;
    }

    isAfter(date1, date2) {
        return date1 > date2;
    }

    isBefore(date1, date2) {
        return date1 < date2;
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    differenceInDays(date1, date2) {
        const diffTime = Math.abs(date1 - date2);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        
        // Special handling for sensor-only tasks - generate all dates at once
        if (params.triggers.sensor && !params.triggers.calendar) {
            const baseDate = this.determineBaseDate(params);
            const sensorDates = this.calculateAllSensorDates(
                baseDate,
                params.sensorConfig,
                params.isFloating,
                params.currentDate || new Date(),
                params.context,
                numberOfTasks
            );
            
            sensorDates.forEach((date, index) => {
                tasks.push({
                    taskNumber: index + 1,
                    dueDate: date,
                    triggerType: 'sensor',
                    calendarInfo: params.calendarConfig,
                    sensorInfo: params.sensorConfig
                });
            });
            
            return tasks;
        }
        
        // Original logic for calendar or mixed triggers
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
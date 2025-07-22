import { SchedulingLogic } from './components/SchedulingLogic.js';
import { SchedulingVisualizer } from './components/SchedulingVisualizer.js';
import { SchedulingControls } from './components/SchedulingControls.js';

export class SchedulingApp {
    constructor() {
        this.schedulingLogic = new SchedulingLogic();
        this.visualizer = new SchedulingVisualizer();
        this.controls = new SchedulingControls(this.schedulingLogic);
        
        this.init();
    }

    init() {
        // Initialize components
        this.visualizer.init();
        this.controls.init(document.getElementById('scheduling-controls'));
        
        // Set up event handlers
        this.controls.setOnChange((settings) => {
            this.updateSchedule(settings);
        });
        
        // Initial update
        this.updateSchedule(this.controls.currentSettings);
    }

    updateSchedule(settings) {
        // Generate task series
        const tasks = this.schedulingLogic.generateTaskSeries(settings, settings.numberOfTasks);
        
        // Update completed task position
        this.visualizer.setCompletedTaskPosition(settings.completedTaskPosition);
        
        // Update visualization
        this.visualizer.updateVisualization(tasks, new Date(), settings.lastTaskCompletedDate);
        
        // Update schedule details
        const detailsContainer = document.getElementById('schedule-details');
        this.visualizer.renderScheduleDetails(tasks, detailsContainer);
        
        // Update logic explanation
        this.updateLogicExplanation(settings, tasks);
    }

    updateLogicExplanation(settings, tasks) {
        const container = document.getElementById('logic-explanation');
        
        // Generate detailed explanation
        let explanation = [];
        
        // Current settings
        explanation.push('=== Current Settings ===');
        explanation.push(`Trigger Type: ${this.formatTriggerType(settings.trigger)}`);
        explanation.push(`Start Point: ${this.schedulingLogic.formatStartPoint(settings.startPoint)}`);
        explanation.push(`Interval Type: ${settings.intervalType === 'fixed' ? 'Fixed' : 'Floating'}`);
        explanation.push(`Recurrence: ${settings.recurrence === 'once' ? 'Once Only' : 'Every Interval'}`);
        
        if (settings.trigger !== this.schedulingLogic.TRIGGER_TYPES.CALENDAR) {
            explanation.push(`\nSensor Settings:`);
            explanation.push(`  - Interval: ${settings.sensorInterval} hours`);
            explanation.push(`  - Current Value: ${settings.currentSensorValue} hours`);
            explanation.push(`  - Average Rate: ${settings.averageSensorRate} hours/day`);
            explanation.push(`  - Preventive Mode: ${settings.preventiveOn ? 'ON' : 'OFF'}`);
        }
        
        if (settings.trigger !== this.schedulingLogic.TRIGGER_TYPES.SENSOR) {
            explanation.push(`\nCalendar Settings:`);
            explanation.push(`  - Interval: ${settings.calendarInterval.value} ${settings.calendarInterval.unit}`);
        }
        
        // Logic explanation
        explanation.push('\n=== Scheduling Logic ===');
        
        if (settings.intervalType === 'fixed') {
            explanation.push('Fixed Interval: Tasks are scheduled at regular intervals from the start point.');
            explanation.push('If a task is completed late, the next task maintains the original schedule.');
        } else {
            explanation.push('Floating Interval: Tasks adjust to actual completion times.');
            explanation.push('If a task is completed late, the next task is scheduled from the completion date.');
        }
        
        if (settings.trigger === this.schedulingLogic.TRIGGER_TYPES.BOTH) {
            explanation.push('\nDual Trigger Mode: Both sensor and calendar triggers are calculated.');
            explanation.push('The task is scheduled for whichever trigger occurs first.');
        }
        
        if (settings.preventiveOn && settings.trigger !== this.schedulingLogic.TRIGGER_TYPES.CALENDAR) {
            explanation.push('\nPreventive Mode ON: Tasks are always scheduled in the future.');
            explanation.push('Even if sensor values haven\'t reached the threshold, a future date is projected.');
        }
        
        // Task generation summary
        if (tasks.length > 0) {
            explanation.push('\n=== Generated Tasks ===');
            const calendarTasks = tasks.filter(t => t.triggerType === 'calendar').length;
            const sensorTasks = tasks.filter(t => t.triggerType === 'sensor').length;
            const overdueTasks = tasks.filter(t => t.dueDate < new Date()).length;
            
            explanation.push(`Total Tasks: ${tasks.length}`);
            if (settings.trigger === this.schedulingLogic.TRIGGER_TYPES.BOTH) {
                explanation.push(`  - Calendar Triggered: ${calendarTasks}`);
                explanation.push(`  - Sensor Triggered: ${sensorTasks}`);
            }
            if (overdueTasks > 0) {
                explanation.push(`  - Overdue: ${overdueTasks}`);
            }
            
            // Next task info
            const futureTasks = tasks.filter(t => t.dueDate >= new Date());
            if (futureTasks.length > 0) {
                const nextTask = futureTasks[0];
                const daysUntilNext = Math.ceil((nextTask.dueDate - new Date()) / (1000 * 60 * 60 * 24));
                explanation.push(`\nNext Task: #${nextTask.taskNumber} in ${daysUntilNext} days (${nextTask.triggerType} triggered)`);
            }
        }
        
        container.textContent = explanation.join('\n');
    }

    formatTriggerType(trigger) {
        const types = {
            [this.schedulingLogic.TRIGGER_TYPES.SENSOR]: 'Sensor Only',
            [this.schedulingLogic.TRIGGER_TYPES.CALENDAR]: 'Calendar Only',
            [this.schedulingLogic.TRIGGER_TYPES.BOTH]: 'Sensor & Calendar (First Wins)'
        };
        return types[trigger] || trigger;
    }
}
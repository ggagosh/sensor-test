import { SchedulingLogic } from './components/SchedulingLogicV2.js';
import { SchedulingVisualizer } from './components/SchedulingVisualizer.js';
import { SchedulingControls } from './components/SchedulingControlsV2.js';

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
        const tasks = this.schedulingLogic.generateTaskSeries(settings, settings.displaySettings.numberOfTasks);
        
        // Update completed task position
        this.visualizer.setCompletedTaskPosition(settings.displaySettings.completedTaskPosition);
        
        // Update visualization
        this.visualizer.updateVisualization(tasks, new Date(), settings.context.lastCompletedTaskDate);
        
        // Update schedule details
        const detailsContainer = document.getElementById('schedule-details');
        this.visualizer.renderScheduleDetails(tasks, detailsContainer);
        
        // Update logic explanation
        this.updateLogicExplanation(settings, tasks);
    }

    updateLogicExplanation(settings, tasks) {
        const container = document.getElementById('logic-explanation');
        
        // Use the new explanation generator
        const explanation = this.schedulingLogic.generateExplanation(settings);
        
        // Add task summary
        let taskSummary = '\n\n=== Generated Tasks ===';
        if (tasks.length > 0) {
            const calendarTasks = tasks.filter(t => t.triggerType === 'calendar').length;
            const sensorTasks = tasks.filter(t => t.triggerType === 'sensor').length;
            
            taskSummary += `\nTotal Tasks: ${tasks.length}`;
            if (calendarTasks > 0) taskSummary += `\n  - Calendar Tasks: ${calendarTasks}`;
            if (sensorTasks > 0) taskSummary += `\n  - Sensor Tasks: ${sensorTasks}`;
            
            // Next task info
            const nextTask = tasks[0];
            if (nextTask) {
                const daysUntilNext = Math.ceil((nextTask.dueDate - new Date()) / (1000 * 60 * 60 * 24));
                taskSummary += `\n\nNext Task: #${nextTask.taskNumber} in ${daysUntilNext} days (${nextTask.triggerType})`;
            }
        } else {
            taskSummary += '\nNo tasks generated';
        }
        
        container.textContent = explanation + taskSummary;
    }
}
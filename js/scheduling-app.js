import { SchedulingLogic } from './components/SchedulingLogicV2.js';
import { SchedulingVisualizer } from './components/SchedulingVisualizer.js';
import { SchedulingControls } from './components/SchedulingControlsV2.js';
import { FeedbackModal } from './components/FeedbackModal.js';

export class SchedulingApp {
    constructor() {
        this.schedulingLogic = new SchedulingLogic();
        this.visualizer = new SchedulingVisualizer();
        this.controls = new SchedulingControls(this.schedulingLogic);
        this.feedbackModal = new FeedbackModal();
        this.currentTasks = [];
        
        this.init();
    }

    init() {
        // Initialize components
        this.visualizer.init();
        this.controls.init(document.getElementById('scheduling-controls'));
        this.feedbackModal.init();
        
        // Set up event handlers
        this.controls.setOnChange((settings, isSimulation) => {
            this.updateSchedule(settings, isSimulation);
        });
        
        // Set up feedback button
        const feedbackButton = document.getElementById('feedback-button');
        if (feedbackButton) {
            feedbackButton.addEventListener('click', () => {
                this.feedbackModal.open();
            });
        }
        
        // Set up feedback submission handler
        this.feedbackModal.setOnSubmit((description) => {
            this.handleFeedbackSubmit(description);
        });
        
        // Initial update
        this.updateSchedule(this.controls.currentSettings);
    }

    updateSchedule(settings, isSimulation = false) {
        // Show updating indicator
        const indicator = document.getElementById('updating-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }
        
        // Use setTimeout to ensure the indicator shows before heavy computation
        setTimeout(() => {
            // Generate task series
            const tasks = this.schedulingLogic.generateTaskSeries(settings, settings.displaySettings.numberOfTasks);
            
            // Store current tasks for feedback export
            this.currentTasks = tasks;
            
            // Update completed task position
            this.visualizer.setCompletedTaskPosition(settings.displaySettings.completedTaskPosition);
            
            // Update visualization
            this.visualizer.updateVisualization(tasks, new Date(), settings.context.lastCompletedTaskDate);
            
            // Update schedule details
            const detailsContainer = document.getElementById('schedule-details');
            this.visualizer.renderScheduleDetails(tasks, detailsContainer);
            
            // Update logic explanation
            this.updateLogicExplanation(settings, tasks, isSimulation);
            
            // Update calculated starting point display
            if (this.schedulingLogic.lastBaseDateInfo) {
                this.controls.updateCalculatedStartingPoint(
                    this.schedulingLogic.lastBaseDateInfo.date,
                    this.schedulingLogic.lastBaseDateInfo.source
                );
            }
            
            // Hide updating indicator
            if (indicator) {
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 100);
            }
        }, 10);
    }

    updateLogicExplanation(settings, tasks, isSimulation) {
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
    
    handleFeedbackSubmit(description) {
        // Collect all data for export
        const feedbackData = {
            timestamp: new Date().toISOString(),
            userFeedback: {
                description: description,
                reportedAt: new Date().toISOString()
            },
            configuration: this.controls.currentSettings,
            generatedTasks: this.currentTasks.map(task => ({
                taskNumber: task.taskNumber,
                dueDate: task.dueDate,
                triggerType: task.triggerType,
                details: task
            })),
            schedulingLogic: {
                baseDateInfo: this.schedulingLogic.lastBaseDateInfo,
                explanation: this.schedulingLogic.generateExplanation(this.controls.currentSettings)
            },
            browserInfo: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                windowSize: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        };
        
        // Create and download the JSON file
        this.downloadFeedback(feedbackData);
    }
    
    downloadFeedback(data) {
        // Create blob from data
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `maintenance-feedback-${timestamp}.json`;
        link.href = url;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Show success message
        alert('Feedback report downloaded successfully! Please share this file with the development team.');
    }
}
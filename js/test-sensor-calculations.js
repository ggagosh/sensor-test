import { SchedulingLogic } from './components/SchedulingLogicV2.js';

// Helper function to format dates
function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

function formatDates(dates) {
    return dates.map(date => formatDate(date));
}

// Create instance
const logic = new SchedulingLogic();

// Test scenarios from TypeScript tests
console.log('Running sensor calculation tests...\n');

// Test 1: Basic Periodic Trigger
console.log('Test 1: Basic Periodic Trigger');
const test1 = logic.getSensorTriggerDates(
    new Date('2024-10-11'),
    new Date('2025-11-30'),
    {
        lastReadingValue: 2990,
        lastReadingDate: new Date('2024-10-11'),
        calculatedAverage: 25,
        lastMaintenanceDate: undefined,
        lastMaintenanceValue: undefined
    },
    3000,
    'Periodic',
    false, // floating mode
    new Date('2024-10-12') // current date for test
);
console.log('Expected: 2024-10-12, 2025-02-09, 2025-06-09, 2025-10-07');
console.log('Actual:  ', formatDates(test1).join(', '));
console.log('---\n');

// Test 2: Fixed Mode with Reading Exceeding Trigger
console.log('Test 2: Fixed Mode - Reading Exceeds Trigger (3700 > 1000)');
const test2 = logic.getSensorTriggerDates(
    new Date('2024-10-15'),
    new Date('2025-12-31'),
    {
        lastReadingValue: 3700,
        lastReadingDate: new Date('2024-10-01'),
        calculatedAverage: 10,
        lastMaintenanceDate: undefined,
        lastMaintenanceValue: undefined
    },
    1000,
    'Periodic',
    true, // fixed mode
    new Date('2024-10-15') // current date for test
);
console.log('Expected: 2024-10-15 (immediate), 2024-10-31, 2025-02-08, 2025-05-19, 2025-08-27');
console.log('Actual:  ', formatDates(test2).join(', '));
console.log('---\n');

// Test 3: Floating Mode with Maintenance
console.log('Test 3: Floating Mode with Maintenance');
const test3 = logic.getSensorTriggerDates(
    new Date('2024-10-15'),
    new Date('2025-12-31'),
    {
        lastReadingValue: 3700,
        lastReadingDate: new Date('2024-10-01'),
        calculatedAverage: 10,
        lastMaintenanceDate: new Date('2024-09-15'),
        lastMaintenanceValue: 1200
    },
    1500,
    'Periodic',
    false, // floating mode
    new Date('2024-10-15') // current date for test
);
console.log('Expected: 2024-10-15 (immediate), 2024-11-20, 2025-04-19, 2025-09-16');
console.log('Actual:  ', formatDates(test3).join(', '));
console.log('---\n');

// Test 4: Single Trigger Type
console.log('Test 4: Single Trigger Type');
const test4 = logic.getSensorTriggerDates(
    new Date('2024-10-12'),
    new Date('2025-01-01'),
    {
        lastReadingValue: 1000,
        lastReadingDate: new Date('2024-10-12'),
        calculatedAverage: 50,
        lastMaintenanceDate: undefined,
        lastMaintenanceValue: undefined
    },
    2000,
    'Single',
    false,
    new Date('2024-10-12') // current date for test
);
console.log('Expected: 2024-11-01');
console.log('Actual:  ', formatDates(test4).join(', '));
console.log('---\n');

// Test 5: Floating mode - exactly at trigger after maintenance
console.log('Test 5: Floating Mode - Exactly at Trigger After Maintenance');
const test5 = logic.getSensorTriggerDates(
    new Date('2025-07-09'),
    new Date('2025-10-01'),
    {
        lastReadingValue: 1200,
        lastReadingDate: new Date('2025-07-03'),
        calculatedAverage: 55.56,
        lastMaintenanceDate: new Date('2025-06-20'),
        lastMaintenanceValue: 700
    },
    500,
    'Periodic',
    false, // floating mode
    new Date('2025-07-09') // current date for test
);

console.log('Expected: 2025-07-09 (immediate), then every 9 days');
console.log('Actual:  ', formatDates(test5).join(', '));
console.log('---\n');

// Test 6: Fixed Mode with Maintenance (should ignore maintenance)
console.log('Test 6: Fixed Mode with Maintenance at 700, Reading at 750');
const test6 = logic.getSensorTriggerDates(
    new Date('2024-10-16'),
    new Date('2025-01-01'),
    {
        lastReadingValue: 750,
        lastReadingDate: new Date('2024-10-11'),
        calculatedAverage: 60,
        lastMaintenanceDate: new Date('2024-10-14'),
        lastMaintenanceValue: 700
    },
    500,
    'Periodic',
    true, // fixed mode
    new Date('2024-10-16') // current date for test
);
console.log('Expected: 2024-10-16 (immediate), 2024-10-25, 2024-11-03, ...');
console.log('Actual:  ', formatDates(test6).slice(0, 5).join(', '), '...');
console.log('---\n');

console.log('Tests completed!');
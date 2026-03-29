function getWeeklyAvailability() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cleanSheet = ss.getSheetByName('clean data');
    const providersSheet = ss.getSheetByName('providers bio');
    const conditionsSheet = ss.getSheetByName('Conditions');

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (!cleanSheet || !providersSheet || !conditionsSheet) {
        console.error("❌ required missing sheets: 'clean data', 'providers bio' or 'Conditions'");
        return;
    }

    
    
    
}
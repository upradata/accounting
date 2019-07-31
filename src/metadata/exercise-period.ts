
export interface ExercisePeriodOption {
    start: Date;
    periodMonth: number;
}

export class ExercisePeriod {
    start: Date;
    end: Date;

    constructor(option: ExercisePeriodOption) {
        const { start, periodMonth = 12 } = option;

        this.start = start;

        const endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + periodMonth);

        this.end = endDate;
    }
}

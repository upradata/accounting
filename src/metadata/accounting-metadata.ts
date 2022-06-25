import { ExercisePeriod, ExercisePeriodOption } from './exercise-period';
import { numberWithLeadingZeros, TODAY } from '@util';

export class MetadataJson {
    siren: number;
    siret: number;
    companyName: string;
    activityId: string;
    exercise: {
        period: number;
        start: {
            month: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
            day: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;
        };
    };
    address: string;
}


export class ComptabiliteMetadataOption<PeriodType> extends MetadataJson {
    exercisePeriod: PeriodType;
}


export class ComptabiliteMetadata extends ComptabiliteMetadataOption<ExercisePeriod> {


    constructor(option: ComptabiliteMetadataOption<ExercisePeriodOption | ExercisePeriod>) {
        super();
        Object.assign(this, option);

        const zeros = numberWithLeadingZeros;

        if (!this.exercisePeriod) {
            const { day, month } = this.exercise.start;
            const startDate = new Date(`${TODAY.date.getFullYear()}-${zeros(month, 2)}-${zeros(day, 2)}`);
            this.exercisePeriod = new ExercisePeriod({ start: startDate, periodMonth: this.exercise.period });
        }

        if (!(this.exercisePeriod instanceof ExercisePeriod))
            this.exercisePeriod = new ExercisePeriod(this.exercisePeriod);
    }

}

import { ExercisePeriod, ExercisePeriodOption } from './exercise-period';

export class ComptabiliteMetadataOption<PeriodType> {
    exercisePeriod: PeriodType;
    siren: number;
    siret: number;
    companyName: string;
    activityId: string;
}

export class ComptabiliteMetadata extends ComptabiliteMetadataOption<ExercisePeriod> {

    constructor(option: ComptabiliteMetadataOption<ExercisePeriodOption | ExercisePeriod>) {
        super();

        for (const [ k, v ] of Object.entries(option))
            this[ k ] = v;

        if (!(option.exercisePeriod instanceof ExercisePeriod))
            this.exercisePeriod = new ExercisePeriod(option.exercisePeriod);
    }

}

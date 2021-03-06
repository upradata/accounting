import { Injector as DiInjector, ProviderToken, Inject, OverrideProvider as DiOverrideProvider } from '@ts-kit/di';

export * from '@ts-kit/di';

// create a new instance of our injector

export interface ValueOverrideProvider<T> {
    provide: ProviderToken<T>;
    useValue: T;
    provideInRoot?: boolean;
}

export type OverrideProvider<T> = DiOverrideProvider<T> | ValueOverrideProvider<T>;

const createSingletonFromOverrideNames = [ 'createSingletonFromOverride', 'createFromOverride' ]; // previous version, current version
const createSingletonFromOverrideName = createSingletonFromOverrideNames.find(k => !!(DiInjector.prototype as any)[ k ]);

if (!createSingletonFromOverrideName) {
    throw new Error(`DiInjector does not contain any method createSingletonFromOverride or similar due to version with a new api. Please, check in @ts-kit/di what is the new method name`);
}

const DiCreateSingletonFromOverride = (DiInjector.prototype as any)[ createSingletonFromOverrideName ];
(DiInjector.prototype as any)[ createSingletonFromOverrideName ] = function <T>(provider: OverrideProvider<T>): T {
    if ('useValue' in provider)
        return provider.useValue;

    return DiCreateSingletonFromOverride(provider);
};


interface InjectorOptions {
    providers?: OverrideProvider<any>[];
    bootstrap?: ProviderToken<any>[];
}


export class Injector {
    static app: DiInjector;

    static init(opts?: InjectorOptions, parent?: DiInjector) {
        Injector.app = new DiInjector(opts as any, parent);
    }
}


export function InjectDep(provider: ProviderToken<any>) {
    if (provider === undefined) {
        throw new Error(`The dependence provider injected is "undefined". It can be caused by a [Circular] reference in your import.`);
    }

    const diInject = Inject(provider as ProviderToken<any>);

    return function (classPrototype: any, _propertyKey: string | symbol, parameterIndex: number) {
        // propertyKey is always undefined because it is not a parameter decorator
        const constructorArgs: string = classPrototype.toString().match(/constructor[^(]*\(([^)]*)\)/)[ 1 ];

        if (!constructorArgs || parameterIndex >= constructorArgs.split(/\W+/).length) {
            const providerName: string = (provider as any).name || String(provider);
            throw new Error(`Argument ${parameterIndex} in ${classPrototype.name}.constructor is missing to inject ${providerName}`);
        }

        const argumentName = constructorArgs.split(/\W+/)[ parameterIndex ];

        // call di @Inject (it is defining the provider dependencies if classPrototype will be instantiated)
        diInject(classPrototype, argumentName, parameterIndex);

        // Injector.app will be instanciated after, so we can call it later
        Object.defineProperty(classPrototype, argumentName, {
            get: () => Injector.app.get(provider as ProviderToken<any>),
            // writable: false,
            configurable: false,
            enumerable: true
        });
        /* } else {
            throw new Error(`Injector could not find symbol ${(provider as any).constructor && (provider as any).constructor.name ||
                provider}`);
        } */
    };
}

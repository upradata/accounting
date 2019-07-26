import { Injector as DiInjector, Provider, Inject, /* InjectorOptions, */ OverrideProvider as DiOverrideProvider } from '@ts-kit/di';

export * from '@ts-kit/di';

// create a new instance of our injector

export interface ValueOverrideProvider<T> {
    provide: Provider<T>;
    useValue: T;
}

export type OverrideProvider<T> = DiOverrideProvider<T> | ValueOverrideProvider<T>;

const DiCreateSingletonFromOverride = (DiInjector.prototype as any).createSingletonFromOverride;
(DiInjector.prototype as any).createSingletonFromOverride = function <T>(provider: OverrideProvider<T>): T {
    if ('useValue' in provider)
        return provider.useValue;

    return DiCreateSingletonFromOverride(provider);
};

interface InjectorOptions {
    providers?: OverrideProvider<any>[];
    bootstrap?: Provider<any>[];
}

export class Injector {
    static app: DiInjector;

    static init(opts?: InjectorOptions, parent?: DiInjector) {
        Injector.app = new DiInjector(opts as any, parent);
    }
}


export interface Constructor {
    new(...args: any[]): any;
}

export function InjectDep(provider: Constructor | string | symbol) {
    const diInject = Inject(provider as Provider<any>);

    return function (classPrototype: any, propertyKey: string | symbol, parameterIndex: number) {
        // propertyKey is always undefined because it is not a parameter decorator
        const constructorArgs: string = classPrototype.toString().match(/constructor[^(]*\(([^)]*)\)/)[ 1 ];

        if (!constructorArgs) {
            const providerName: string = (provider as any).name || String(provider);
            throw new Error(`Argument ${parameterIndex} in ${classPrototype.name}.constructor is missing to inject ${providerName}`);
        }

        const argumentName = constructorArgs.split(/\W+/)[ parameterIndex ];

        // call di @Inject (it is defining the provider dependencies if classPrototype will be instantiated)
        diInject(classPrototype, argumentName, parameterIndex);

        // Injector.app will be instanciated after, so we can call it later
        Object.defineProperty(classPrototype, argumentName, {
            get: () => Injector.app.get(provider as Provider<any>),
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

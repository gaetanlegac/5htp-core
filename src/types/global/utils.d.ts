declare type TObjetDonnees = {[cle: string]: any}

// Rend certaines clés d'un objet obligatoires
declare type With<
    TObject,
    TRequired extends (keyof TObject) | {[key in keyof TObject]?: any},
    TAdditionnal extends {[key: string]: any} = {}
> = (
    Omit<TObject, TRequired extends (keyof TObject) ? TRequired : keyof TRequired> 
    & 
    (TRequired extends (keyof TObject) ? Required<Pick<TObject, TRequired>> : TRequired)
    &
    TAdditionnal
)

declare type ValueOf<T> = T[keyof T];

// Extrait la valeur de retour d'une promise
// https://stackoverflow.com/questions/48011353/how-to-unwrap-type-of-a-promise
declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T

declare type TPagination<TElement> = {
    list: TElement[],
    page: number,
    pages: number,
    total: number
}

// https://stackoverflow.com/questions/39392853/is-there-a-type-for-class-in-typescript-and-does-any-include-it
declare interface ClassType<T> extends Function { new(): T; }

declare type TPagination<T> = {
    docs: Array<T>;
    pages: number;
    total: number;
}

declare type TStats<T> = {
    [time: number]: T
}

/*declare namespace JSX {
    interface IntrinsicElements {
        i: { src: TIcons } & React.HTMLAttributes<HTMLElement>;
    }
}*/

declare type Routes = {
    [path: string]: {
        params: {
            [param: string]: any
        }
    }
}

declare type PrimitiveValue = string | number | boolean;
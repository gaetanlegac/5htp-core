/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Libs
import useContext from '@/client/context';

// Métier
import type Application from '../../app';
import Card, { Props as CardInfos } from './card';
import Button from '../button';

/*----------------------------------
- TYPES: IMPORTATIONS
----------------------------------*/

/*----------------------------------
- TYPES: DECLARATIONS
----------------------------------*/

type TParams = { [cle: string]: unknown }

type ComposantToast = React.FunctionComponent<{ close?: any }> & { data?: object };

type TOptsToast = (CardInfos & { content?: ComponentChild })

type TOnCloseCallback<TReturnType extends any> = (returnedValue: TReturnType) => void

type TToastShortcutArgs = [
    title: TOptsToast["title"], 
    content?: TOptsToast["content"], 
    boutons?: TOptsToast["boutons"],
    options?: TOptsToast,
]

export type TDialogControls = {
    close: TOnCloseCallback<any>,
    then: (cb: TOnCloseCallback<any>) => any
}

type DialogActions = {

    setToasts: ( setter: (old: ComponentChild[]) => ComponentChild[]) => void,

    show: (
        // On utilise une fonction pour pouvoir accéder aux fonctions (close, ...) lors de la déclaration des infos de la toast
        Content: ComposantToast | Promise<{ default: ComposantToast }> | TOptsToast,
        paramsInit?: TParams
    ) => TDialogControls,

    confirm: (title: string, content: string | ComponentChild, defaultBtn: 'Yes'|'No') => TDialogControls,

    loading: (title: string) => TDialogControls,

    info: (...[title, content, boutons, options]: TToastShortcutArgs) => TDialogControls,

    success: (...[title, content, boutons, options]: TToastShortcutArgs) => TDialogControls,

    warning: (...[title, content, boutons, options]: TToastShortcutArgs) => TDialogControls,

    error: (...[title, content, boutons, options]: TToastShortcutArgs) => TDialogControls,
}

/*----------------------------------
- SERVICE CONTEXTE
----------------------------------*/
let idA: number = 0;
export const createDialog = (app: Application, isToast: boolean): DialogActions => {

    const show = <TReturnType extends any = true>(
        // On utilise une fonction pour pouvoir accéder aux fonctions (close, ...) lors de la déclaration des infos de la toast
        Content: ComposantToast | Promise<{ default: ComposantToast }> | TOptsToast,
        paramsInit?: TParams
    ): TDialogControls => {

        let onClose: TOnCloseCallback<TReturnType>;
        const id = idA++;

        const close = (retour: TReturnType) => {

            instance.setToasts(q => q.filter(m => m.id !== id))

            if (onClose !== undefined)
                onClose(retour);

        };

        const promise = new Promise(async (resolve: TOnCloseCallback<TReturnType>) => {
            onClose = resolve

            let render: ComponentChild;
            let propsRendu: CardInfos = {
                ...paramsInit,
                close: close,
                data: {}
            };

            // toast.show({ title: 'supprimer', content: <>...</> })
            if (Content.constructor === Object) {

                const { content, ...propsToast } = Content as TOptsToast;
                render = (
                    <Card {...propsRendu} children={content} {...propsToast} isToast={isToast} />
                )

            // toast.show( import('./modalSupprimer') )
            // toast.show( ToastSupprimer )
            } else {

                let DialogCard;
                if (Content.constructor === Promise) {
                    DialogCard = (await Content).default;
                } else {
                    DialogCard = Content as typeof Card;
                }

                render = (
                    <DialogCard {...propsRendu} isToast={isToast} />
                )

            }

            // Chargeur de données
            /*if (('data' in ComposantCharge) && typeof ComposantCharge.data === 'function') {
     
                propsRendu.data = await ComposantCharge.data(app, paramsInit);
     
                const { fetchersStateA } = initStateAsync(propsRendu.data, {}, false);
     
                await execFetchersState(fetchersStateA);
     
            }*/
            
            if (!isToast)
                render = (
                    <div class="modal">
                        {render}
                    </div>
                )

            render["id"] = id;

            instance.setToasts(q => [...q, render]);
        });

        return {
            close,
            then: (cb) => promise.then(cb)
        }
    };

    const instance: DialogActions = {

        show: show,

        setToasts: undefined as unknown as DialogActions["setToasts"],

        confirm: (title: string, content: string | ComponentChild, defaultBtn: 'Yes'|'No' = 'No') => show<boolean>(({ close }) => (
            <div class="card col">
                <header>
                    <h2>{title}</h2>
                </header>
                {typeof content === 'string' ? <p>{content}</p> : content}
                <footer class="row fill">
                    <Button type={defaultBtn === 'Yes' ? 'primary' : undefined}
                        onClick={() => close(true)}>
                        Yes
                    </Button>
                    <Button type={defaultBtn === 'No' ? 'primary' : undefined}
                        onClick={() => close(false)}>
                        No
                    </Button>
                </footer>
            </div>
        )),

        loading: (title: string) => app.loading  = show({
            title: title,
            type: 'loading'
        }),

        info: (...[title, content, boutons, options]: TToastShortcutArgs) => show({
            title: title,
            type: 'info',
            content: content && <p>{content}</p>,
            boutons,
            ...options
        }),

        success: (...[title, content, boutons, options]: TToastShortcutArgs) => show({
            title: title,
            type: 'success',
            content: content && <p>{content}</p>,
            boutons,
            ...options
        }),

        warning: (...[title, content, boutons, options]: TToastShortcutArgs) => show({
            title: title,
            type: 'warn',
            content: content && <p>{content}</p>,
            boutons,
            ...options
        }),

        error: (...[title, content, boutons, options]: TToastShortcutArgs) => show({
            title: title,
            type: 'error',
            content: content && <p>{content}</p>,
            boutons,
            ...options
        }),
    }

    return instance;
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default () => {

    const app = useContext();

    const [rendered, setRendered] = React.useState<ComponentChild[]>([]);

    if (app.side === 'client')
        app.modal.setToasts = app.toast.setToasts = setRendered;

    React.useEffect(() => {

        console.log('Updated toast list');

        const modals = document.querySelectorAll("#dialog > .modal");
        if (modals.length === 0)
            return;

        // Focus
        const lastToast = modals[ modals.length - 1 ];
        const toFocus = lastToast.querySelector('input, textarea, button.btn.primary, footer > button.btn') || lastToast;
        console.log('Element to focus', toFocus);
        toFocus.focus();

        // Backdrop color
        const header = lastToast.querySelector('header');
        if (!header || !header.className)
            return;

        const headerColor = window.getComputedStyle(header, null).getPropertyValue('background-color');
        if (!headerColor || !headerColor.startsWith('rgb('))
            return;

        const rgbBg = headerColor.substring(4, headerColor.length - 1);
        lastToast.style.background = 'rgba(' + rgbBg + ', .5)';

    });
    
    return rendered.length !== 0 ? (
        <div id="dialog">
            {rendered}
        </div>
    ) : null;

}
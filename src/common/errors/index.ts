/*----------------------------------
- TYPES
----------------------------------*/

export type TListeErreursSaisie<TClesDonnees extends string = string> = {[champ in TClesDonnees]: string[]}

export type TReponseApi = {
    code: number,
    idRapport?: string,
    urlRequete?: string
} & ({ message: string } | { erreursSaisie: TListeErreursSaisie })

type TDetailsErreur = {
    stack?: string,
    idRapport?: string,
    urlRequete?: string,
}

/*----------------------------------
- ERREURS
----------------------------------*/
export abstract class Erreur extends Error {
    
    public static msgDefaut: string;

    public abstract http: number;
    public title: string = "Uh Oh ...";
    public message: string;

    public urlRequete?: string;
    public idRapport?: string;

    // Note: On ne le redéfini pas ici, car déjà présent dans Error
    //      La redéfinition reset la valeur du stacktrace
    //public stack?: string;

    public constructor(message?: string, details?: TDetailsErreur) {

        super(message);

        this.message = message || (this.constructor as typeof Erreur).msgDefaut;

        if (details !== undefined) {
            this.idRapport = details.idRapport;
            this.stack = details.stack;
            this.urlRequete = details.urlRequete;

            if (this.urlRequete !== undefined)
                this.message + '(' + this.urlRequete + ') ' + this.message;
        }

    }

    public json(): TReponseApi {

        return {
            code: this.http,
            message: this.message,
            idRapport: this.idRapport,
            urlRequete: this.urlRequete,
        }
    }

    public toString() {
        return this.message;
    }
}

export class ErreurSaisie extends Erreur {
    public http = 400;
    public title = "Bad Request";
    public static msgDefaut = "Bad Request.";
}

export class ErreurSaisieSchema extends Erreur {

    public http = 400;
    public title = "Bad Request";
    public static msgDefaut = "Bad Request.";

    public erreursSaisie: TListeErreursSaisie;

    private static listeToString(liste: TListeErreursSaisie) {
        let chaines: string[] = []
        for (const champ in liste)
            chaines.push(champ + ': ' + liste[champ].join('. '));
        return chaines.join(' | ');
    }

    public constructor(message: TListeErreursSaisie, details?: TDetailsErreur) {

        super( ErreurSaisieSchema.listeToString(message), details );

        this.erreursSaisie = message;

    }

    public json(): TReponseApi {
        return {
            ...super.json(),
            erreursSaisie: this.erreursSaisie,
        }
    }
}

export class AuthRequise extends Erreur {
    public http = 401;
    public title = "Authentication Required";
    public static msgDefaut = "Please Login to Continue.";
}

export class AccesRefuse extends Erreur {
    public http = 403;
    public title = "Access Denied";
    public static msgDefaut = "You're not allowed to access to this resource.";
}

export class Introuvable extends Erreur {
    public http = 404;
    public title = "Not Found";
    public static msgDefaut = "The resource you asked for was not found.";
}

export class ErreurCritique extends Erreur {

    public http = 500;
    public title = "Technical Error";
    public static msgDefaut = "A technical error has occurred. A notification has just been sent to the admin.";
}

export class NotAvailable extends Erreur {

    // TODO: page erreur pour code 503
    public http = 404;
    public title = "Not Available";
    public static msgDefaut = "Sorry, the service is currently not available.";
}

export class NetworkError extends Error {
    public title = "Network Error";
}


export const instancierViaCode = (
    code: number, 
    message?: string | TListeErreursSaisie, 
    details?: TDetailsErreur
): Erreur => {

    if (typeof message === 'object')
        return new ErreurSaisieSchema(message, details);

    switch (code) {
        case 400: return new ErreurSaisie( message, details);
        case 401: return new AuthRequise( message, details);
        case 403: return new AccesRefuse( message, details);
        case 404: return new Introuvable( message, details);
        default: return new ErreurCritique( message, details);
    }
}
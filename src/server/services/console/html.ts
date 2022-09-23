/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import Ansi2Html from 'ansi-to-html';
import { Logger, ILogObject } from "tslog"
import type { Console } from '.';;

var ansi2Html = new Ansi2Html({
    newline: true,
    // Material theme for Tilix
    // https://github.com/gnunn1/tilix/blob/master/data/schemes/material.json
    fg: '#fff',
    bg: '#000',
    colors: [
        "#252525",
        "#FF5252",
        "#C3D82C",
        "#FFC135",
        "#42A5F5",
        "#D81B60",
        "#00ACC1",
        "#F5F5F5",
        "#708284",
        "#FF5252",
        "#C3D82C",
        "#FFC135",
        "#42A5F5",
        "#D81B60",
        "#00ACC1",
        "#F5F5F5"
    ]
});

/*----------------------------------
- METHOD
----------------------------------*/
export default (log: ILogObject, c: Console) => {

    if (log.logLevel === 'error') {

        // Enrichissement erreurs
        for (const arg of log.argumentsArray) {

            // Chemin complet pour pouvoir l'ouvrir dans un éditeyr via un clic
            if (typeof arg === 'object' && arg.stack !== undefined) for (const stack of arg.stack)
                stack.filePath = stack.fullFilePath;

        }
    }

    // BUG: log.date pas pris encompte, affiche la date actuelle
    //  https://github.com/fullstack-build/tslog/blob/master/src/LoggerWithoutCallSite.ts#L509

    let ansi: string = '';
    const myStd = { write: (message: string) => ansi += message }
    c.logger.printPrettyLog(myStd, log);

    ansi = ansi.replace(/ {2}/g, '&nbsp;');
    ansi = ansi.replace(/\t/g, '&nbsp;'.repeat(8));

    const html = ansi2Html.toHtml(ansi)

    return html;
}
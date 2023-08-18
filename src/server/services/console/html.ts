/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import Ansi2Html from 'ansi-to-html';
import { formatWithOptions } from 'util';
import type { default as Console, TJsonLog } from '.';;

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
export default (log: TJsonLog, c: Console) => {

    // Print metas as ANSI
    const logMetaMarkup = c.logger._prettyFormatLogObjMeta({
        date: log.time,
        logLevelId: c.getLogLevelId( log.level ),
        logLevelName: log.level,
        // We consider that having the path is useless in this case
        path: undefined,
    });

    // Print args as ANSI
    const logArgsAndErrorsMarkup =  c.logger.runtime.prettyFormatLogObj( log.args, c.logger.settings);
    const logErrors = logArgsAndErrorsMarkup.errors;
    const logArgs = logArgsAndErrorsMarkup.args;
    const logErrorsStr = (logErrors.length > 0 && logArgs.length > 0 ? "\n" : "") + logErrors.join("\n");
    c.logger.settings.prettyInspectOptions.colors = c.logger.settings.stylePrettyLogs;
    let ansi = logMetaMarkup + formatWithOptions(c.logger.settings.prettyInspectOptions, ...logArgs) + logErrorsStr;

    // Use HTML spaces
    ansi = ansi.replace(/ {2}/g, '&nbsp;');
    ansi = ansi.replace(/\t/g, '&nbsp;'.repeat(8));
    ansi = ansi.replace(/\n/g, '<br/>');

    // Convert ANSI to HTML
    const html = ansi2Html.toHtml(ansi)

    return html;
}
/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Node
import { serialize } from 'v8';
import { formatWithOptions } from 'util';
import Youch from 'youch';
import forTerminal from 'youch-terminal';

// Npm
import { v4 as uuid } from 'uuid';
import { Logger, IMeta, ILogObj, ISettings } from 'tslog';
import { format as formatSql } from 'sql-formatter';
import highlight from 'cli-highlight';

// Core libs
import type ApplicationContainer from '..';
import context from '@server/context';
import type { ServerBug } from '@common/errors';
import type ServerRequest from '@server/services/router/request';
import { SqlError } from '@server/services/database/debug';

// Specific
import logToHTML from './html';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

type TLogProfile = 'silly' | 'info' | 'warn' | 'error'

export type Config = {
    debug?: boolean,
    bufferLimit: number,
    dev: {
        level: TLogProfile,
    },
    prod: {
        level: TLogProfile
    }
}

export type Hooks = {

}

export type Services = {

}

/*----------------------------------
- TYPES
----------------------------------*/

export type ChannelInfos = {
    channelType: 'cron' | 'master' | 'request' | 'socket',
    channelId?: string,
}

export type TGuestLogs = {
    id: string,
    meet: Date,
    activity: Date,

    device: string,
    ip: string,
    user?: string
}   

export type TRequestLogs = {

    id: string,
    date: Date,

    method: string,
    url: string,
    data: TObjetDonnees,

    ip: string,
    user?: string,
    clientId: string,

    statusCode: number,
    time: number
}

export type TDbQueryLog = ChannelInfos & {
    date: Date, 
    query: string,
    time: number,
}

export type TLogLevel = keyof typeof logLevels

export type TJsonLog = {
    time: Date,
    level: TLogLevel,
    args: unknown[],
    channel: ChannelInfos
}

/*----------------------------------
- CONST
----------------------------------*/

const LogPrefix = '[console]'

const errorMailInterval = (1 * 60 * 60 * 1000); // 1 hour

const logLevels = {
    'log': 0, 
    'info': 3, 
    'warn': 4, 
    'error': 5
} as const

/*----------------------------------
- LOGGER
----------------------------------*/
export default class Console {

    // Services
    public logger!: Logger<ILogObj>;
    // Buffers
    public logs: TJsonLog[] = [];
    // Bug ID => Timestamp latest send
    private sentBugs: {[bugId: string]: number} = {};

    // Old (still useful???)
    /*public clients: TGuestLogs[] = [];
    public requests: TRequestLogs[] = [];
    public sqlQueries: TDbQueryLog[] = [];*/

    /*----------------------------------
    - LIFECYCLE
    ----------------------------------*/
    /*
        WARN: This service should depend on the less services as possible, and be usable ASAP.
            So bug reports can be sent at any state of the app, includoing thre most early
    */
    public constructor( 
        private container: typeof ApplicationContainer, 
        private config: Config,
    ) {

        console.log("Setting up Console shell module.");

        const origLog = console.log

        const Env = container.Environment;

        const envConfig = this.config[ Env.profile === 'prod' ? 'prod' : 'dev' ];
        const minLogLevel = logLevels[ envConfig.level ];

        this.logger = new Logger({
            // Use to improve performance in production
            hideLogPositionForProduction: Env.profile === 'prod',
            type: 'pretty',
            prettyInspectOptions: {
                depth: 2
            },
            overwrite: {
                formatMeta: (meta?: IMeta) => {

                    // Shorten file paths
                    if (meta?.path !== undefined) {
                        meta.path.filePathWithLine = this.shortenFilePath( meta.path.filePathWithLine );
                    }

                    return this.logger._prettyFormatLogObjMeta( meta );
                },
                transportFormatted: (
                    logMetaMarkup: string, 
                    logArgs: unknown[], 
                    logErrors: string[], 
                    settings: ISettings<ILogObj>
                ) => {
                    const logErrorsStr = (logErrors.length > 0 && logArgs.length > 0 ? "\n" : "") + logErrors.join("\n");
                    settings.prettyInspectOptions.colors = settings.stylePrettyLogs;
                    origLog(logMetaMarkup + formatWithOptions(settings.prettyInspectOptions, ...logArgs) + logErrorsStr);
                },
            }
        }); 

        if (console["_wrapped"] !== undefined)
            return;

        for (const logLevel in logLevels) {
            const levelNumber = logLevels[ logLevel ];
            console[ logLevel ] = (...args: any[]) => {

                // Dev mode = no care about performance = rich logging
                if (levelNumber >= minLogLevel)
                    //this.logger[ logLevel ](...args);
                    origLog(...args);
                // Prod mode = minimal logging  

                const channel = this.getChannel();

                this.logs.push({
                    time: new Date,
                    level: logLevel,
                    args,
                    channel
                });
            }
        }
        
        console["_wrapped"] = true;

        setInterval(() => this.clean(), 10000);
    }

    // Avoid to use lifecycle functions
    protected async start() {}
    public async ready() {}
    public async shutdown() {}

    /*----------------------------------
    - LOGS FORMATTING
    ----------------------------------*/

    public shortenFilePath( filepath?: string ) {

        if (filepath === undefined)
            return undefined;

        const projectRoot = this.container.path.root;
        if (filepath.startsWith( projectRoot ))
            filepath = filepath.substring( projectRoot.length )

        const frameworkRoot = '/node_modules/5htp-core/src/';
        if (filepath.startsWith( frameworkRoot ))
            filepath = '@' + filepath.substring( frameworkRoot.length )

        return filepath;

    }
    

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/

    public getLogLevelId( logLevelName: TLogLevel ) {
        return logLevels[ logLevelName ]
    }

    private clean() {

        if (this.config.debug) {
            console.log(
                LogPrefix, 
                `Clean logs buffer. Current size:`, 
                this.logs.length, '/', this.config.bufferLimit,
                'Memory Size:', serialize(this.logs).byteLength
            );
        }

        const bufferOverflow = this.logs.length - this.config.bufferLimit;
        if (bufferOverflow > 0)
            this.logs = this.logs.slice(bufferOverflow);
    }

    public async createBugReport( error: Error, request?: ServerRequest ) {

        // Print error
        this.logger.error(LogPrefix, `Sending bug report for the following error:`, error);
        /*const youchRes = new Youch(error, {});
        const jsonResponse = await youchRes.toJSON()
        console.log( forTerminal(jsonResponse, {
            // Defaults to false
            displayShortPath: false,

            // Defaults to single whitspace
            prefix: ' ',

            // Defaults to false
            hideErrorTitle: false,

            // Defaults to false
            hideMessage: false,

            // Defaults to false
            displayMainFrameOnly: false,

            // Defaults to 3
            framesMaxLimit: 3,
        }) );*/

        const application = this.container.application;
        if (application === undefined) 
            return console.error(LogPrefix, "Can't send bug report because the application is not instanciated");

        // Print the error so it's accessible via logs
        if (error instanceof SqlError)  {
            let printedQuery: string;
            try {
                printedQuery = this.printSql( error.query );
            } catch (error) {
                printedQuery = 'Failed to print query:' + (error || 'unknown error');
            }
            console.error(`Error caused by this query:`, printedQuery);
        }

        if (error.dataForDebugging !== undefined)
            console.error(LogPrefix, `More data about the error:`, error.dataForDebugging);

        // Prevent spamming the mailbox if infinite loop 
        const bugId = ['server', request?.user?.name, undefined, error.message].filter(e => !!e).join('::');
        const lastSending = this.sentBugs[bugId];
        this.sentBugs[bugId] = Date.now();
        const shouldSendReport = lastSending === undefined || lastSending < Date.now() - errorMailInterval;
        if (!shouldSendReport)
            return;

        // Get context
        const now = new Date();
        const hash = uuid();
        const { channelType, channelId } = this.getChannel();

        // On envoi l'email avant l'insertion dans bla bdd
        // Car cette denrière a plus de chances de provoquer une erreur
        const logsHtml = this.printHtml(
            this.logs.filter( e => e.channel.channelId === channelId).slice(-100), 
            true
        );

        const bugReport: ServerBug = {
            // Context
            hash: hash,
            date: now,
            channelType, 
            channelId,
            // User
            user: request?.user?.email,
            ip: request?.ip,
            // Error
            error,
            stacktrace: error.stack || error.message,
            logs: logsHtml
        }

        await application.reportBug( bugReport );
    }

    public getChannel() {
        return context.getStore() || {
            channelType: 'master',
            channelId: undefined
        }
    }

    /*----------------------------------
    - READ
    ----------------------------------*/

    public async getLogs( channelType: ChannelInfos["channelType"], channelId?: string ) {

        const filters: Partial<TDbQueryLog> = { channelType };
        if (channelId !== undefined)
            filters.channelId = channelId;

        const entries: TLog[] = []
        for (const log of this.logs) {

            // Filters
            if (!(log.channelId === channelId && log.channelType === channelType))
                continue;

            // Remove path prefixs
            if (log.filePath !== undefined) {

                const appPrefix = '/webpack:/' + this.app.pkg.name + '/src/';
                const appPrefixIndex = log.filePath.indexOf(appPrefix);
    
                const corePrefix = '/webpack:/' + this.app.pkg.name + '/node_modules/5htp-core/src/';
                const corePrefixIndex = log.filePath.indexOf(corePrefix);
    
                if (appPrefixIndex !== -1)
                    log.filePath = '@/' + log.filePath.substring(appPrefixIndex + appPrefix.length);
                else if (corePrefixIndex !== -1)
                    log.filePath = '@' + log.filePath.substring(corePrefixIndex + corePrefix.length);
            }
        }
        
        return this.printHtml( entries );
    }
 
    public printHtml( logs: TJsonLog[], full: boolean = false ): string {

        let html = logs.map( logEntry => logToHTML( logEntry, this )).join('<br />');

        if (full) {
            const consoleCss = `background: #000; padding: 20px; font-family: 'Fira Mono', 'monospace', 'Monaco'; font-size: 12px; line-height: 20px;color: #aaa;`
            html = '<div style="' + consoleCss + '">' + html + '</div>';
        }

        return html;
    }

    public printSql = (requete: string) => highlight(
        requete,//formatSql(requete, { indent: ' '.repeat(4) }),
        { language: 'sql', ignoreIllegals: true }
    )

}